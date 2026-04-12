import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { corrections, users, tasks, projects } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await db
    .select({
      id: corrections.id,
      tareaId: corrections.tareaId,
      detalles: corrections.detalles,
      inicioCiclo: corrections.inicioCiclo,
      vencimiento24h: corrections.vencimiento24h,
      cmId: corrections.cmId,
      cmNombre: users.nombre,
      tareaEstado: tasks.estado,
      proyectoTitulo: projects.titulo,
    })
    .from(corrections)
    .leftJoin(users, eq(corrections.cmId, users.id))
    .leftJoin(tasks, eq(corrections.tareaId, tasks.id))
    .leftJoin(projects, eq(tasks.proyectoId, projects.id))
    .orderBy(desc(corrections.inicioCiclo));

  return NextResponse.json(result);
}
