"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
} from "lucide-react";
import { formatDate, formatDateTime, timeAgo, hoursRemaining } from "@/lib/format";
import {
  ENTREGABLE_STATUS_LABELS,
  ENTREGABLE_STATUS_COLORS,
  ENTREGABLE_TIPO_LABELS,
  RESPALDO_STATUS_LABELS,
  RESPALDO_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  TIPO_PROYECTO_LABELS,
} from "@/lib/state-machine";
import type { EntregableStatus, RespaldoStatus } from "@/db/schema";

// ── Types ────────────────────────────────────────────────

type EntregableItem = {
  id: string;
  tipo: string;
  cantidad: number;
  descripcion: string | null;
  estado: string;
  editorNombre: string | null;
  videoUrl: string | null;
  driveUrl: string | null;
  esCorreccion: boolean | null;
  fechaLimiteEdicion: string | null;
  correcciones: number;
  updatedAt: string;
};

type RespaldoData = {
  id: string;
  estado: string;
  fechaLimite: string;
  completadoAt: string | null;
  discoMadre: string | null;
  discoSSD: string | null;
  editoraDestino: string | null;
  tieneVideo: boolean | null;
  tieneAudio: boolean | null;
  tieneImagenes: boolean | null;
  videoRespaldado: boolean | null;
  audioRespaldado: boolean | null;
  imagenesRespaldadas: boolean | null;
  responsableNombre: string | null;
};

type ProjectDetail = {
  id: string;
  titulo: string;
  cliente: string;
  estadoGlobal: string;
  tipoProyecto: string | null;
  fechaGrabacion: string | null;
  pmNombre: string | null;
  entregables: EntregableItem[];
  respaldo: RespaldoData | null;
};

// ── Tipo badge colors ────────────────────────────────────

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  CAPITULO: { bg: "bg-blue-100", text: "text-blue-700" },
  REEL: { bg: "bg-purple-100", text: "text-purple-700" },
  LIVE_EDIT: { bg: "bg-indigo-100", text: "text-indigo-700" },
  THUMBNAIL: { bg: "bg-orange-100", text: "text-orange-700" },
  CORTE: { bg: "bg-teal-100", text: "text-teal-700" },
  OTRO: { bg: "bg-gray-100", text: "text-gray-600" },
};

