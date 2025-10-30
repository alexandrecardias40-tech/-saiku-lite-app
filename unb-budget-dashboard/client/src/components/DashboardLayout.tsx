import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  AlertCircle,
  TrendingUp,
  Settings,
  Menu,
  X,
  Home,
  PieChart,
  LineChart,
  Activity,
  GitCompare,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    indicators: true,
    charts: true,
    comparatives: true,
  });
  const [location] = useLocation();

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const indicatorItems: MenuItem[] = [
    { href: "/", label: "Dashboard Principal", icon: <Home className="w-4 h-4" /> },
    { href: "/kpis", label: "KPIs Detalhados", icon: <Activity className="w-4 h-4" /> },
    { href: "/alerts", label: "Alertas", icon: <AlertCircle className="w-4 h-4" /> },
  ];

  const chartItems: MenuItem[] = [
    { href: "/charts/monthly", label: "Consumo Mensal", icon: <LineChart className="w-4 h-4" /> },
    { href: "/charts/distribution", label: "Distribuição por UGR", icon: <PieChart className="w-4 h-4" /> },
    { href: "/charts/execution", label: "Taxa de Execução", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const comparativeItems: MenuItem[] = [
    { href: "/comparisons", label: "Comparações", icon: <GitCompare className="w-4 h-4" /> },
    { href: "/comparisons-ugr", label: "Análise por UGR", icon: <TrendingUp className="w-4 h-4" /> },
    { href: "/trends", label: "Tendências", icon: <LineChart className="w-4 h-4" /> },
    { href: "/predictive-analysis", label: "Análise Preditiva", icon: <TrendingUp className="w-4 h-4" /> },
    { href: "/data-upload", label: "Atualizar Dados", icon: <Settings className="w-4 h-4" /> },
  ];

  const isActive = (href: string) => location === href;

  const MenuSection = ({
    title,
    items,
    sectionKey,
  }: {
    title: string;
    items: MenuItem[];
    sectionKey: keyof typeof expandedSections;
  }) => (
    <div className="mb-2">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors font-semibold text-sm"
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${expandedSections[sectionKey] ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {expandedSections[sectionKey] && (
        <div className="space-y-1 mt-1 ml-2">
          {items.map((item) => {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                  isActive(item.href) ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-20"
        } bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col border-r border-slate-700 shadow-xl`}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              {APP_LOGO && (
                <img
                  src={APP_LOGO}
                  alt="Logo"
                  className="w-10 h-10 rounded-lg shadow-md"
                />
              )}
              <div>
                <h1 className="text-sm font-bold text-white truncate tracking-tight">
                  {APP_TITLE}
                </h1>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors ml-auto"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        {sidebarOpen && (
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <MenuSection title="📊 Indicadores" items={indicatorItems} sectionKey="indicators" />
            <MenuSection title="📈 Gráficos" items={chartItems} sectionKey="charts" />
            <MenuSection title="🔄 Comparativos" items={comparativeItems} sectionKey="comparatives" />
          </nav>
        )}

        {/* User Section */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          {sidebarOpen && user && (
            <div className="text-xs text-slate-300 px-2 py-2 bg-slate-700 rounded-lg">
              <div className="font-semibold truncate">{user.name || "Usuário"}</div>
              <div className="text-slate-400 text-xs truncate">{user.email}</div>
            </div>
          )}
          {/* Link to go back to the main program (Saiku root). When the SPA is embedded
              under /dashboard this allows users to return to the host application. */}
          <a
            href="/"
            className="w-full flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
