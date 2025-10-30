import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowLeft, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function UGRDetails() {
  const [, setLocation] = useLocation();
  const { data: allData } = trpc.budget.getAllData.useQuery();
  const { data: ugrData } = trpc.budget.getUGRAnalysis.useQuery();

  const [selectedUGR, setSelectedUGR] = useState<string | null>(null);

  // Get UGR from URL or show list
  const ugrFromUrl = new URLSearchParams(window.location.search).get("ugr");

  const currentUGR = selectedUGR || ugrFromUrl;

  // Filter data for selected UGR
  const ugrContracts = currentUGR
    ? (allData || []).filter((item: any) => item.UGR === currentUGR)
    : [];

  const ugrStats = currentUGR
    ? (ugrData || []).find((item: any) => item.UGR === currentUGR)
    : null;

  // Calculate monthly consumption for selected UGR
  const monthlyUGRConsumption = currentUGR
    ? Array.from({ length: 12 }, (_, i) => {
        const month = String(i + 1).padStart(2, "0");
        const monthKey = `2025-${month}-01 00:00:00`;
        const total = ugrContracts.reduce((sum: number, contract: any) => {
          return sum + (contract[monthKey] || 0);
        }, 0);
        return {
          month: `${i + 1}`,
          consumption: total,
        };
      })
    : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!currentUGR) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Detalhes por UGR</h1>
            <p className="text-slate-600 mt-1">Selecione uma UGR para visualizar detalhes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(ugrData || []).map((ugr: any) => (
              <Card
                key={ugr.UGR}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedUGR(ugr.UGR)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">{ugr.UGR}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-600">Total Estimado</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(ugr.Total_Anual_Estimado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Taxa de Execução</p>
                    <p className="text-lg font-bold text-green-600">
                      {ugr.Percentual_Execucao.toFixed(2)}%
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {ugr.Contratos_Ativos} Ativos
                    </span>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      {ugr.Contratos_Expirados} Expirados
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">{currentUGR}</h1>
            <p className="text-slate-600 mt-1">Análise detalhada de contratos e execução</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Total Estimado</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(ugrStats?.Total_Anual_Estimado || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Total Empenho RAP</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(ugrStats?.Total_Empenho_RAP || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Taxa de Execução</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {(ugrStats?.Percentual_Execucao || 0).toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-600">Contratos</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {(ugrStats?.Contratos_Ativos || 0) + (ugrStats?.Contratos_Expirados || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consumo Mensal */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Consumo Mensal 2025</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyUGRConsumption}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="consumption"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status de Contratos */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Status de Contratos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Ativos", value: ugrStats?.Contratos_Ativos || 0 },
                      { name: "Expirados", value: ugrStats?.Contratos_Expirados || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Contratos Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Contratos ({ugrContracts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Descrição</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Valor Anual</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Empenho RAP</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Vigência</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ugrContracts.map((contract: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900">{contract.Despesa}</td>
                      <td className="py-3 px-4 text-slate-900">
                        {formatCurrency(contract.Total_Anual_Estimado || 0)}
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        {formatCurrency(contract.Total_Empenho_RAP || 0)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {contract.Data_Vigencia_Fim || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            contract.Data_Vigencia_Fim &&
                            new Date(contract.Data_Vigencia_Fim) < new Date()
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {contract.Data_Vigencia_Fim &&
                          new Date(contract.Data_Vigencia_Fim) < new Date()
                            ? "Expirado"
                            : "Ativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

