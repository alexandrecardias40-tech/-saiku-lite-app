import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from "recharts";
import { Download, X } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function Home() {
  const { data: kpis } = trpc.budget.getKPIs.useQuery();
  const { data: allData } = trpc.budget.getAllData.useQuery();
  const { data: monthlyData } = trpc.budget.getMonthlyConsumption.useQuery();
  const { data: ugrData } = trpc.budget.getUGRAnalysis.useQuery();
  const { data: expiringContracts } = trpc.budget.getExpiringContracts.useQuery();
  const { data: expiredContracts } = trpc.budget.getExpiredContracts.useQuery();

  const [selectedUOrgs, setSelectedUOrgs] = useState<string[]>([]);
  const splitLabel = useCallback((label: string) => {
    if (!label) return ["Sem nome"];
    const words = label.split(" ");
    const lines: string[] = [];
    let current = "";

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= 18) {
        current = candidate;
        return;
      }
      if (current) {
        lines.push(current);
      }
      current = word;
    });

    if (current) {
      lines.push(current);
    }

    return lines;
  }, []);

  // Get unique UOrgs
  const uniqueUOrgs = useMemo(() => {
    if (!allData) return [];
    const uorgSet = new Set(allData.map((item: any) => item.UGR).filter(Boolean));
    return Array.from(uorgSet).sort();
  }, [allData]);

  // Filter data based on active filters
  const filteredData = useMemo(() => {
    if (!allData) return [];
    return allData.filter((item: any) => {
      if (selectedUOrgs.length > 0 && !selectedUOrgs.includes(item.UGR)) {
        return false;
      }
      return true;
    });
  }, [allData, selectedUOrgs]);

  // Filter UGR data based on selected UOrgs
  const filteredUgrData = useMemo(() => {
    if (selectedUOrgs.length === 0) return ugrData || [];
    return (ugrData || []).filter((item: any) => selectedUOrgs.includes(item.UGR));
  }, [ugrData, selectedUOrgs]);

  const pieData = useMemo(() => {
    const source = (filteredUgrData || []).filter((item: any) => (item.Total_Anual_Estimado || 0) > 0);
    const total = source.reduce((sum: number, item: any) => sum + (item.Total_Anual_Estimado || 0), 0);
    if (!total) {
      return source.map((item: any) => ({
        ...item,
        displayName: item.UGR,
        percentValue: 0,
      }));
    }
    return source.map((item: any) => {
      const value = item.Total_Anual_Estimado || 0;
      const percent = (value / total) * 100;
      return {
        ...item,
        displayName: item.UGR,
        percentValue: percent,
      };
    });
  }, [filteredUgrData]);
  const renderPieLabel = useCallback((props: PieLabelRenderProps) => {
    if (!pieData || pieData.length === 0) return null;
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, index = 0 } = props;
    const entry = pieData[index];
    if (!entry) return null;

    const RAD = Math.PI / 180;
    const labelRadius = outerRadius + 42;
    const x = cx + labelRadius * Math.cos(-midAngle * RAD);
    const y = cy + labelRadius * Math.sin(-midAngle * RAD);
    const textAnchor = x > cx ? "start" : "end";

    const labelLines = splitLabel(entry.displayName || entry.UGR || `UGR ${index + 1}`);
    const percentValue = entry.percentValue ?? 0;
    const formattedPercent = `${percentValue.toFixed(percentValue >= 10 ? 0 : 1)}%`;

    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fill="#334155"
        fontSize="9px"
        fontWeight={500}
      >
        {labelLines.map((line, lineIndex) => (
          <tspan key={`label-line-${lineIndex}`} x={x} dy={lineIndex === 0 ? "0" : "1.1em"}>
            {line}
          </tspan>
        ))}
        <tspan x={x} dy="1.1em" fill="#0f172a" fontSize="8px" fontWeight={600}>
          {formattedPercent}
        </tspan>
      </text>
    );
  }, [pieData, splitLabel]);

  // Filter monthly data based on selected UOrgs
  const filteredMonthlyData = useMemo(() => {
    if (!monthlyData || selectedUOrgs.length === 0) return monthlyData || [];
    
    return (monthlyData || []).map((month: any) => {
      const filteredConsumption = filteredData.reduce((sum: number, item: any) => {
        const monthKey = `${month.Mês} 00:00:00`;
        return sum + (item[monthKey] || 0);
      }, 0);
      return {
        ...month,
        Consumo_Mensal: filteredConsumption,
      };
    });
  }, [monthlyData, filteredData, selectedUOrgs]);

  // Calculate totals from filtered data
  const totals = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        valor_contrato: 0,
        media_mensal: 0,
        total_estimado: 0,
        saldo_empenhos_2025: 0,
        saldo_empenhos_rap: 0,
        total_rap_empenho: 0,
        total_necessario: 0,
      };
    }

    const valor_contrato = filteredData.reduce((sum: number, item: any) => sum + (item.Valor_Mensal_Medio_Contrato || 0), 0);
    const media_mensal = valor_contrato / filteredData.length;
    const total_estimado = filteredData.reduce((sum: number, item: any) => sum + (item.Total_Anual_Estimado || 0), 0);
    const saldo_empenhos_2025 = filteredData.reduce((sum: number, item: any) => sum + (item.Saldo_Empenhos_2025 || 0), 0);
    const saldo_empenhos_rap = filteredData.reduce((sum: number, item: any) => sum + (item.Saldo_Empenhos_RAP || 0), 0);
    const total_rap_empenho = saldo_empenhos_2025 + saldo_empenhos_rap;
    const total_necessario = filteredData.reduce((sum: number, item: any) => sum + (item.Total_Necessario || 0), 0);

    return {
      valor_contrato,
      media_mensal,
      total_estimado,
      saldo_empenhos_2025,
      saldo_empenhos_rap,
      total_rap_empenho,
      total_necessario,
    };
  }, [filteredData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };


  const handleDownload = () => {
    const csvContent = [
      ["Dashboard Orçamentário UnB - Relatório"],
      ["Data de Geração", new Date().toLocaleDateString("pt-BR")],
      [],
      ["RESUMO EXECUTIVO"],
      ["Métrica", "Valor"],
      ["Valor Contrato", formatCurrency(totals.valor_contrato)],
      ["Média Mensal", formatCurrency(totals.media_mensal)],
      ["Total Estimado", formatCurrency(totals.total_estimado)],
      ["Saldo 2025", formatCurrency(totals.saldo_empenhos_2025)],
      ["Saldo RAP", formatCurrency(totals.saldo_empenhos_rap)],
      ["Total RAP+Empenho", formatCurrency(totals.total_rap_empenho)],
      ["Total Necessário", formatCurrency(totals.total_necessario)],
      [],
      ["CONTRATOS"],
      ["Descrição", "UGR", "Valor Anual", "Empenho RAP", "Status"],
      ...filteredData.map((item: any) => [
        item.Despesa,
        item.UGR,
        formatCurrency(item.Total_Anual_Estimado || 0),
        formatCurrency(item.Total_Empenho_RAP || 0),
        item.Data_Vigencia_Fim && new Date(item.Data_Vigencia_Fim) < new Date() ? "Expirado" : "Ativo",
      ]),
    ]
      .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-unb-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const KPICard = ({ title, value }: { title: string; value: string }) => (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardContent className="p-3">
        <p className="text-xs font-medium text-slate-600">{title}</p>
        <p className="text-sm font-bold text-slate-900 mt-1 truncate">{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header com Download */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard Orçamentário UnB</h1>
            <p className="text-slate-600 mt-1">Análise de despesas e execução orçamentária - 2025</p>
          </div>
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        {/* Filtros Melhorados */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* UOrgs Select */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Unidades Organizacionais (UOrg)
              </label>
              <select
                value={selectedUOrgs[0] || ""}
                onChange={(e) => setSelectedUOrgs(e.target.value ? [e.target.value] : [])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Selecione uma UOrg...</option>
                {(uniqueUOrgs as string[]).map((uorg: string) => (
                  <option key={uorg} value={uorg}>
                    {uorg}
                  </option>
                ))}
              </select>
            </div>

            {/* Info e Botão Limpar */}
            {selectedUOrgs.length > 0 && (
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <Button
                  onClick={() => {
                    setSelectedUOrgs([]);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar Seleção
                </Button>
                <span className="text-xs text-slate-600 self-center">
                  {filteredData.length} contrato(s) na UOrg selecionada
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPIs Grid - Estilo Detalhado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Valor Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.valor_contrato)}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Média Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.media_mensal)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Total Estimado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.total_estimado)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Saldo 2025</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.saldo_empenhos_2025)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-pink-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Saldo RAP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.saldo_empenhos_rap)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Total RAP+Empenho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.total_rap_empenho)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Total Necessário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.total_necessario)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Stack */}
        <div className="space-y-6">
          {/* Consumo Mensal */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Consumo Mensal 2025</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredMonthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="Mês"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    width={100}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Consumo_Mensal"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por UGR - Pizza Melhorada */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Distribuição por UGR</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="Total_Anual_Estimado"
                    nameKey="displayName"
                    cx="50%"
                    cy="52%"
                    outerRadius={158}
                    innerRadius={88}
                    paddingAngle={2}
                    label={renderPieLabel}
                    labelLine={{
                      strokeWidth: 0.6,
                      stroke: '#94a3b8',
                      type: 'linear',
                      length: 20,
                      length2: 8,
                    }}
                    onClick={(entry: any) => window.location.href = `/ugr-details?ugr=${encodeURIComponent(entry.UGR)}`}
                  >
                    {(pieData || []).map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length] as string}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    labelFormatter={(label: string) => `UGR: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
        </div>

        {/* Taxa de Execução por UGR */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Taxa de Execução por UGR</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={filteredUgrData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="UGR"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{ 
                    value: "Percentual de Execução (%)", 
                    angle: -90, 
                    position: "insideLeft",
                    offset: 10,
                    style: { fontSize: '14px' }
                  }}
                />
                <Tooltip 
                  formatter={(value: any) => `${value.toFixed(2)}%`}
                  contentStyle={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
                />
                <Bar
                  dataKey="Percentual_Execucao"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  onClick={(entry: any) => window.location.href = `/ugr-details?ugr=${encodeURIComponent(entry.UGR)}`}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
