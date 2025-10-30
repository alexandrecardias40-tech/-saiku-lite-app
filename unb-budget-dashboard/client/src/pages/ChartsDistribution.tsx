import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];

export default function ChartsDistribution() {
  const { data: ugrAnalysis, isLoading: ugrLoading } = trpc.budget.getUGRAnalysis.useQuery();
  const { data: allData } = trpc.budget.getAllData.useQuery();
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'radar'>('pie');
  const filteredUgrData = ugrAnalysis || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const renderChart = () => {
    if (ugrLoading) {
      return <div className="h-96 flex items-center justify-center text-slate-500">Carregando...</div>;
    }

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={600}>
            <PieChart margin={{ top: 40, right: 200, bottom: 40, left: 200 }}>
            <Pie
              data={filteredUgrData}
              dataKey="Total_Anual_Estimado"
              nameKey="UGR"
              cx="50%"
              cy="50%"
                outerRadius={160}
                innerRadius={90}
              paddingAngle={4}
              label={({
                cx,
                cy,
                midAngle,
                innerRadius,
                outerRadius,
                percent,
                index,
                name
              }) => {
                const RADIAN = Math.PI / 180;
                // Aumenta a distância dos labels do centro do gráfico
                  const radius = outerRadius * 1.4;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                
                // Ajusta o texto para ser mais compacto
                  const shortName = name.length > 20 ? `${name.substring(0, 17)}...` : name;
                const percentText = `${(percent * 100).toFixed(0)}%`;
                
                return (
                  <text
                    x={x}
                    y={y}
                    fill="#475569"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    style={{ fontSize: '11px', fontWeight: 500 }}
                  >
                    {`${shortName} (${percentText})`}
                  </text>
                );
              }}
              labelLine={{
                stroke: "#94a3b8",
                strokeWidth: 0.75,
                type: "polyline"
              }}
            >
              {filteredUgrData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={{ 
                backgroundColor: "#ffffff", 
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "8px 12px"
              }}
            />
            {/* Legend removed for pie chart: only slice labels are shown */}
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      const sortedData = [...filteredUgrData].sort((a: any, b: any) => b.Total_Anual_Estimado - a.Total_Anual_Estimado);
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="UGR" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Legend />
            <Bar dataKey="Total_Anual_Estimado" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Orçamento Total" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={filteredUgrData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="UGR" />
          <PolarRadiusAxis />
          <Radar name="Orçamento" dataKey="Total_Anual_Estimado" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
          <Tooltip formatter={(value) => formatCurrency(value as number)} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Distribuição por UGR</h1>
          <p className="text-slate-600 mt-1">Análise da distribuição orçamentária entre as unidades gestoras</p>
        </div>



        {/* Chart Type Selector */}
        <div className="flex gap-2 flex-wrap">
          {(['pie', 'bar', 'radar'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                chartType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
              }`}
            >
              {type === 'pie' ? 'Pizza' : type === 'bar' ? 'Barras' : 'Radar'}
            </button>
          ))}
        </div>

        {/* Main Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Distribuição de Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            {renderChart()}
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Detalhes por UGR</CardTitle>
          </CardHeader>
          <CardContent>
            {ugrLoading ? (
              <div className="text-center py-8 text-slate-500">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">UGR</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">Orçamento Total</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">% do Total</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">Já Executado</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">% Execução</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-900">Contratos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUgrData
                      .sort((a: any, b: any) => b.Total_Anual_Estimado - a.Total_Anual_Estimado)
                      .map((ugr: any, idx: number) => {
                        const totalBudget = filteredUgrData.reduce((sum: number, u: any) => sum + u.Total_Anual_Estimado, 0);
                        const percentOfTotal = (ugr.Total_Anual_Estimado / totalBudget) * 100;
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">{ugr.UGR}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(ugr.Total_Anual_Estimado)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-blue-600">{formatPercent(percentOfTotal)}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(ugr.Total_Empenho_RAP)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-semibold ${
                                ugr.Percentual_Execucao > 50 ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {formatPercent(ugr.Percentual_Execucao)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block bg-slate-200 text-slate-900 rounded-full px-3 py-1 text-xs font-semibold">
                                {ugr.Contratos_Ativos + ugr.Contratos_Expirados}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 UGRs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 por Orçamento */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Top 5 - Maior Orçamento</CardTitle>
            </CardHeader>
            <CardContent>
              {ugrLoading ? (
                <div className="text-center py-8 text-slate-500">Carregando...</div>
              ) : (
                <div className="space-y-3">
                  {filteredUgrData
                    .sort((a: any, b: any) => b.Total_Anual_Estimado - a.Total_Anual_Estimado)
                    .slice(0, 5)
                    .map((ugr: any, idx: number) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-900">{idx + 1}. {ugr.UGR}</div>
                          <div className="text-right">
                            <div className="font-bold text-blue-600">{formatCurrency(ugr.Total_Anual_Estimado)}</div>
                            <div className="text-xs text-slate-600">Orçamento</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 5 por Execução */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Top 5 - Maior Execução %</CardTitle>
            </CardHeader>
            <CardContent>
              {ugrLoading ? (
                <div className="text-center py-8 text-slate-500">Carregando...</div>
              ) : (
                <div className="space-y-3">
                  {filteredUgrData
                    .sort((a: any, b: any) => b.Percentual_Execucao - a.Percentual_Execucao)
                    .slice(0, 5)
                    .map((ugr: any, idx: number) => (
                      <div key={idx} className="p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-900">{idx + 1}. {ugr.UGR}</div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{formatPercent(ugr.Percentual_Execucao)}</div>
                            <div className="text-xs text-slate-600">Execução</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}