"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  ExternalLink,
  Trash2,
  X,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, PROJECT_STATUS_LABELS } from "@/lib/state-machine";
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
      body: JSON.stringify({ id, estadoGlobal: newStatus, titulo: project?.titulo, cliente: project?.cliente, pmId: project?.pmId }),
    });
    fetchData();
  };

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#111] border-t-transparent" />
      </div>
    );
  }

  const editors = users.filter((u) => u.rol === "EDITOR");

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-[#666] hover:text-[#111]"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* Project Header */}
      <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#111]">{project.titulo}</h1>
            <p className="text-sm text-[#666]">{project.cliente}</p>
            {project.pmNombre && (
              <p className="mt-1 text-xs text-[#999]">PM: {project.pmNombre}</p>
            )}
            <p className="mt-1 text-xs text-[#999]">Creado {timeAgo(project.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={project.estadoGlobal}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm outline-none"
            >
              <option value="ACTIVO">Activo</option>
              <option value="PAUSADO">Pausado</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
            <button
              onClick={handleDeleteProject}
              className="rounded-lg border border-[#FEE2E2] p-2 text-[#DC2626] hover:bg-[#FEE2E2]"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#111]">
          Tareas ({project.tareas.length})
        </h2>
        <button
          onClick={() => setShowTaskModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2 text-sm font-medium text-white hover:bg-[#333]"
        >
          <Plus size={16} />
          Nueva Tarea
        </button>
      </div>

      {project.tareas.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white py-12 text-center">
          <p className="text-sm text-[#666]">No hay tareas en este proyecto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {project.tareas.map((task) => {
            const colors = STATUS_COLORS[task.estado as TaskStatus];
            return (
              <Link
                key={task.id}
                href={`/tareas/${task.id}`}
                className="block rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {STATUS_LABELS[task.estado as TaskStatus]}
                      </span>
                      {task.correcciones > 0 && (
                        <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-xs text-[#DC2626]">
                          {task.correcciones} corrección{task.correcciones > 1 ? "es" : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-[#111]">
                      {task.descripcion || "Sin descripción"}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[#999]">
                      {task.editorNombre && <span>Editor: {task.editorNombre}</span>}
                      <span>{timeAgo(task.updatedAt)}</span>
                    </div>
                  </div>
                  {task.videoUrl && (
                    <ExternalLink size={16} className="ml-3 text-[#999]" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111]">Nueva Tarea</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-[#999] hover:text-[#111]">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111]">Descripción</label>
                <textarea
                  value={taskForm.descripcion}
                  onChange={(e) => setTaskForm({ ...taskForm, descripcion: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#111]"
                  placeholder="Descripción de la tarea"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111]">Editor</label>
                <select
                  value={taskForm.editorId}
                  onChange={(e) => setTaskForm({ ...taskForm, editorId: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#111]"
                >
                  <option value="">Sin asignar</option>
                  {editors.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#666] hover:bg-[#F9FAFB]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[#111] px-4 py-2 text-sm font-medium text-white hover:bg-[#333]"
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
