"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { timeAgo } from "@/lib/format";
import {
  ENTREGABLE_TIPO_LABELS,
  ENTREGABLE_STATUS_LABELS,
  ENTREGABLE_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from "@/lib/state-machine";
import type { EntregableStatus } from "@/db/schema";

type Project = {
  id: string;
  titulo: string;
  cliente: string;
  estadoGlobal: string;
  tipoProyecto: string | null;
  createdAt: string;
};

type Entregable = {
  id: string;
  proyectoId: string;
  tipo: string;
  descripcion: string | null;
  estado: string;
  editorNombre: string | null;
  proyectoTitulo: string | null;
  proyectoCliente: string | null;
  updatedAt: string;
};

type Filter = "TODOS" | "PROYECTOS" | "ENTREGABLES";

export default function BuscarPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entregables, setEntregables] = useState<Entregable[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("TODOS");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/proyectos").then((r) => r.json()),
      fetch("/api/entregables").then((r) => r.json()),
    ]).then(([p, e]) => {
      setProjects(p);
      setEntregables(e);
      setLoading(false);
    });
  }, []);

  const q = query.toLowerCase().trim();

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          p.cliente.toLowerCase().includes(q) ||
          (p.tipoProyecto || "").toLowerCase().includes(q),
      ),
    [projects, q],
  );

  const filteredEntregables = useMemo(
    () =>
      entregables.filter(
        (e) =>
          (e.descripcion || "").toLowerCase().includes(q) ||
          (e.proyectoTitulo || "").toLowerCase().includes(q) ||
          (e.proyectoCliente || "").toLowerCase().includes(q) ||
          (e.editorNombre || "").toLowerCase().includes(q) ||
          e.tipo.toLowerCase().includes(q),
      ),
    [entregables, q],
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  const showProjects = filter === "TODOS" || filter === "PROYECTOS";
  const showEntregables = filter === "TODOS" || filter === "ENTREGABLES";

  const hasResults =
    (showProjects && filteredProjects.length > 0) ||
    (showEntregables && filteredEntregables.length > 0);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">Buscar</h1>

      {/* Search input */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar proyectos, entregables..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
        />
      </div>

      {/* Filter pills */}
      <div className="mb-5 flex gap-2">
        {(["TODOS", "PROYECTOS", "ENTREGABLES"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {f === "TODOS" ? "Todos" : f === "PROYECTOS" ? "Proyectos" : "Entregables"}
          </button>
        ))}
      </div>

      {/* Results */}
      {!q ? (
        <p className="py-12 text-center text-sm text-gray-400">
          Escribe para buscar
        </p>
      ) : !hasResults ? (
        <p className="py-12 text-center text-sm text-gray-400">
          Sin resultados para &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="space-y-4">
          {/* Projects */}
          {showProjects && filteredProjects.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Proyectos ({filteredProjects.length})
              </h2>
              <div className="space-y-2">
                {filteredProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/proyectos/${p.id}`}
                    className="block rounded-xl bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{p.titulo}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {PROJECT_STATUS_LABELS[p.estadoGlobal] || p.estadoGlobal}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{p.cliente}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Entregables */}
          {showEntregables && filteredEntregables.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Entregables ({filteredEntregables.length})
              </h2>
              <div className="space-y-2">
                {filteredEntregables.map((e) => {
                  const estado = e.estado as EntregableStatus;
                  const colors = ENTREGABLE_STATUS_COLORS[estado];
                  return (
                    <Link
                      key={e.id}
                      href={`/proyectos/${e.proyectoId}`}
                      className="block rounded-xl bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {ENTREGABLE_TIPO_LABELS[e.tipo as keyof typeof ENTREGABLE_TIPO_LABELS] || e.tipo}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {ENTREGABLE_STATUS_LABELS[estado]}
                        </span>
                      </div>
                      {e.descripcion && (
                        <p className="mt-1 text-sm text-gray-700">{e.descripcion}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {e.proyectoTitulo} — {e.proyectoCliente}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
