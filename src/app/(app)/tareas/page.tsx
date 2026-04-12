"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/state-machine";
import { timeAgo } from "@/lib/format";
import type { TaskStatus } from "@/db/schema";

type TaskItem = {
  id: string;
  proyectoId: string;
  editorId: string | null;
  estado: string;
  fechaLimite: string | null;
  videoUrl: string | null;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
  editorNombre: string | null;
  proyectoTitulo: string | null;
  proyectoCliente: string | null;
  correcciones: number;
};

const ALL_STATES: TaskStatus[] = [
  "PENDING_BACKUP",
  "IN_EDITING",
  "REVIEW_DIANE",
  "CORRECTION_24H",
  "APPROVED",
];

export default function TareasPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = filter ? `/api/tareas?estado=${filter}` : "/api/tareas";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setTasks(data);
        setLoading(false);
      });
  }, [filter]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#111] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-semibold text-[#111] mb-1">Tareas</h1>
      <p className="text-sm text-[#666] mb-6">
        Gestiona y da seguimiento a todas las tareas de produccion.
      </p>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !filter
              ? "bg-[#111] text-white"
              : "bg-white text-[#666] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
          }`}
        >
          Todas
        </button>
        {ALL_STATES.map((s) => {
          const colors = STATUS_COLORS[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === s
                  ? `${colors.bg} ${colors.text}`
                  : "bg-white text-[#666] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {tasks.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] py-16 text-center">
          <p className="text-sm text-[#666]">No hay tareas</p>
        </div>
      ) : (
        <>
          {/* Desktop TABLE */}
          <div className="hidden lg:block rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <table className="w-full">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Descripcion
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Proyecto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Editor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Correcciones
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Actualizado
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const colors = STATUS_COLORS[task.estado as TaskStatus];
                  return (
                    <tr key={task.id} className="border-t border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/tareas/${task.id}`} className="block">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                            >
                              {STATUS_LABELS[task.estado as TaskStatus]}
                            </span>
                            {task.estado === "CORRECTION_24H" && (
                              <span className="animate-pulse rounded-full bg-[#EF4444] px-2 py-0.5 text-xs font-medium text-white">
                                URGENTE
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/tareas/${task.id}`} className="block text-sm text-[#111]">
                          {task.descripcion || "Sin descripcion"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/tareas/${task.id}`} className="block text-sm text-[#666]">
                          {task.proyectoTitulo || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/tareas/${task.id}`} className="block text-sm text-[#666]">
                          {task.editorNombre || "Sin asignar"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/tareas/${task.id}`} className="block">
                          {task.correcciones > 0 ? (
                            <span className="rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-medium text-[#EF4444]">
                              {task.correcciones}
                            </span>
                          ) : (
                            <span className="text-sm text-[#999]">0</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/tareas/${task.id}`} className="block text-xs text-[#999]">
                          {timeAgo(task.updatedAt)}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile CARDS */}
          <div className="lg:hidden space-y-3">
            {tasks.map((task) => {
              const colors = STATUS_COLORS[task.estado as TaskStatus];
              return (
                <Link
                  key={task.id}
                  href={`/tareas/${task.id}`}
                  className="block rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {STATUS_LABELS[task.estado as TaskStatus]}
                    </span>
                    {task.estado === "CORRECTION_24H" && (
                      <span className="animate-pulse rounded-full bg-[#EF4444] px-2 py-0.5 text-xs font-medium text-white">
                        URGENTE
                      </span>
                    )}
                    {task.correcciones > 0 && (
                      <span className="rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-medium text-[#EF4444]">
                        {task.correcciones} correccion{task.correcciones > 1 ? "es" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#111]">
                    {task.descripcion || "Sin descripcion"}
                  </p>
                  <p className="mt-1 text-xs text-[#666]">
                    {task.proyectoTitulo} — {task.proyectoCliente}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-[#999]">
                    {task.editorNombre && <span>Editor: {task.editorNombre}</span>}
                    <span>{timeAgo(task.updatedAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
