"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban, X } from "lucide-react";
import { PROJECT_STATUS_LABELS } from "@/lib/state-machine";
import { timeAgo } from "@/lib/format";

type Project = {
  id: string;
  titulo: string;
  cliente: string;
  pmId: string | null;
  estadoGlobal: string;
  createdAt: string;
  pmNombre: string | null;
  totalTareas: number;
  tareasAprobadas: number;
};

type User = { id: string; nombre: string; rol: string };

export default function ProyectosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ titulo: "", cliente: "", pmId: "" });
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    Promise.all([
      fetch("/api/proyectos").then((r) => r.json()),
      fetch("/api/usuarios").then((r) => r.json()),
    ]).then(([p, u]) => {
      setProjects(p);
      setUsers(u);
      setLoading(false);
    });
  };

  useEffect(fetchData, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/proyectos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ titulo: "", cliente: "", pmId: "" });
    setShowModal(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#111]" />
      </div>
    );
  }

  const pms = users.filter((u) => u.rol === "PROJECT_MANAGER");

  const statusBadge = (estado: string) => {
    const style =
      estado === "ACTIVO"
        ? "bg-[#ECFDF5] text-[#059669]"
        : estado === "PAUSADO"
          ? "bg-[#FEF3C7] text-[#D97706]"
          : "bg-[#F3F4F6] text-[#666]";
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
        {PROJECT_STATUS_LABELS[estado]}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111]">Proyectos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#333]"
        >
          <Plus size={16} />
          Nuevo Proyecto
        </button>
      </div>

      {/* Project cards or empty state */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] py-16 text-center">
          <FolderKanban size={48} className="mx-auto mb-4 text-[#999]" />
          <p className="text-sm text-[#666]">No hay proyectos todavia</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const progress =
              p.totalTareas > 0
                ? Math.round((p.tareasAprobadas / p.totalTareas) * 100)
                : 0;
            return (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#111]">
                      {p.titulo}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#666]">{p.cliente}</p>
                  </div>
                  {statusBadge(p.estadoGlobal)}
                </div>

                {p.pmNombre && (
                  <p className="mb-3 text-xs text-[#999]">PM: {p.pmNombre}</p>
                )}

                <div className="mb-2 flex items-center justify-between text-xs text-[#666]">
                  <span>
                    {p.tareasAprobadas}/{p.totalTareas} tareas
                  </span>
                  <span>{progress}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-1 rounded-full bg-[#E5E7EB]">
                  <div
                    className="h-full rounded-full bg-[#059669] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="mt-3 text-xs text-[#999]">
                  {timeAgo(p.createdAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111]">
                Nuevo Proyecto
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#999] hover:text-[#111]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#111]">
                  Titulo
                </label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
                  placeholder="Nombre del proyecto"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#111]">
                  Cliente
                </label>
                <input
                  value={form.cliente}
                  onChange={(e) =>
                    setForm({ ...form, cliente: e.target.value })
                  }
                  required
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
                  placeholder="Nombre del cliente"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#111]">
                  Project Manager
                </label>
                <select
                  value={form.pmId}
                  onChange={(e) => setForm({ ...form, pmId: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
                >
                  <option value="">Sin asignar</option>
                  {pms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
