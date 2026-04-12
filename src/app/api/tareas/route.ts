import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users, projects } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");
  const proyectoId = searchParams.get("proyecto_id");

  let query = db
    .select({
      id: tasks.id,
      proyectoId: tasks.proyectoId,
      editorId: tasks.editorId,
      estado: tasks.estado,
      fechaLimite: tasks.fechaLimite,
      videoUrl: tasks.videoUrl,
      descripcion: tasks.descripcion,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      editorNombre: users.nombre,
      proyectoTitulo: projects.titulo,
      proyectoCliente: projects.cliente,
      correcciones: sql<number>`(SELECT COUNT(*) FROM corrections WHERE corrections.tarea_id = ${tasks.id})`,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.editorId, users.id))
    .leftJoin(projects, eq(tasks.proyectoId, projects.id))
    .orderBy(desc(tasks.updatedAt))
    .$dynamic();

  if (estado) {
    query = query.where(eq(tasks.estado, estado as typeof tasks.estado.enumValues[number]));
  }
  if (proyectoId) {
    query = query.where(eq(tasks.proyectoId, proyectoId));
  }

  const result = await query;
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await request.json();
  const result = await db.insert(tasks).values({
    proyectoId: body.proyectoId,
    editorId: body.editorId || null,
    estado: body.estado || "PENDING_BACKUP",
    descripcion: body.descripcion || null,
    videoUrl: body.videoUrl || null,
    fechaLimite: body.fechaLimite || null,
  }).returning();
  return NextResponse.json(result[0], { status: 201 });
}
