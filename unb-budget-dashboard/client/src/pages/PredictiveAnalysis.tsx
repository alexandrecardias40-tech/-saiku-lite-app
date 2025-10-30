import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Prediction {
  month: string;
  actual: number;
  predicted: number;
  confidence: number;
  margin: number;
}

interface UGRPrediction {
  ugr: string;
  currentSpend: number;
  predictedQ4: number;
  variance: number;
  confidence: number;
}

export default function PredictiveAnalysis() {
  const { data: monthlyData } = trpc.budget.getMonthlyConsumption.useQuery();
  const { data: ugrData } = trpc.budget.getUGRAnalysis.useQuery();
  const { data: allData } = trpc.budget.getAllData.useQuery();
  const [selectedUGR, setSelectedUGR] = useState<string | null>(null);

  // Função para calcular previsões usando regressão linear
  const calculatePredictions = (data: any[]) => {
    if (!data || data.length < 3) return [];

    const months = data.map((d, i) => i);
    const values = data.map((d) => d.Consumo_Mensal || 0);

    // Regressão linear
    const n = months.length;
    const sumX = months.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = months.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = months.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcular R² para confiança
    const yMean = sumY / n;
    const ssRes = values.reduce((sum, y, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const r2 = 1 - ssRes / ssTot;
    const confidence = Math.max(0, Math.min(100, r2 * 100));

    // Calcular margem de erro (desvio padrão)
    const residuals = values.map((y, i) => {
      const predicted = intercept + slope * i;
      return y - predicted;
    });
    const variance = residuals.reduce((sum, r) => sum + r * r, 0) / n;
    const stdDev = Math.sqrt(variance);
    const margin = (stdDev / yMean) * 100;

    // Gerar previsões para próximos 3 meses
    const predictions: Prediction[] = [];
    const nextMonths = ["Nov", "Dez", "Jan"];

    for (let i = 0; i < 3; i++) {
      const monthIndex = n + i;
      const predicted = Math.max(0, intercept + slope * monthIndex);
      predictions.push({
        month: nextMonths[i],
        actual: 0,
        predicted,
        confidence,
        margin,
      });
    }

    return predictions;
  };

  // Previsões gerais
  const generalPredictions = useMemo(() => {
    if (!monthlyData) return [];
    
    const historicalData = monthlyData.slice(0, 10); // Jan-Oct
    const predictions = calculatePredictions(historicalData);
    
    // Combinar dados históricos com previsões
    const combined = [
      ...historicalData.map((d: any) => ({
        month: d.Mês,
        actual: d.Consumo_Mensal,
        predicted: d.Consumo_Mensal,
        type: "historical",
      })),
      ...predictions.map((p) => ({
        month: p.month,
        actual: null,
        predicted: p.predicted,
        type: "predicted",
      })),
    ];

    return combined;
  }, [monthlyData]);

  // Previsões por UGR
  const ugrPredictions = useMemo(() => {
    if (!allData || !ugrData) return [];

    return (ugrData || []).map((ugr: any) => {
      const ugrContracts = allData.filter((item: any) => item.UGR === ugr.UGR);
      
      // Calcular consumo mensal por UGR
      const monthlyUGR = Array.from({ length: 10 }, (_, i) => {
        const month = String(i + 1).padStart(2, "0");
        const monthKey = `2025-${month}-01 00:00:00`;
        return ugrContracts.reduce((sum: number, contract: any) => {
          return sum + (contract[monthKey] || 0);
        }, 0);
      });

      const predictions = calculatePredictions(
        monthlyUGR.map((value, i) => ({
          Mês: `${i + 1}`,
          Consumo_Mensal: value,
        }))
      );

      const q4Predicted = predictions.reduce((sum, p) => sum + p.predicted, 0);
      const currentYTD = monthlyUGR.reduce((a, b) => a + b, 0);
      const variance = ((q4Predicted - (currentYTD / 10) * 3) / (currentYTD / 10) / 3) * 100;

      return {
        ugr: ugr.UGR,
        currentSpend: currentYTD,
        predictedQ4: q4Predicted,
        variance,
        confidence: predictions[0]?.confidence || 0,
      };
    });
  }, [allData, ugrData]);

  // Filtrar UGR selecionada
  const selectedUGRPrediction = selectedUGR
    ? ugrPredictions.find((p: UGRPrediction) => p.ugr === selectedUGR)
    : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calcular totais
  const totalCurrentYTD = ugrPredictions.reduce((sum: number, p: UGRPrediction) => sum + p.currentSpend, 0);
  const totalPredictedQ4 = ugrPredictions.reduce((sum: number, p: UGRPrediction) => sum + p.predictedQ4, 0);
  const avgConfidence =
    ugrPredictions.length > 0
      ? ugrPredictions.reduce((sum: number, p: UGRPrediction) => sum + p.confidence, 0) / ugrPredictions.length
      : 0;

  const confidenceColor =
    avgConfidence > 80 ? "text-green-600" : avgConfidence > 60 ? "text-yellow-600" : "text-red-600";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Análise Preditiva</h1>
          <p className="text-slate-600 mt-1">Previsão de despesas para o próximo trimestre (Q4)</p>
        </div>

        {/* KPIs de Previsão */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">YTD Atual (Jan-Out)</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalCurrentYTD)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Previsão Q4</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalPredictedQ4)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Estimado Anual</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalCurrentYTD + totalPredictedQ4)}
              </p>
            </CardContent>
          </Card>

          <Card className={`border-l-4 border-l-green-500`}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Confiança Média</p>
              <p className={`text-xl font-bold mt-1 ${confidenceColor}`}>
                {avgConfidence.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Previsão Geral */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Consumo Mensal - Real vs Previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={generalPredictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  name="Real"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#ef4444", r: 4 }}
                  name="Previsto"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Filtro de UGR */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Previsões por Unidade Organizacional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              <Button
                onClick={() => setSelectedUGR(null)}
                variant={selectedUGR === null ? "default" : "outline"}
                size="sm"
                className="text-xs"
              >
                Todas
              </Button>
              {(ugrData || []).map((ugr: any) => (
                <Button
                  key={ugr.UGR}
                  onClick={() => setSelectedUGR(ugr.UGR)}
                  variant={selectedUGR === ugr.UGR ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                >
                  {ugr.UGR}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Previsões por UGR */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold">
              {selectedUGR ? `Previsões - ${selectedUGR}` : "Previsões por UGR"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">UGR</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">
                      YTD Atual
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">
                      Previsão Q4
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">
                      Variação
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">
                      Confiança
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedUGR
                    ? selectedUGRPrediction
                      ? [selectedUGRPrediction]
                      : []
                    : ugrPredictions
                  ).map((pred: UGRPrediction, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900 font-medium">{pred.ugr}</td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        {formatCurrency(pred.currentSpend)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        {formatCurrency(pred.predictedQ4)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold ${
                          pred.variance > 10
                            ? "text-red-600"
                            : pred.variance > 5
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {pred.variance > 0 ? "+" : ""}
                        {pred.variance.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-xs font-semibold ${
                            pred.confidence > 80
                              ? "text-green-600"
                              : pred.confidence > 60
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {pred.confidence.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pred.confidence > 70 ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Alertas de Risco */}
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alertas de Risco
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ugrPredictions
              .filter((p: UGRPrediction) => p.variance > 10 || p.confidence < 60)
              .map((pred: UGRPrediction, idx: number) => (
                <div key={idx} className="text-sm text-red-800">
                  <strong>{pred.ugr}</strong>
                  {pred.variance > 10 && (
                    <span> - Variação alta ({pred.variance.toFixed(1)}%)</span>
                  )}
                  {pred.confidence < 60 && (
                    <span> - Confiança baixa ({pred.confidence.toFixed(1)}%)</span>
                  )}
                </div>
              ))}
            {ugrPredictions.filter((p: UGRPrediction) => p.variance > 10 || p.confidence < 60).length === 0 && (
              <div className="text-sm text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Nenhum alerta crítico detectado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>
              • Orçamento estimado para 2025: <strong>{formatCurrency(totalCurrentYTD + totalPredictedQ4)}</strong>
            </p>
            <p>
              • Previsão Q4 representa <strong>{((totalPredictedQ4 / (totalCurrentYTD + totalPredictedQ4)) * 100).toFixed(1)}%</strong> do orçamento anual
            </p>
            <p>
              • Confiança média das previsões: <strong>{avgConfidence.toFixed(1)}%</strong>
            </p>
            <p>
              • UGRs com maior variação: <strong>{ugrPredictions.sort((a: UGRPrediction, b: UGRPrediction) => b.variance - a.variance)[0]?.ugr || "N/A"}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

