import fs from 'fs';
import path from 'path';
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import dayjs from 'dayjs';

const MONTH_KEY_REGEX = /^\d{4}-\d{2}-\d{2}/;

const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const sumMonthValues = (row: Record<string, unknown>): number => {
  return Object.entries(row).reduce((sum, [key, value]) => {
    if (!MONTH_KEY_REGEX.test(key)) return sum;
    return sum + toNumber(value);
  }, 0);
};

const normalizeRow = (row: Record<string, any>) => {
  const totalEstimado = toNumber(row.Total_Anual_Estimado);
  const executadoInformado = toNumber(row.Executado_Total);
  const empenhoRap = toNumber(row.Total_Empenho_RAP);
  const saldo25 = toNumber(row.Saldo_Empenhos_2025);
  const saldoRap = toNumber(row.Saldo_Empenhos_RAP);
  const meses = sumMonthValues(row);

  const comprometido = empenhoRap || saldo25 + saldoRap;
  const executado =
    executadoInformado ||
    meses ||
    comprometido;

  const taxaExecucao =
    totalEstimado > 0 ? (executado / totalEstimado) * 100 : 0;

  return {
    ...row,
    Total_Anual_Estimado: totalEstimado,
    Total_Empenho_RAP: comprometido,
    Executado_Total: executado,
    Taxa_Execucao: taxaExecucao,
  };
};

type UgrAccumulator = {
  UGR: string;
  Total_Anual_Estimado: number;
  Total_Empenho_RAP: number;
  Executado_Total: number;
  Comprometido_Total: number;
  Contratos_Ativos: number;
  Contratos_Expirados: number;
  Percentual_Execucao: number;
};

const buildUgrAnalysis = (rows: Array<Record<string, any>>): UgrAccumulator[] => {
  const map = new Map<string, UgrAccumulator>();
  const today = dayjs();

  rows.forEach((row) => {
    const ugrKey = (row.UGR || 'Não informado') as string;
    const stats =
      map.get(ugrKey) ||
      {
        UGR: ugrKey,
        Total_Anual_Estimado: 0,
        Total_Empenho_RAP: 0,
        Executado_Total: 0,
        Comprometido_Total: 0,
        Contratos_Ativos: 0,
        Contratos_Expirados: 0,
        Percentual_Execucao: 0,
      };

    const totalEstimado = toNumber(row.Total_Anual_Estimado);
    const executado = toNumber(row.Executado_Total);
    const rap = toNumber(row.Total_Empenho_RAP);
    const saldo = toNumber(row.Saldo_Empenhos_2025) + toNumber(row.Saldo_Empenhos_RAP);
    const comprometido = rap > 0 ? rap : saldo;
    const status = String(row.Status_Contrato || '').toUpperCase();
    const vigencia = row.Data_Vigencia_Fim ? dayjs(row.Data_Vigencia_Fim) : null;

    stats.Total_Anual_Estimado += totalEstimado;
    stats.Executado_Total += executado;
    stats.Total_Empenho_RAP += comprometido;
    stats.Comprometido_Total += comprometido;

    const isExpired =
      (vigencia && vigencia.isBefore(today)) ||
      (status.includes('VENC') && !status.includes('VENCENDO'));
    if (isExpired) {
      stats.Contratos_Expirados += 1;
    } else {
      stats.Contratos_Ativos += 1;
    }

    map.set(ugrKey, stats);
  });

  return Array.from(map.values()).map((stats) => ({
    ...stats,
    Percentual_Execucao:
      stats.Total_Anual_Estimado > 0
        ? (stats.Executado_Total / stats.Total_Anual_Estimado) * 100
        : 0,
  }));
};

