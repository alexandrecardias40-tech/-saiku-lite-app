import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";

export default function Comparisons() {
  const { data: ugrAnalysis, isLoading: ugrLoading } = trpc.budget.getUGRAnalysis.useQuery();
  const { data: allData, isLoading: allDataLoading } = trpc.budget.getAllData.useQuery();
  const [selectedUGR, setSelectedUGR] = useState<string | null>(null);

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

  // (Usamos os próprios campos de `ugrAnalysis` para o ComposedChart abaixo)

  // Filtrar dados por UGR selecionada
  const selectedUGRData = selectedUGR
    ? (allData || []).filter((item: any) => item.UGR === selectedUGR)
    : [];

  // Análise de status de contratos
  const contractStatusAnalysis = (allData || []).reduce((acc: any, item: any) => {
    const status = item.Status_Contrato || 'Desconhecido';
    const existing = acc.find((s: any) => s.name === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Comparações e Análises</h1>
          <p className="text-slate-600 mt-1">Análise comparativa de orçamento por UGR e status de contratos</p>
        </div>

        {/* Comparação de Orçamento vs Execução por UGR */}
        <Card>
          <CardHeader>
            <CardTitle>Orçamento vs Execução por UGR</CardTitle>
          </CardHeader>
          <CardContent>
            {ugrLoading ? (
              <div className="h-80 flex items-center justify-center text-slate-500">Carregando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={ugrAnalysis || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="UGR" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="Total_Anual_Estimado" fill="#3b82f6" name="Orçamento" />
                  <Bar dataKey="Total_Empenho_RAP" fill="#10b981" name="Execução" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Composed Chart: Orçamento (barra) vs % Execução (linha) */}
        <Card>
          <CardHeader>
            <CardTitle>Relação Orçamento vs Execução — Comparação</CardTitle>
          </CardHeader>
          <CardContent>
            {ugrLoading ? (
              <div className="h-80 flex items-center justify-center text-slate-500">Carregando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={ugrAnalysis || []} margin={{ top: 20, right: 40, bottom: 60, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="UGR" angle={-45} textAnchor="end" height={80} />
                  {/* Left Y axis: currency (Orçamento) */}
                  <YAxis yAxisId="left" />
                  {/* Right Y axis: percent (Execução) */}
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'Percentual_Execucao') return [`${Number(value).toFixed(2)}%`, 'Execução'];
                      return [formatCurrency(value), name === 'Total_Anual_Estimado' ? 'Orçamento' : name];
                    }}
                  />
                  <Legend verticalAlign="top" />
                  {/* Bars: Orçamento */}
                  <Bar yAxisId="left" dataKey="Total_Anual_Estimado" name="Orçamento" barSize={18} fill="#3b82f6" />
                  {/* Line: Execução % */}
                  <Line yAxisId="right" type="monotone" dataKey="Percentual_Execucao" name="% Execução" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Comparação por UGR */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes por Unidade Gestora (UGR)</CardTitle>
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
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">Orçamento</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">Execução</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900">Taxa</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-900">Contratos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(ugrAnalysis || []).map((ugr: any, idx: number) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedUGR(selectedUGR === ugr.UGR ? null : ugr.UGR)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{ugr.UGR}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(ugr.Total_Anual_Estimado)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(ugr.Total_Empenho_RAP)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${
                            ugr.Percentual_Execucao > 80 ? 'text-green-600' :
                            ugr.Percentual_Execucao > 50 ? 'text-blue-600' :
                            'text-orange-600'
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes da UGR Selecionada */}
        {selectedUGR && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle>Despesas de {selectedUGR}</CardTitle>
            </CardHeader>
            <CardContent>
              {allDataLoading ? (
                <div className="text-center py-8 text-slate-500">Carregando...</div>
              ) : selectedUGRData.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedUGRData.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-200">
                      <div className="font-semibold text-slate-900">{item.Despesa}</div>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-slate-600">
                        <div>
                          <span className="font-medium">Orçamento:</span> {formatCurrency(item.Total_Anual_Estimado || 0)}
                        </div>
                        <div>
                          <span className="font-medium">Execução:</span> {formatCurrency(item.Total_Empenho_RAP || 0)}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {item.Status_Contrato}
                        </div>
                        <div>
                          <span className="font-medium">Contrato:</span> {item.nº_Contrato || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">Nenhuma despesa encontrada para esta UGR</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Análise de Status de Contratos */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status de Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            {allDataLoading ? (
              <div className="text-center py-8 text-slate-500">Carregando...</div>
            ) : (
              <div className="space-y-3">
                {contractStatusAnalysis.map((status: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div>
                      <span className="font-semibold text-slate-900">{status.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(status.value / (allData || []).length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="font-semibold text-slate-900 w-12 text-right">{status.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

