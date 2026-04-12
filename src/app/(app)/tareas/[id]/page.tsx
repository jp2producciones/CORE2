"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  Link2,
} from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  getAvailableTransitions,
} from "@/lib/state-machine";
import { timeAgo, formatDateTime } from "@/lib/format";
import type { TaskStatus, UserRole } from "@/db/schema";

type CorrectionItem = {
  id: string;
  detalles: string;
  inicioCiclo: string;
  vencimiento24h: string;
  cmId: string;
  cmNombre: string | null;
};

type TaskDetail = {
  id: string;
  proyectoId: string;
  editorId: string | null;
  estado: string;
  fechaLimite: string | null;
  videoUrl: string | null;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
  correcciones: CorrectionItem[];
};

type User = { id: string; nombre: string; rol: string };

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>("PROJECT_MANAGER");
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch(`/api/tareas/${id}`).then((r) => r.json()),
      fetch("/api/usuarios").then((r) => r.json()),
    ]).then(([t, u]) => {
      setTask(t);
      setUsers(u);
    });
  };

  useEffect(fetchData, [id]);

  const handleTransition = async (targetState: TaskStatus) => {
    if (targetState === "CORRECTION_24H") {
      setShowCorrectionModal(true);
      return;
    }

    setTransitioning(true);
    const body: Record<string, unknown> = {
      nuevoEstado: targetState,
      userRole: selectedRole,
    };

    // If transitioning to IN_EDITING, might need to assign editor
    if (targetState === "IN_EDITING" && !task?.editorId) {
      const editors = users.filter((u) => u.rol === "EDITOR");
      if (editors.length > 0) {
        body.editorId = editors[0].id;
      }
    }

    if (targetState === "REVIEW_DIANE" && videoUrl) {
      body.videoUrl = videoUrl;
    }

    await fetch(`/api/tareas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setTransitioning(false);
    setVideoUrl("");
    fetchData();
  };

  const handleCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransitioning(true);
    const cm = users.find((u) => u.rol === "COMMUNITY_MANAGER");
    await fetch(`/api/tareas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nuevoEstado: "CORRECTION_24H",
        userRole: selectedRole,
        detalles: correctionText,
        cmId: cm?.id || "",
      }),
    });
    setShowCorrectionModal(false);
    setCorrectionText("");
    setTransitioning(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    router.back();
  };

  const handleUpdateEditor = async (editorId: string) => {
    await fetch(`/api/tareas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editorId: editorId || null }),
    });
    fetchData();
  };

  if (!task) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#111] border-t-transparent" />
      </div>
    );
  }

  const estado = task.estado as TaskStatus;
  const colors = STATUS_COLORS[estado];
  const availableTransitions = getAvailableTransitions(estado, selectedRole);
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

      {/* Task Header */}
      <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${colors.bg} ${colors.text}`}>
                {STATUS_LABELS[estado]}
              </span>
              {estado === "CORRECTION_24H" && (
                <span className="animate-pulse rounded-full bg-[#DC2626] px-2.5 py-1 text-xs font-medium text-white">
                  SLA ACTIVO
                </span>
              )}
            </div>
            <p className="text-[#111]">{task.descripcion || "Sin descripción"}</p>
            <p className="mt-2 text-xs text-[#999]">
              Creada {timeAgo(task.createdAt)} · Actualizada {timeAgo(task.updatedAt)}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-[#FEE2E2] p-2 text-[#DC2626] hover:bg-[#FEE2E2]"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Video URL */}
        {task.videoUrl && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F9FAFB] p-3">
            <Link2 size={16} className="text-[#666]" />
            <a
              href={task.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#3B82F6] hover:underline"
            >
              {task.videoUrl}
            </a>
          </div>
        )}

        {/* Editor Assignment */}
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-[#666]">Editor Asignado</label>
          <select
            value={task.editorId || ""}
            onChange={(e) => handleUpdateEditor(e.target.value)}
            className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm outline-none"
          >
            <option value="">Sin asignar</option>
            {editors.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* State Transition Controls */}
      <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h2 className="mb-4 text-sm font-semibold text-[#111]">Transición de Estado</h2>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-[#666]">Actuar como rol:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm outline-none"
          >
            <option value="PROJECT_MANAGER">Project Manager</option>
            <option value="HEAD_EDITING">Head of Editing</option>
            <option value="EDITOR">Editor</option>
            <option value="COMMUNITY_MANAGER">Community Manager</option>
          </select>
        </div>

        {/* Video URL input for editors submitting to review */}
        {estado === "IN_EDITING" && selectedRole === "EDITOR" && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-[#666]">URL del video</label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#111]"
            />
          </div>
        )}

        {availableTransitions.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {availableTransitions.map((target) => {
              const targetColors = STATUS_COLORS[target];
              const isCorrection = target === "CORRECTION_24H";
              const isApproval = target === "APPROVED";
              return (
                <button
                  key={target}
                  onClick={() => handleTransition(target)}
                  disabled={transitioning}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    isCorrection
                      ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                      : isApproval
                      ? "bg-[#059669] text-white hover:bg-[#047857]"
                      : "bg-[#111] text-white hover:bg-[#333]"
                  }`}
                >
                  {isCorrection ? (
                    <AlertCircle size={16} />
                  ) : isApproval ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  {transitioning ? "Procesando..." : `Mover a ${STATUS_LABELS[target]}`}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#999]">
            No hay transiciones disponibles para el rol seleccionado en este estado.
          </p>
        )}
      </div>

      {/* Corrections History */}
      {task.correcciones.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-sm font-semibold text-[#111]">
            Historial de Correcciones ({task.correcciones.length})
          </h2>
          <div className="space-y-4">
            {task.correcciones.map((c, i) => (
              <div
                key={c.id}
                className="border-l-2 border-[#DC2626] pl-4"
              >
                <div className="flex items-center gap-2 text-xs text-[#999]">
                  <span>Corrección #{task.correcciones.length - i}</span>
                  <span>·</span>
                  <span>{formatDateTime(c.inicioCiclo)}</span>
                  {c.cmNombre && (
                    <>
                      <span>·</span>
                      <span>{c.cmNombre}</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm text-[#111]">{c.detalles}</p>
                <p className="mt-1 text-xs text-[#DC2626]">
                  Vence: {formatDateTime(c.vencimiento24h)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#DC2626]">
                Solicitar Corrección (24h SLA)
              </h2>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="text-[#999] hover:text-[#111]"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-[#666]">
              Al solicitar corrección, el editor tendrá 24 horas hábiles para corregir y reenviar el material.
            </p>
            <form onSubmit={handleCorrection}>
              <textarea
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                required
                rows={5}
                placeholder="Detalla las correcciones necesarias: minutaje, ajustes de color, audio, cortes, etc."
                className="mb-4 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#DC2626]"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#666] hover:bg-[#F9FAFB]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={transitioning}
                  className="flex-1 rounded-lg bg-[#DC2626] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#B91C1C] disabled:opacity-50"
                >
                  {transitioning ? "Procesando..." : "Iniciar Corrección 24h"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
