"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Check, X, Clock } from "lucide-react";
import { timeAgo } from "@/lib/format";

type User = { id: string; nombre: string; rol: string; cargo: string | null };

type Notificacion = {
  id: string;
  destinatarioId: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  programadaPara: string | null;
  createdAt: string;
  destinatarioNombre: string | null;
};

type AlertaGlobal = {
  id: string;
  mensaje: string;
  tipo: string;
  activa: boolean;
  createdAt: string;
};

const TIPO_BADGE: Record<string, string> = {
  RECORDATORIO: "bg-blue-100 text-blue-700",
  ALERTA: "bg-red-100 text-red-700",
  ALERTA_GLOBAL: "bg-red-100 text-red-700",
  CORRECCION: "bg-orange-100 text-orange-700",
  ESTADO: "bg-green-100 text-green-700",
  SISTEMA: "bg-gray-100 text-gray-600",
};

export default function AlertasPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [alertas, setAlertas] = useState<AlertaGlobal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async (userId?: string) => {
    const [uRes, aRes] = await Promise.all([
      fetch("/api/usuarios").then((r) => r.json()),
      fetch("/api/alertas-globales").then((r) => r.json()),
    ]);

    setUsers(uRes);
    setAlertas(aRes);

    const uid = userId || (uRes.length > 0 ? uRes[0].id : "");
    if (!selectedUserId && uid) setSelectedUserId(uid);

    if (uid) {
      const nRes = await fetch(`/api/notificaciones?userId=${uid}&todas=true`).then((r) => r.json());
      setNotificaciones(nRes.notificaciones);
      setNoLeidas(nRes.noLeidas);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUserChange = async (uid: string) => {
    setSelectedUserId(uid);
    const nRes = await fetch(`/api/notificaciones?userId=${uid}&todas=true`).then((r) => r.json());
    setNotificaciones(nRes.notificaciones);
    setNoLeidas(nRes.noLeidas);
  };

  const markAsRead = async (id: string) => {
    await fetch(`/api/notificaciones/${id}`, { method: "PUT" });
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    );
    setNoLeidas((prev) => Math.max(0, prev - 1));
  };

  const dismissAlerta = async (id: string) => {
    await fetch("/api/alertas-globales", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAlertas((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-bold text-gray-900">Alertas</h1>
        {noLeidas > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
            {noLeidas}
          </span>
        )}
      </div>

      <select
        value={selectedUserId}
        onChange={(e) => handleUserChange(e.target.value)}
        className="mb-5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre} — {u.cargo || u.rol}
          </option>
        ))}
      </select>

      {/* Alertas globales */}
      {alertas.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertas.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{a.mensaje}</p>
                <p className="mt-1 text-xs text-red-400">{timeAgo(a.createdAt)}</p>
              </div>
              <button
                onClick={() => dismissAlerta(a.id)}
                className="shrink-0 rounded-lg p-1 text-red-400 hover:bg-red-100"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Notificaciones */}
      {notificaciones.length === 0 ? (
        <div className="rounded-xl bg-gray-50 py-12 text-center">
          <Bell size={28} className="mx-auto text-gray-300" />
          <p className="mt-2 text-sm text-gray-400">Sin alertas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notificaciones.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.leida && markAsRead(n.id)}
              className={`w-full rounded-xl bg-white p-3 text-left shadow-sm transition-opacity ${
                n.leida ? "opacity-50" : "border-l-4 border-gray-900"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-800">{n.mensaje}</p>
                {!n.leida && <Check size={16} className="mt-0.5 shrink-0 text-gray-400" />}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TIPO_BADGE[n.tipo] || "bg-gray-100 text-gray-600"}`}
                >
                  {n.tipo}
                </span>
                <span className="text-xs text-gray-400">
                  {timeAgo(n.programadaPara || n.createdAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
