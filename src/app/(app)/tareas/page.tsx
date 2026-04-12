"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListTodo, Filter } from "lucide-react";
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
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#111] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#111]">Tareas</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !filter ? "bg-[#111] text-white" : "bg-white text-[#666] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
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
                filter === s ? `${colors.bg} ${colors.text}` : "bg-white text-[#666] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-white py-16">
          <ListTodo size={48} className="mb-4 text-[#999]" />
          <p className="text-sm text-[#666]">No hay tareas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const colors = STATUS_COLORS[task.estado as TaskStatus];
            return (
              <Link
                key={task.id}
                href={`/tareas/${task.id}`}
                className="block rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {STATUS_LABELS[task.estado as TaskStatus]}
                      </span>
                      {task.estado === "CORRECTION_24H" && (
                        <span className="animate-pulse rounded-full bg-[#DC2626] px-2 py-0.5 text-xs font-medium text-white">
                          URGENTE
                        </span>
                      )}
                      {task.correcciones > 0 && (
                        <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-xs text-[#DC2626]">
                          {task.correcciones} corrección{task.correcciones > 1 ? "es" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#111]">
                      {task.descripcion || "Sin descripción"}
                    </p>
                    <p className="mt-1 text-xs text-[#666]">
                      {task.proyectoTitulo} — {task.proyectoCliente}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[#999]">
                      {task.editorNombre && <span>Editor: {task.editorNombre}</span>}
                      <span>{timeAgo(task.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
