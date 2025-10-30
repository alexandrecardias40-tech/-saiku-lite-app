import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

export default function KPIs() {
  const { data: kpis, isLoading: kpisLoading } = trpc.budget.getKPIs.useQuery();
  const { data: ugrAnalysis, isLoading: ugrLoading } = trpc.budget.getUGRAnalysis.useQuery();
  const { data: monthlyConsumption, isLoading: monthlyLoading } = trpc.budget.getMonthlyConsumption.useQuery();
  const [selectedMetric, setSelectedMetric] = useState<'execution' | 'balance' | 'monthly'>('execution');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Calcular variações
  const executionTrend = kpis?.percentual_execucao || 0;
  const balanceTrend = kpis?.saldo_a_empenhar || 0;

  // Dados para gráfico de tendência de execução
  const executionTrendData = useMemo(() => {
    if (!monthlyConsumption) return [];
    let cumulativeExecution = 0;
    return (monthlyConsumption || []).map((item: any) => {
      cumulativeExecution += item.Consumo_Mensal || 0;
      const executionPercent = kpis?.total_anual_estimado
        ? (cumulativeExecution / kpis.total_anual_estimado) * 100
        : 0;
      return {
        month: item.Mês,
        execution: executionPercent,
        cumulative: cumulativeExecution,
      };
    });
  }, [monthlyConsumption, kpis]);

  // Dados para gráfico de saldo
  const balanceData = useMemo(() => {
    if (!monthlyConsumption) return [];
    let cumulativeExecution = 0;
    return (monthlyConsumption || []).map((item: any) => {
      cumulativeExecution += item.Consumo_Mensal || 0;
      const balance = (kpis?.total_anual_estimado || 0) - cumulativeExecution;
      return {
        month: item.Mês,
        balance: balance,
        executed: cumulativeExecution,
      };
    });
  }, [monthlyConsumption, kpis]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Indicadores-Chave de Desempenho (KPIs)</h1>
          <p className="text-slate-600 mt-1">Análise detalhada de métricas orçamentárias e de execução</p>
        </div>

        {/* KPI Cards com Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Taxa de Execução */}
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Taxa de Execução</CardTitle>
                <Percent className="w-4 h-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {kpisLoading ? "..." : formatPercent(kpis?.percentual_execucao || 0)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {executionTrend > 50 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-orange-500" />
                )}
                <p className="text-xs text-slate-500">
                  {executionTrend > 50 ? "Execução acima de 50%" : "Execução abaixo de 50%"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Orçamento Total */}
          <Card className="border-t-4 border-t-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Orçamento Total</CardTitle>
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {kpisLoading ? "..." : formatCurrency(kpis?.total_anual_estimado || 0)}
              </div>
              <p className="text-xs text-slate-500 mt-2">Estimado para 2025</p>
            </CardContent>
          </Card>

          {/* Valor Executado */}
          <Card className="border-t-4 border-t-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Valor Executado</CardTitle>
                <DollarSign className="w-4 h-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {kpisLoading ? "..." : formatCurrency(kpis?.total_empenhado || 0)}
              </div>
              <p className="text-xs text-slate-500 mt-2">Já comprometido</p>
            </CardContent>
          </Card>

          {/* Saldo Disponível */}
          <Card className="border-t-4 border-t-amber-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Saldo Disponível</CardTitle>
                <DollarSign className="w-4 h-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {kpisLoading ? "..." : formatCurrency(kpis?.saldo_a_empenhar || 0)}
              </div>
              <p className="text-xs text-slate-500 mt-2">Para empenho</p>
            </CardContent>
          </Card>
        </div>

        {/* Metric Selection Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedMetric('execution')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedMetric === 'execution'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
            }`}
          >
            Taxa de Execução
          </button>
          <button
            onClick={() => setSelectedMetric('balance')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedMetric === 'balance'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
            }`}
          >
            Saldo Disponível
          </button>
          <button
            onClick={() => setSelectedMetric('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedMetric === 'monthly'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
            }`}
          >
            Consumo Mensal
          </button>
        </div>

        {/* Gráfico de Taxa de Execução */}
        {selectedMetric === 'execution' && (
          <Card>
            <CardHeader>
              <CardTitle>Evolução da Taxa de Execução ao Longo do Ano</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="h-80 flex items-center justify-center text-slate-500">Carregando...</div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={executionTrendData}>
                    <defs>
                      <linearGradient id="colorExecution" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: 'Execução (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => formatPercent(value as number)} />
                    <Area
                      type="monotone"
                      dataKey="execution"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorExecution)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Saldo */}
        {selectedMetric === 'balance' && (
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Saldo Disponível</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="h-80 flex items-center justify-center text-slate-500">Carregando...</div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={balanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="balance" fill="#f59e0b" name="Saldo Disponível" />
                    <Bar dataKey="executed" fill="#10b981" name="Executado" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Consumo Mensal */}
        {selectedMetric === 'monthly' && (
          <Card>
            <CardHeader>
              <CardTitle>Consumo Mensal 2025</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="h-80 flex items-center justify-center text-slate-500">Carregando...</div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyConsumption || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="Mês" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Consumo_Mensal"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top UGRs por Execução */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 UGRs por Taxa de Execução</CardTitle>
          </CardHeader>
          <CardContent>
            {ugrLoading ? (
              <div className="text-center py-8 text-slate-500">Carregando...</div>
            ) : (
              <div className="space-y-3">
                {(ugrAnalysis || [])
                  .sort((a: any, b: any) => b.Percentual_Execucao - a.Percentual_Execucao)
                  .slice(0, 10)
                  .map((ugr: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{ugr.UGR}</div>
                        <div className="text-sm text-slate-600">
                          {formatCurrency(ugr.Total_Empenho_RAP)} de {formatCurrency(ugr.Total_Anual_Estimado)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {formatPercent(ugr.Percentual_Execucao)}
                        </div>
                        <div className="w-32 bg-slate-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${Math.min(ugr.Percentual_Execucao, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo de Insights */}
        <Card className="bg-blue-50 border border-blue-200">
          <CardHeader>
            <CardTitle>Insights e Recomendações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="text-blue-600 font-bold flex-shrink-0">📊</div>
                <div>
                  <p className="font-semibold text-slate-900">Taxa de Execução</p>
                  <p className="text-slate-600">
                    {kpis?.percentual_execucao && kpis.percentual_execucao > 50
                      ? "Execução acima de 50%. Mantenha o acompanhamento dos contratos em andamento."
                      : "Execução abaixo de 50%. Considere acelerar o processo de empenho dos contratos."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-green-600 font-bold flex-shrink-0">💰</div>
                <div>
                  <p className="font-semibold text-slate-900">Saldo Disponível</p>
                  <p className="text-slate-600">
                    Ainda há {formatCurrency(kpis?.saldo_a_empenhar || 0)} disponível para empenho em 2025.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-orange-600 font-bold flex-shrink-0">⚠️</div>
                <div>
                  <p className="font-semibold text-slate-900">Monitoramento</p>
                  <p className="text-slate-600">
                    Acompanhe regularmente os contratos a expirar para evitar interrupções nos serviços.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

