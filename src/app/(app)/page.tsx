"use client";

import { useEffect, useState } from "react";
import {
  FolderKanban,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/state-machine";

type DashboardData = {
  statusCounts: Record<string, number>;
  projectCounts: Record<string, number>;
  totalCorrections: number;
  totalApproved: number;
  correctionRate: number;
  avgLeadTimeHours: number;
  editorLoad: { editorId: string; editorNombre: string; estado: string; count: number }[];
  recentActivity: { fecha: string; count: number }[];
};

const PIE_COLORS = ["#F59E0B", "#3B82F6", "#8B5CF6", "#EF4444", "#10B981"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#111] border-t-transparent" />
      </div>
    );
  }

  const totalTasks = Object.values(data.statusCounts).reduce((a, b) => a + b, 0);
  const totalProjects = Object.values(data.projectCounts).reduce((a, b) => a + b, 0);

  const statusPieData = Object.entries(data.statusCounts).map(([estado, count]) => ({
    name: STATUS_LABELS[estado as keyof typeof STATUS_LABELS] || estado,
    value: count,
  }));

  // Build heatmap data
  const editors = [...new Set(data.editorLoad.map((e) => e.editorNombre))].filter(Boolean);
  const states = ["PENDING_BACKUP", "IN_EDITING", "REVIEW_DIANE", "CORRECTION_24H", "APPROVED"] as const;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#111]">Dashboard</h1>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#EFF6FF] p-2">
              <FolderKanban size={20} className="text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111]">{totalProjects}</p>
              <p className="text-xs text-[#666]">Proyectos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#ECFDF5] p-2">
              <ListTodo size={20} className="text-[#059669]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111]">{totalTasks}</p>
              <p className="text-xs text-[#666]">Tareas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#FEF3C7] p-2">
              <Clock size={20} className="text-[#D97706]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111]">{data.avgLeadTimeHours}h</p>
              <p className="text-xs text-[#666]">Lead Time Prom.</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${data.correctionRate > 30 ? "bg-[#FEE2E2]" : "bg-[#ECFDF5]"}`}>
              <AlertTriangle
                size={20}
                className={data.correctionRate > 30 ? "text-[#DC2626]" : "text-[#059669]"}
              />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111]">{data.correctionRate}%</p>
              <p className="text-xs text-[#666]">Tasa Corrección</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Task Distribution Pie */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">Distribución de Tareas</h2>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusPieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-[#999]">
              Sin datos
            </div>
          )}
        </div>

        {/* Activity Line Chart */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">Actividad Reciente (30 días)</h2>
          {data.recentActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 11, fill: "#666" }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
                />
                <YAxis tick={{ fontSize: 11, fill: "#666" }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-[#999]">
              Sin datos
            </div>
          )}
        </div>
      </div>

      {/* Bottleneck Heatmap */}
      {editors.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">
            Mapa de Carga por Editor
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="pb-3 text-left text-xs font-medium text-[#666]">Editor</th>
                  {states.map((s) => (
                    <th key={s} className="pb-3 text-center text-xs font-medium text-[#666]">
                      {STATUS_LABELS[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editors.map((editor) => (
                  <tr key={editor} className="border-t border-[#E5E7EB]">
                    <td className="py-3 font-medium text-[#111]">{editor}</td>
                    {states.map((estado) => {
                      const entry = data.editorLoad.find(
                        (e) => e.editorNombre === editor && e.estado === estado
                      );
                      const val = entry?.count || 0;
                      const bg =
                        val === 0
                          ? "bg-[#F9FAFB]"
                          : val <= 2
                          ? "bg-[#ECFDF5] text-[#059669]"
                          : val <= 5
                          ? "bg-[#FEF3C7] text-[#D97706]"
                          : "bg-[#FEE2E2] text-[#DC2626] font-bold";
                      return (
                        <td key={estado} className="py-3 text-center">
                          <span className={`inline-block min-w-[2rem] rounded-md px-2 py-1 text-xs ${bg}`}>
                            {val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
