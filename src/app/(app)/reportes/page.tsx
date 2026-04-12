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
  Legend,
} from "recharts";
import { STATUS_LABELS } from "@/lib/state-machine";

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

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function ReportesPage() {
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

  // Editor performance data
  const editorMap = new Map<string, Record<string, number>>();
  data.editorLoad.forEach((e) => {
    if (!e.editorNombre) return;
    if (!editorMap.has(e.editorNombre)) editorMap.set(e.editorNombre, {});
    editorMap.get(e.editorNombre)![e.estado] = e.count;
  });

  const editorBarData = [...editorMap.entries()].map(([nombre, estados]) => ({
    nombre,
    ...estados,
  }));

  // Status bar chart
  const statusBarData = Object.entries(data.statusCounts).map(([estado, count]) => ({
    estado: STATUS_LABELS[estado as keyof typeof STATUS_LABELS] || estado,
    count,
  }));

  // Correction gauge
  const correctionGaugeData = [
    { name: "Correcciones", value: data.correctionRate },
    { name: "Aprobados", value: 100 - data.correctionRate },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#111]">Reportes BI</h1>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-medium text-[#666]">Lead Time Promedio</p>
          <p className="mt-1 text-3xl font-bold text-[#111]">{data.avgLeadTimeHours}h</p>
          <p className="mt-1 text-xs text-[#999]">Creación → Aprobación</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-medium text-[#666]">Total Aprobadas</p>
          <p className="mt-1 text-3xl font-bold text-[#059669]">{data.totalApproved}</p>
          <p className="mt-1 text-xs text-[#999]">Tareas completadas</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-medium text-[#666]">Total Correcciones</p>
          <p className="mt-1 text-3xl font-bold text-[#DC2626]">{data.totalCorrections}</p>
          <p className="mt-1 text-xs text-[#999]">Rechazos acumulados</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-medium text-[#666]">Tasa de Retorno</p>
          <p className={`mt-1 text-3xl font-bold ${data.correctionRate > 30 ? "text-[#DC2626]" : "text-[#059669]"}`}>
            {data.correctionRate}%
          </p>
          <p className="mt-1 text-xs text-[#999]">
            {data.correctionRate > 30 ? "Por encima del umbral" : "Dentro del rango"}
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">Tareas por Estado</h2>
          {statusBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="estado" tick={{ fontSize: 11, fill: "#666" }} />
                <YAxis tick={{ fontSize: 11, fill: "#666" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-[#999]">Sin datos</div>
          )}
        </div>

        {/* Correction Rate Gauge */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">Tasa de Corrección vs Aprobación</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={correctionGaugeData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                dataKey="value"
                startAngle={180}
                endAngle={0}
              >
                <Cell fill="#DC2626" />
                <Cell fill="#059669" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Trend */}
      <div className="mb-8 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h2 className="mb-4 text-sm font-semibold text-[#111]">Tendencia de Actividad (30 días)</h2>
        {data.recentActivity.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.recentActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 11, fill: "#666" }}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
                }
              />
              <YAxis tick={{ fontSize: 11, fill: "#666" }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-[#999]">Sin datos</div>
        )}
      </div>

      {/* Editor Performance */}
      {editorBarData.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">Carga por Editor</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={editorBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "#666" }} />
              <YAxis tick={{ fontSize: 11, fill: "#666" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="IN_EDITING" name="En Edición" fill="#3B82F6" stackId="a" />
              <Bar dataKey="REVIEW_DIANE" name="Revisión" fill="#8B5CF6" stackId="a" />
              <Bar dataKey="CORRECTION_24H" name="Corrección" fill="#EF4444" stackId="a" />
              <Bar dataKey="APPROVED" name="Aprobado" fill="#10B981" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