// ── Component ────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/proyectos/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setProject)
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-sm text-gray-500">Proyecto no encontrado</p>
        <button
          onClick={() => router.push("/proyectos")}
          className="mt-4 text-sm text-gray-500 underline"
        >
          Volver a proyectos
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  const respaldo = project.respaldo;
  const entregables = project.entregables;

  return (
    <div className="mx-auto max-w-md px-4 pb-12 pt-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* ── Header card ──────────────────────────────── */}
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-gray-500">
          {project.cliente}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">
          {project.titulo}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {project.tipoProyecto && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {TIPO_PROYECTO_LABELS[project.tipoProyecto] ?? project.tipoProyecto}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              project.estadoGlobal === "ACTIVO"
                ? "bg-green-100 text-green-700"
                : project.estadoGlobal === "PAUSADO"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {PROJECT_STATUS_LABELS[project.estadoGlobal] ?? project.estadoGlobal}
          </span>
        </div>

        {project.fechaGrabacion && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={14} />
            <span>{formatDate(project.fechaGrabacion)}</span>
          </div>
        )}

        {project.pmNombre && (
          <p className="mt-2 text-xs text-gray-400">PM: {project.pmNombre}</p>
        )}
      </div>

      {/* ── Respaldo section ─────────────────────────── */}
      {respaldo && <RespaldoCard respaldo={respaldo} />}

      {/* ── Entregables section ──────────────────────── */}
      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Entregables ({entregables.length})
        </h2>

        {entregables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
            <Package size={28} className="mx-auto text-gray-300" />
            <p className="mt-2 text-sm text-gray-400">
              No hay entregables en este proyecto
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entregables.map((ent) => (
              <EntregableCard key={ent.id} entregable={ent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Respaldo Card ────────────────────────────────────────

function RespaldoCard({ respaldo }: { respaldo: RespaldoData }) {
  const estado = respaldo.estado as RespaldoStatus;
  const statusColors = RESPALDO_STATUS_COLORS[estado];
  const statusLabel = RESPALDO_STATUS_LABELS[estado];

  const remaining = hoursRemaining(respaldo.fechaLimite);
  const isPending = estado === "PENDIENTE" || estado === "EN_PROGRESO";
  const isVencido = estado === "VENCIDO";
  const isCompleto = estado === "COMPLETO";

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Respaldo</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Countdown / alert / complete */}
      <div className="mt-3">
        {isPending && remaining > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2">
            <Clock size={16} className="text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">
              Te quedan {remaining} hora{remaining !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {isPending && remaining === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
            <AlertCircle size={16} className="text-red-600" />
            <span className="text-sm font-medium text-red-700">
              Tiempo agotado
            </span>
          </div>
        )}

        {isVencido && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
            <AlertCircle size={16} className="text-red-600" />
            <span className="text-sm font-bold text-red-700">
              RESPALDO VENCIDO
            </span>
          </div>
        )}

        {isCompleto && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
            <CheckCircle2 size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Completado
              {respaldo.completadoAt && (
                <> el {formatDateTime(respaldo.completadoAt)}</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Responsable */}
      {respaldo.responsableNombre && (
        <p className="mt-3 text-xs text-gray-500">
          Responsable: <span className="text-gray-700">{respaldo.responsableNombre}</span>
        </p>
      )}

      {/* Disk info */}
      {(respaldo.discoMadre || respaldo.discoSSD || respaldo.editoraDestino) && (
        <div className="mt-3 space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          {respaldo.discoMadre && (
            <p>
              Disco Madre: <span className="text-gray-700">{respaldo.discoMadre}</span>
            </p>
          )}
          {respaldo.discoSSD && (
            <p>
              SSD: <span className="text-gray-700">{respaldo.discoSSD}</span>
            </p>
          )}
          {respaldo.editoraDestino && (
            <p>
              Editora destino: <span className="text-gray-700">{respaldo.editoraDestino}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Entregable Card ──────────────────────────────────────

function EntregableCard({ entregable }: { entregable: EntregableItem }) {
  const estado = entregable.estado as EntregableStatus;
  const statusColors = ENTREGABLE_STATUS_COLORS[estado];
  const statusLabel = ENTREGABLE_STATUS_LABELS[estado];
  const tipoColors = TIPO_COLORS[entregable.tipo] ?? TIPO_COLORS.OTRO;
  const tipoLabel = ENTREGABLE_TIPO_LABELS[entregable.tipo as keyof typeof ENTREGABLE_TIPO_LABELS] ?? entregable.tipo;

  return (
    <Link
      href={`/entregables/${entregable.id}`}
      className="block rounded-xl bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Row: tipo badge + estado badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tipoColors.bg} ${tipoColors.text}`}
        >
          {tipoLabel}
          {entregable.cantidad > 1 && ` x${entregable.cantidad}`}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
        >
          {statusLabel}
        </span>
        {entregable.esCorreccion && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
            CORRECCION
          </span>
        )}
      </div>

      {/* Description */}
      {entregable.descripcion && (
        <p className="mt-2 text-sm text-gray-700">{entregable.descripcion}</p>
      )}

      {/* Editor + deadline + corrections */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
        {entregable.editorNombre && (
          <span className="text-gray-500">{entregable.editorNombre}</span>
        )}
        {entregable.fechaLimiteEdicion && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDate(entregable.fechaLimiteEdicion)}
          </span>
        )}
        {entregable.correcciones > 0 && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
            {entregable.correcciones} correccion{entregable.correcciones > 1 ? "es" : ""}
          </span>
        )}
        <span className="ml-auto">{timeAgo(entregable.updatedAt)}</span>
      </div>
    </Link>
  );
}
