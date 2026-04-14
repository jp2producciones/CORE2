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
import { ENTREGABLE_STATUS_LABELS } from "@/lib/state-machine";

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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

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

  const statusBarData = Object.entries(data.statusCounts).map(([estado, count]) => ({
    estado: ENTREGABLE_STATUS_LABELS[estado as keyof typeof ENTREGABLE_STATUS_LABELS] || estado,
    count,
  }));

  const correctionGaugeData = [
    { name: "Correcciones", value: data.correctionRate },
    { name: "Aprobados", value: 100 - data.correctionRate },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard KPIs</h1>
        <p className="text-sm text-gray-500">
          Metricas de rendimiento y estado general de produccion.
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Lead Time</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{data.avgLeadTimeHours}h</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Aprobadas</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{data.totalApproved}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Correcciones</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{data.totalCorrections}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Tasa Retorno</p>
          <p className={`mt-1 text-2xl font-semibold ${data.correctionRate > 30 ? "text-red-600" : "text-green-600"}`}>
            {data.correctionRate}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Entregables por Estado</h2>
          {statusBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="estado" tick={{ fontSize: 10, fill: "#999" }} />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#111" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-gray-400">Sin datos</p>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Actividad (30 dias)</h2>
          {data.recentActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 10, fill: "#999" }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
                  }
                />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#111" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-gray-400">Sin datos</p>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Correcciones vs Aprobados</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={correctionGaugeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
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

        {editorBarData.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Carga por Editor</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={editorBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: "#999" }} />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="EN_EDICION" name="En Edicion" fill="#3B82F6" stackId="a" />
                <Bar dataKey="EDICION_COMPLETA" name="Ed. Completa" fill="#8B5CF6" stackId="a" />
                <Bar dataKey="EN_REVISION_CLIENTE" name="Rev. Cliente" fill="#F59E0B" stackId="a" />
                <Bar dataKey="APROBADO" name="Aprobado" fill="#10B981" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
