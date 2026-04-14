import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, tasks, users, entregables, respaldos, corrections } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, sql, desc } from "drizzle-orm";

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
      tipoProyecto: projects.tipoProyecto,
      fechaGrabacion: projects.fechaGrabacion,
      origen: projects.origen,
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

  // Entregables del proyecto
  const projectEntregables = await db
    .select({
      id: entregables.id,
      tipo: entregables.tipo,
      cantidad: entregables.cantidad,
      descripcion: entregables.descripcion,
      estado: entregables.estado,
      editorId: entregables.editorId,
      editorNombre: users.nombre,
      videoUrl: entregables.videoUrl,
      driveUrl: entregables.driveUrl,
      esCorreccion: entregables.esCorreccion,
      fechaLimiteEdicion: entregables.fechaLimiteEdicion,
      fechaLimiteRevisionCliente: entregables.fechaLimiteRevisionCliente,
      createdAt: entregables.createdAt,
      updatedAt: entregables.updatedAt,
      correcciones: sql<number>`(SELECT COUNT(*) FROM corrections WHERE corrections.entregable_id = ${entregables.id})`,
    })
    .from(entregables)
    .leftJoin(users, eq(entregables.editorId, users.id))
    .where(eq(entregables.proyectoId, id))
    .orderBy(desc(entregables.updatedAt));

  // Respaldo del proyecto
  const projectRespaldo = await db
    .select()
    .from(respaldos)
    .where(eq(respaldos.proyectoId, id))
    .limit(1);

  // Legacy: tareas para paginas antiguas
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

  return NextResponse.json({
    ...project[0],
    entregables: projectEntregables,
    respaldo: projectRespaldo[0] || null,
    tareas: projectTasks, // legacy
  });
}
