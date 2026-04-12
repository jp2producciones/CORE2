"use client";

import { useEffect, useState } from "react";
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
import { Activity, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/state-machine";

type DashboardData = {
  statusCounts: Record<string, number>;
  projectCounts: Record<string, number>;
  totalCorrections: number;
  totalApproved: number;
  correctionRate: number;
  avgLeadTimeHours: number;
  editorLoad: {
    editorId: string;
    editorNombre: string;
    estado: string;
    count: number;
  }[];
  recentActivity: { fecha: string; count: number }[];
};

const PIE_COLORS = ["#111", "#3B82F6", "#059669", "#D97706", "#7C3AED"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#111]" />
      </div>
    );
  }

  const totalTasks = Object.values(data.statusCounts).reduce(
    (a, b) => a + b,
    0,
  );
  const totalProjects = Object.values(data.projectCounts).reduce(
    (a, b) => a + b,
    0,
  );

  /* ---------- chart data ---------- */

  const statusPieData = Object.entries(data.statusCounts).map(
    ([estado, count]) => ({
      name:
        STATUS_LABELS[estado as keyof typeof STATUS_LABELS] || estado,
      value: count,
    }),
  );

  const projectBarData = Object.entries(data.projectCounts).map(
    ([status, count]) => ({
      name: status,
      count,
    }),
  );

  /* ---------- heatmap ---------- */

  const editors = [
    ...new Set(data.editorLoad.map((e) => e.editorNombre)),
  ].filter(Boolean);
  const states = [
    "PENDING_BACKUP",
    "IN_EDITING",
    "REVIEW_DIANE",
    "CORRECTION_24H",
    "APPROVED",
  ] as const;

  function heatClass(val: number): string {
    if (val === 0) return "bg-[#F9FAFB]";
    if (val <= 2) return "bg-[#ECFDF5] text-[#059669]";
    if (val <= 5) return "bg-[#FEF3C7] text-[#D97706]";
    return "bg-[#FEE2E2] text-[#EF4444] font-semibold";
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111]">Dashboard</h1>
        <p className="text-sm text-[#666]">
          Resumen general de proyectos, tareas y rendimiento del equipo.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Projects */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#999]">
            Proyectos
          </p>
          <p className="text-2xl font-semibold text-[#111]">
            {totalProjects}
          </p>
          <p className="mt-0.5 text-xs text-[#666]">
            {Object.keys(data.projectCounts).length} estados
          </p>
        </div>

        {/* Total Tasks */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#999]">
            Tareas
          </p>
          <p className="text-2xl font-semibold text-[#111]">{totalTasks}</p>
          <p className="mt-0.5 text-xs text-[#666]">
            {data.totalApproved} aprobadas
          </p>
        </div>

        {/* Avg Lead Time */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#999]">
            Lead Time Prom.
          </p>
          <p className="text-2xl font-semibold text-[#111]">
            {data.avgLeadTimeHours}h
          </p>
          <p className="mt-0.5 text-xs text-[#666]">horas promedio</p>
        </div>

        {/* Correction Rate */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#999]">
            Tasa Correcciones
          </p>
          <p className="text-2xl font-semibold text-[#111]">
            {data.correctionRate}%
          </p>
          <p className="mt-0.5 text-xs text-[#666]">
            {data.totalCorrections} correcciones
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Task Distribution Pie */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">
            Distribucion por Estado
          </h2>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={105}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusPieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-[#999]">
              Sin datos disponibles
            </div>
          )}
        </div>

        {/* Recent Activity Line */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">
            Actividad Reciente (30 dias)
          </h2>
          {data.recentActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 11, fill: "#666" }}
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "short",
                    })
                  }
                />
                <YAxis tick={{ fontSize: 11, fill: "#666" }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-[#999]">
              Sin datos disponibles
            </div>
          )}
        </div>

        {/* Project Status Bar */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">
            Proyectos por Estado
          </h2>
          {projectBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={projectBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#666" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#666" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#111" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-[#999]">
              Sin datos disponibles
            </div>
          )}
        </div>

        {/* Corrections vs Approved Bar */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">
            Correcciones vs Aprobadas
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                { name: "Aprobadas", value: data.totalApproved },
                { name: "Correcciones", value: data.totalCorrections },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#666" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "#666" }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="#059669" />
                <Cell fill="#EF4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap Table */}
      {editors.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="p-6 pb-0">
            <h2 className="text-sm font-semibold text-[#111]">
              Mapa de Carga por Editor
            </h2>
          </div>
          <div className="overflow-x-auto p-6 pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB]">
                  <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Editor
                  </th>
                  {states.map((s) => (
                    <th
                      key={s}
                      className="py-3 px-4 text-center text-xs font-medium uppercase tracking-wider text-[#999]"
                    >
                      {STATUS_LABELS[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editors.map((editor) => (
                  <tr
                    key={editor}
                    className="border-t border-[#E5E7EB]"
                  >
                    <td className="py-3 px-4 font-medium text-[#111]">
                      {editor}
                    </td>
                    {states.map((estado) => {
                      const entry = data.editorLoad.find(
                        (e) =>
                          e.editorNombre === editor &&
                          e.estado === estado,
                      );
                      const val = entry?.count || 0;
                      return (
                        <td
                          key={estado}
                          className={`py-3 px-4 text-center ${heatClass(val)}`}
                        >
                          {val}
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
