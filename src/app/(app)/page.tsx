"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Plus, FolderOpen } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { PROJECT_STATUS_LABELS, TIPO_PROYECTO_LABELS } from "@/lib/state-machine";

type Proyecto = {
  id: string;
  titulo: string;
  cliente: string;
  estadoGlobal: string;
  tipoProyecto: string | null;
  fechaGrabacion: string | null;
  createdAt: string;
  pmNombre: string | null;
  totalEntregables: number;
  entregablesAprobados: number;
};

function StatusBadge({ estado }: { estado: string }) {
  const label = PROJECT_STATUS_LABELS[estado] ?? estado;
  const colorMap: Record<string, string> = {
    ACTIVO: "bg-green-100 text-green-700",
    PAUSADO: "bg-yellow-100 text-yellow-700",
    FINALIZADO: "bg-red-100 text-red-700",
  };
  const colors = colorMap[estado] ?? "bg-gray-100 text-gray-600";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}

export default function FeedPage() {
  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null);

  useEffect(() => {
    fetch("/api/proyectos")
      .then((r) => r.json())
      .then(setProyectos);
  }, []);

  // Loading state
  if (proyectos === null) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CORE 2</h1>
        <p className="text-sm text-gray-500">Produccion</p>
      </div>

      {/* Cards */}
      {proyectos.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
          <FolderOpen className="mb-3 h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium text-gray-500">No hay proyectos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proyectos.map((p) => {
            const progress =
              p.totalEntregables > 0
                ? (p.entregablesAprobados / p.totalEntregables) * 100
                : 0;

            return (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className="block rounded-2xl bg-white p-4 shadow-sm active:scale-[0.98] transition-transform"
              >
                {/* Top row: client + type badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">
                    {p.cliente}
                  </span>
                  {p.tipoProyecto && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {TIPO_PROYECTO_LABELS[p.tipoProyecto] ?? p.tipoProyecto}
                    </span>
                  )}
                </div>

                {/* Title */}
                <p className="mt-1 text-base font-medium text-gray-900">
                  {p.titulo}
                </p>

                {/* Date + status row */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {p.fechaGrabacion
                        ? new Date(p.fechaGrabacion).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "Sin fecha"}
                    </span>
                  </div>
                  <StatusBadge estado={p.estadoGlobal} />
                </div>

                {/* Progress */}
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {p.entregablesAprobados}/{p.totalEntregables} entregables
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-black transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Timestamp */}
                <p className="mt-2 text-xs text-gray-400">
                  {timeAgo(p.createdAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-black shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}
