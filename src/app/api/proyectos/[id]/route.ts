import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, tasks, users, corrections } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const project = await db
    .select({
      id: projects.id,
      titulo: projects.titulo,
      cliente: projects.cliente,
      pmId: projects.pmId,
      estadoGlobal: projects.estadoGlobal,
      createdAt: projects.createdAt,
      pmNombre: users.nombre,
    })
    .from(projects)
    .leftJoin(users, eq(projects.pmId, users.id))
    .where(eq(projects.id, id))
    .limit(1);

  if (!project.length) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const projectTasks = await db
    .select({
      id: tasks.id,
      estado: tasks.estado,
      descripcion: tasks.descripcion,
      videoUrl: tasks.videoUrl,
      fechaLimite: tasks.fechaLimite,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      editorId: tasks.editorId,
      editorNombre: users.nombre,
      correcciones: sql<number>`(SELECT COUNT(*) FROM corrections WHERE corrections.tarea_id = ${tasks.id})`,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.editorId, users.id))
    .where(eq(tasks.proyectoId, id));

  return NextResponse.json({ ...project[0], tareas: projectTasks });
}
