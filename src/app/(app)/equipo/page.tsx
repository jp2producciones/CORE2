"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Users } from "lucide-react";
import type { UserRole } from "@/db/schema";

type User = {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  PROJECT_MANAGER: "Project Manager",
  HEAD_EDITING: "Head of Editing",
  EDITOR: "Editor",
  COMMUNITY_MANAGER: "Community Manager",
};

const ROLE_COLORS: Record<string, string> = {
  PROJECT_MANAGER: "bg-[#EFF6FF] text-[#3B82F6]",
  HEAD_EDITING: "bg-[#FEF3C7] text-[#D97706]",
  EDITOR: "bg-[#ECFDF5] text-[#059669]",
  COMMUNITY_MANAGER: "bg-[#EDE9FE] text-[#7C3AED]",
};

const emptyForm = { nombre: "", email: "", rol: "EDITOR" as UserRole };

export default function EquipoPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  };

  useEffect(fetchData, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...form }),
      });
    } else {
      await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm(emptyForm);
    setEditing(null);
    setShowModal(false);
    fetchData();
  };

  const handleEdit = (user: User) => {
    setEditing(user);
    setForm({ nombre: user.nombre, email: user.email, rol: user.rol });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este miembro del equipo?")) return;
    await fetch(`/api/usuarios?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#111]" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111]">Equipo</h1>
          <p className="text-sm text-[#666]">
            {users.length} miembro{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#333]"
        >
          <Plus size={16} />
          Nuevo Miembro
        </button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] py-16">
          <Users size={40} className="mb-3 text-[#999]" />
          <p className="text-sm font-medium text-[#666]">No hay miembros</p>
          <p className="text-xs text-[#999]">Agrega al equipo para empezar</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:block">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#999]">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#999]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-semibold text-[#666]">
                          {user.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#111]">
                          {user.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#666]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.rol]}`}
                      >
                        {ROLE_LABELS[user.rol]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="rounded-lg p-1.5 text-[#999] transition-colors hover:bg-[#F3F4F6] hover:text-[#111]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="rounded-lg p-1.5 text-[#999] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 lg:hidden">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-sm font-semibold text-[#666]">
                      {user.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111]">
                        {user.nombre}
                      </p>
                      <p className="text-xs text-[#666]">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(user)}
                      className="rounded-lg p-1.5 text-[#999] hover:bg-[#F3F4F6] hover:text-[#111]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="rounded-lg p-1.5 text-[#999] hover:bg-[#FEE2E2] hover:text-[#EF4444]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.rol]}`}
                  >
                    {ROLE_LABELS[user.rol]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#111]">
                  {editing ? "Editar Miembro" : "Nuevo Miembro"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1 text-[#999] hover:text-[#111]"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#111]">
                    Nombre
                  </label>
                  <input
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                    required
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#111]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
                    placeholder="correo@empresa.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#111]">
                    Rol
                  </label>
                  <select
                    value={form.rol}
                    onChange={(e) =>
                      setForm({ ...form, rol: e.target.value as UserRole })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
                  >
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-[#666] hover:bg-[#F9FAFB]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-[#111] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#333]"
                  >
                    {editing ? "Guardar" : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
