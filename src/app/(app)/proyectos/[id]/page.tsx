"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, ExternalLink, Trash2, X } from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from "@/lib/state-machine";
import { timeAgo } from "@/lib/format";
import type { TaskStatus } from "@/db/schema";

type TaskItem = {
  id: string;
  estado: string;
  descripcion: string | null;
  videoUrl: string | null;
  fechaLimite: string | null;
  createdAt: string;
  updatedAt: string;
  editorId: string | null;
  editorNombre: string | null;
  correcciones: number;
};

type ProjectDetail = {
  id: string;
  titulo: string;
  cliente: string;
  pmId: string | null;
  estadoGlobal: string;
  createdAt: string;
  pmNombre: string | null;
  tareas: TaskItem[];
};

type User = { id: string; nombre: string; rol: string };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ descripcion: "", editorId: "" });

  const fetchData = () => {
    Promise.all([
      fetch(`/api/proyectos/${id}`).then((r) => r.json()),
      fetch("/api/usuarios").then((r) => r.json()),
    ]).then(([p, u]) => {
      setProject(p);
      setUsers(u);
    });
  };

  useEffect(fetchData, [id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoId: id, ...taskForm }),
    });
    setTaskForm({ descripcion: "", editorId: "" });
    setShowTaskModal(false);
    fetchData();
  };

  const handleDeleteProject = async () => {
    if (!confirm("¿Eliminar este proyecto y todas sus tareas?")) return;
    await fetch(`/api/proyectos?id=${id}`, { method: "DELETE" });
    router.push("/proyectos");
  };

  const handleStatusChange = async (newStatus: string) => {
    await fetch("/api/proyectos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        estadoGlobal: newStatus,
        titulo: project?.titulo,
        cliente: project?.cliente,
        pmId: project?.pmId,
      }),
    });
    fetchData();
  };

  if (!project) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#111]" />
      </div>
    );
  }

  const editors = users.filter((u) => u.rol === "EDITOR");

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-[#666] hover:text-[#111]"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* Project header card */}
      <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#111]">
              {project.titulo}
            </h1>
            <p className="text-sm text-[#666]">{project.cliente}</p>
            {project.pmNombre && (
              <p className="mt-1 text-xs text-[#999]">
                PM: {project.pmNombre}
              </p>
            )}
            <p className="mt-1 text-xs text-[#999]">
              Creado {timeAgo(project.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={project.estadoGlobal}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            <button
              onClick={handleDeleteProject}
              className="rounded-lg p-2 text-[#999] hover:bg-[#FEE2E2] hover:text-[#EF4444]"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tasks section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#111]">
          Tareas ({project.tareas.length})
        </h2>
        <button
          onClick={() => setShowTaskModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#333]"
        >
          <Plus size={16} />
          Nueva Tarea
        </button>
      </div>

      {project.tareas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] py-16 text-center">
          <p className="text-sm text-[#666]">No hay tareas en este proyecto</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
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
                      Editor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                      Correcciones
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                      Actualizado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                      Video
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {project.tareas.map((task) => {
                    const colors = STATUS_COLORS[task.estado as TaskStatus];
                    return (
                      <Link
                        key={task.id}
                        href={`/tareas/${task.id}`}
                        className="table-row border-t border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB] cursor-pointer"
                      >
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                          >
                            {STATUS_LABELS[task.estado as TaskStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#111]">
                          {task.descripcion || "Sin descripcion"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#666]">
                          {task.editorNombre || "Sin asignar"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {task.correcciones > 0 ? (
                            <span className="rounded-full bg-[#FEE2E2] text-[#EF4444] px-2 py-0.5 text-xs">
                              {task.correcciones}
                            </span>
                          ) : (
                            <span className="text-xs text-[#999]">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#999]">
                          {timeAgo(task.updatedAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {task.videoUrl && (
                            <ExternalLink size={14} className="text-[#999]" />
                          )}
                        </td>
                      </Link>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {project.tareas.map((task) => {
              const colors = STATUS_COLORS[task.estado as TaskStatus];
              return (
                <Link
                  key={task.id}
                  href={`/tareas/${task.id}`}
                  className="block rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {STATUS_LABELS[task.estado as TaskStatus]}
                      </span>
                      {task.correcciones > 0 && (
                        <span className="rounded-full bg-[#FEE2E2] text-[#EF4444] px-2 py-0.5 text-xs">
                          {task.correcciones} correccion
                          {task.correcciones > 1 ? "es" : ""}
                        </span>
                      )}
                    </div>
                    {task.videoUrl && (
                      <ExternalLink size={14} className="text-[#999]" />
                    )}
                  </div>

                  <p className="mt-2 text-sm text-[#111]">
                    {task.descripcion || "Sin descripcion"}
                  </p>

                  <div className="mt-2 flex items-center gap-3 text-xs text-[#999]">
                    {task.editorNombre && (
                      <span>Editor: {task.editorNombre}</span>
                    )}
                    <span>{timeAgo(task.updatedAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111]">
                Nueva Tarea
              </h2>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-[#999] hover:text-[#111]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#111]">
                  Descripcion
                </label>
                <textarea
                  value={taskForm.descripcion}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, descripcion: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
                  placeholder="Descripcion de la tarea"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#111]">
                  Editor
                </label>
                <select
                  value={taskForm.editorId}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, editorId: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
                >
                  <option value="">Sin asignar</option>
                  {editors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#666] hover:bg-[#F9FAFB]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[#111] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#333]"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
