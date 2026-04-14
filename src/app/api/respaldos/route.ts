import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { respaldos, projects, users } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc, and, inArray } from "drizzle-orm";
import { createRespaldoNotificationChain, createAlertaGlobal } from "@/lib/notifications";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Marcar como VENCIDO los respaldos cuyo deadline ya paso y siguen pendientes
  const now = new Date().toISOString();
  const pendientes = await db
    .select({ id: respaldos.id, fechaLimite: respaldos.fechaLimite, estado: respaldos.estado })
    .from(respaldos)
    .where(inArray(respaldos.estado, ["PENDIENTE", "EN_PROGRESO", "DISCO_MADRE_OK", "SSD_OK"]));

  for (const r of pendientes) {
    if (r.fechaLimite < now && r.estado !== "VENCIDO") {
      await db.update(respaldos).set({ estado: "VENCIDO" }).where(eq(respaldos.id, r.id));
    }
  }

  const result = await db
    .select({
      id: respaldos.id,
      proyectoId: respaldos.proyectoId,
      responsableId: respaldos.responsableId,
      estado: respaldos.estado,
      fechaLimite: respaldos.fechaLimite,
      completadoAt: respaldos.completadoAt,
      discoMadre: respaldos.discoMadre,
      discoSSD: respaldos.discoSSD,
      editoraDestino: respaldos.editoraDestino,
      tieneVideo: respaldos.tieneVideo,
      tieneAudio: respaldos.tieneAudio,
      tieneImagenes: respaldos.tieneImagenes,
      videoRespaldado: respaldos.videoRespaldado,
      audioRespaldado: respaldos.audioRespaldado,
      imagenesRespaldadas: respaldos.imagenesRespaldadas,
      createdAt: respaldos.createdAt,
      proyectoTitulo: projects.titulo,
      proyectoCliente: projects.cliente,
      responsableNombre: users.nombre,
    })
    .from(respaldos)
    .leftJoin(projects, eq(respaldos.proyectoId, projects.id))
    .leftJoin(users, eq(respaldos.responsableId, users.id))
    .orderBy(desc(respaldos.createdAt));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { proyectoId, responsableId, fechaLimite } = body;

  if (!proyectoId || !responsableId || !fechaLimite) {
    return NextResponse.json(
      { error: "proyectoId, responsableId y fechaLimite son requeridos" },
      { status: 400 },
    );
  }

  // Crear el respaldo
  const result = await db
    .insert(respaldos)
    .values({
      proyectoId,
      responsableId,
      fechaLimite,
      tieneVideo: body.tieneVideo ?? false,
      tieneAudio: body.tieneAudio ?? false,
      tieneImagenes: body.tieneImagenes ?? false,
    })
    .returning();

  const respaldo = result[0];

  // Buscar datos para las notificaciones
  const [proyecto] = await db
    .select({ titulo: projects.titulo })
    .from(projects)
    .where(eq(projects.id, proyectoId));

  const [responsable] = await db
    .select({ nombre: users.nombre })
    .from(users)
    .where(eq(users.id, responsableId));

  // Crear cadena de notificaciones automaticas
  if (proyecto && responsable) {
    await createRespaldoNotificationChain({
      destinatarioId: responsableId,
      destinatarioNombre: responsable.nombre,
      proyectoTitulo: proyecto.titulo,
      respaldoId: respaldo.id,
      fechaLimite,
    });
  }

  return NextResponse.json(respaldo, { status: 201 });
}