const buildKpis = (rows: Array<Record<string, any>>) => {
  const totalEstimado = rows.reduce((sum, row) => sum + toNumber(row.Total_Anual_Estimado), 0);
  const executado = rows.reduce((sum, row) => sum + toNumber(row.Executado_Total), 0);
  const comprometido = rows.reduce((sum, row) => {
    const rap = toNumber(row.Total_Empenho_RAP);
    const saldo = toNumber(row.Saldo_Empenhos_2025) + toNumber(row.Saldo_Empenhos_RAP);
    return sum + (rap > 0 ? rap : saldo);
  }, 0);
  const saldo = Math.max(totalEstimado - executado, 0);
  const percentual = totalEstimado > 0 ? (executado / totalEstimado) * 100 : 0;

  const today = dayjs();
  let expiring = 0;
  let expired = 0;
  rows.forEach((row) => {
    const vigencia = row.Data_Vigencia_Fim ? dayjs(row.Data_Vigencia_Fim) : null;
    const status = String(row.Status_Contrato || '').toUpperCase();
    if (vigencia) {
      const diff = vigencia.diff(today, 'day');
      if (diff >= 0 && diff <= 60) {
        expiring += 1;
      } else if (diff < 0) {
        expired += 1;
      }
    } else if (status.includes('VENC') && !status.includes('VENCENDO')) {
      expired += 1;
    }
  });

  return {
    total_anual_estimado: totalEstimado,
    total_empenhado: executado,
    total_comprometido: comprometido,
    saldo_a_empenhar: saldo,
    percentual_execucao: percentual,
    taxa_execucao: percentual,
    count_expiring_contracts: expiring,
    count_expired_contracts: expired,
  };
};

const normalizeToken = (value: unknown): string => {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return '';
  if (text === 'nan' || text === 'none' || text === 'null') return '';
  return text;
};

const shouldDiscardRow = (row: Record<string, any>): boolean => {
  const description = normalizeToken(row.Despesa || row.descricao);
  const ugr = normalizeToken(row.UGR || row.ugr);
  const pi = normalizeToken(row.PI_2025 || row.pi);

  if (!description) {
    return false;
  }
  if (description === 'total' || description === 'total geral') {
    return true;
  }
  if (description.startsWith('total da') || description.startsWith('total de')) {
    return true;
  }
  if (description.startsWith('total ') && !ugr) {
    return true;
  }
  if (!description && !ugr && !pi) {
    return true;
  }
  return false;
};

const normalizeDashboardData = (payload: any) => {
  const sourceRows = Array.isArray(payload.raw_data_for_filters)
    ? payload.raw_data_for_filters
    : [];

  const filteredRows = sourceRows.filter((row) => !shouldDiscardRow(row));
  const rows = filteredRows.map(normalizeRow);

  const ugrAnalysis = buildUgrAnalysis(rows);

  const computedKpis = buildKpis(rows);

  return {
    ...payload,
    raw_data_for_filters: rows,
    ugr_analysis: ugrAnalysis,
    kpis: {
      ...payload.kpis,
      ...computedKpis,
    },
  };
};

// Load dashboard data once
let dashboardData: any = null;
let dashboardDataMtime = 0;

function loadDashboardData() {
  try {
    const dataPath = path.join(process.cwd(), 'dashboard_data.json');
    const stats = fs.statSync(dataPath);
    const mtime = stats.mtimeMs;

    if (!dashboardData || dashboardDataMtime !== mtime) {
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      const payload = JSON.parse(fileContent);
      dashboardData = normalizeDashboardData(payload);
      dashboardDataMtime = mtime;
    }

    return dashboardData;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return {
      kpis: {
        total_anual_estimado: 0,
        total_empenhado: 0,
        saldo_a_empenhar: 0,
        percentual_execucao: 0,
        count_expiring_contracts: 0,
        count_expired_contracts: 0,
      },
      ugr_analysis: [],
      monthly_consumption: [],
      expiring_contracts_list: [],
      expired_contracts_list: [],
      raw_data_for_filters: [],
    };
  }
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  budget: router({
    getKPIs: publicProcedure.query(async () => {
      const data = loadDashboardData();
      return data.kpis;
    }),

    getUGRAnalysis: publicProcedure.query(async () => {
      const data = loadDashboardData();
      return data.ugr_analysis || [];
    }),

    getMonthlyConsumption: publicProcedure.query(async () => {
      const data = loadDashboardData();
      return data.monthly_consumption || [];
    }),

    getExpiringContracts: publicProcedure.query(async () => {
      const data = loadDashboardData();
      return data.expiring_contracts_list || [];
    }),

    getExpiredContracts: publicProcedure.query(async () => {
      const data = loadDashboardData();
      return data.expired_contracts_list || [];
    }),

    getAllData: publicProcedure.query(async () => {
      const data = loadDashboardData();
      return data.raw_data_for_filters || [];
    }),

    uploadFile: publicProcedure.mutation(async () => {
      try {
        dashboardData = null;
        return {
          success: true,
          message: 'Arquivo processado com sucesso!',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Erro ao processar arquivo',
        };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
