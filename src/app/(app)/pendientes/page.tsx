"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, AlertCircle, Package } from "lucide-react";
import { hoursRemaining, daysRemaining } from "@/lib/format";
import {
  ENTREGABLE_STATUS_LABELS,
  ENTREGABLE_STATUS_COLORS,
  ENTREGABLE_TIPO_LABELS,
  RESPALDO_STATUS_LABELS,
} from "@/lib/state-machine";
import type { EntregableStatus } from "@/db/schema";

type User = { id: string; nombre: string; rol: string; cargo: string | null };

type Entregable = {
  id: string;
  proyectoId: string;
  tipo: string;
  descripcion: string | null;
  estado: string;
  editorId: string | null;
  editorNombre: string | null;
  proyectoTitulo: string | null;
  proyectoCliente: string | null;
  fechaLimiteEdicion: string | null;
  fechaLimiteRevisionCliente: string | null;
  updatedAt: string;
};

type Respaldo = {
  id: string;
  proyectoId: string;
  responsableId: string;
  estado: string;
  fechaLimite: string;
  proyectoTitulo: string | null;
  proyectoCliente: string | null;
  responsableNombre: string | null;
};

function Countdown({ deadline }: { deadline: string }) {
  const h = hoursRemaining(deadline);
  const cls =
    h <= 3 ? "text-red-600 font-bold" : h <= 12 ? "text-yellow-600 font-medium" : "text-gray-500";
  return (
    <span className={`flex items-center gap-1 text-xs ${cls}`}>
      <Clock size={12} />
      {h > 0 ? `${h}h restantes` : "Vencido"}
    </span>
  );
}

export default function PendientesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [entregables, setEntregables] = useState<Entregable[]>([]);
  const [respaldos, setRespaldos] = useState<Respaldo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/usuarios").then((r) => r.json()),
      fetch("/api/entregables").then((r) => r.json()),
      fetch("/api/respaldos").then((r) => r.json()),
    ]).then(([u, e, r]) => {
      setUsers(u);
      setEntregables(e);
      setRespaldos(r);
      if (u.length > 0) setSelectedUserId(u[0].id);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const cargo = selectedUser?.cargo;

  // Filter logic by cargo
  const pendingRespaldos = respaldos.filter(
    (r) =>
      (r.estado === "PENDIENTE" || r.estado === "EN_PROGRESO") &&
      (cargo === "FILMMAKER" ? r.responsableId === selectedUserId : cargo === "PROJECT_MANAGER"),
  );

  const enEdicion = entregables.filter(
    (e) =>
      e.estado === "EN_EDICION" &&
      (cargo === "EDITOR" ? e.editorId === selectedUserId : cargo === "PROJECT_MANAGER"),
  );

  const porEntregar = entregables.filter(
    (e) =>
      ["EDICION_COMPLETA", "ENTREGA_INTERNA", "ENTREGA_EXTERNA", "EN_REVISION_CLIENTE"].includes(e.estado) &&
      (cargo === "COMMUNITY_MANAGER" || cargo === "PROJECT_MANAGER"),
  );

  const porAsignar = entregables.filter(
    (e) =>
      e.estado === "RESPALDO_COMPLETO" &&
      (cargo === "HEAD_EDITING" || cargo === "PROJECT_MANAGER"),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pendientes</h1>
      </div>

      <select
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
        className="mb-5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre} — {u.cargo || u.rol}
          </option>
        ))}
      </select>

      {/* Respaldos pendientes */}
      {(cargo === "FILMMAKER" || cargo === "PROJECT_MANAGER") && (
        <Section title="Respaldos pendientes" count={pendingRespaldos.length}>
          {pendingRespaldos.map((r) => (
            <Link
              key={r.id}
              href={`/proyectos/${r.proyectoId}`}
              className="block rounded-xl bg-white p-3 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-900">
                {r.proyectoTitulo}
              </p>
              <p className="text-xs text-gray-500">{r.proyectoCliente}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  {RESPALDO_STATUS_LABELS[r.estado as keyof typeof RESPALDO_STATUS_LABELS] || r.estado}
                </span>
                <Countdown deadline={r.fechaLimite} />
              </div>
            </Link>
          ))}
        </Section>
      )}

      {/* Por asignar (HEAD_EDITING) */}
      {(cargo === "HEAD_EDITING" || cargo === "PROJECT_MANAGER") && (
        <Section title="Por asignar editor" count={porAsignar.length}>
          {porAsignar.map((e) => (
            <EntregableCard key={e.id} entregable={e} />
          ))}
        </Section>
      )}

      {/* En edicion */}
      {(cargo === "EDITOR" || cargo === "PROJECT_MANAGER") && (
        <Section title="En edicion" count={enEdicion.length}>
          {enEdicion.map((e) => (
            <EntregableCard key={e.id} entregable={e} showDeadline />
          ))}
        </Section>
      )}

      {/* Por entregar */}
      {(cargo === "COMMUNITY_MANAGER" || cargo === "PROJECT_MANAGER") && (
        <Section title="Por entregar" count={porEntregar.length}>
          {porEntregar.map((e) => (
            <EntregableCard key={e.id} entregable={e} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-gray-500">
        {title} ({count})
      </h2>
      {count === 0 ? (
        <p className="rounded-xl bg-gray-50 py-6 text-center text-xs text-gray-400">
          Sin pendientes
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function EntregableCard({
  entregable,
  showDeadline,
}: {
  entregable: Entregable;
  showDeadline?: boolean;
}) {
  const estado = entregable.estado as EntregableStatus;
  const colors = ENTREGABLE_STATUS_COLORS[estado];

  return (
    <Link
      href={`/proyectos/${entregable.proyectoId}`}
      className="block rounded-xl bg-white p-3 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {ENTREGABLE_TIPO_LABELS[entregable.tipo as keyof typeof ENTREGABLE_TIPO_LABELS] || entregable.tipo}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
          {ENTREGABLE_STATUS_LABELS[estado]}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">
        {entregable.proyectoTitulo}
      </p>
      <p className="text-xs text-gray-500">{entregable.proyectoCliente}</p>
      <div className="mt-2 flex items-center justify-between">
        {entregable.editorNombre && (
          <span className="text-xs text-gray-400">{entregable.editorNombre}</span>
        )}
        {showDeadline && entregable.fechaLimiteEdicion && (
          <Countdown deadline={entregable.fechaLimiteEdicion} />
        )}
      </div>
    </Link>
  );
}
