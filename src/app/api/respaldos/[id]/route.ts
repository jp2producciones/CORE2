import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { respaldos, projects, users, entregables } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { createAlertaGlobal, createNotificacion, createEdicionDailyReminders } from "@/lib/notifications";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

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
      fechaGrabacion: projects.fechaGrabacion,
      responsableNombre: users.nombre,
    })
    .from(respaldos)
    .leftJoin(projects, eq(respaldos.proyectoId, projects.id))
    .leftJoin(users, eq(respaldos.responsableId, users.id))
    .where(eq(respaldos.id, id));

  if (result.length === 0) {
    return NextResponse.json({ error: "Respaldo no encontrado" }, { status: 404 });
  }

  // Verificar si esta vencido
  const respaldo = result[0];
  const now = new Date().toISOString();
  if (
    respaldo.fechaLimite < now &&
    respaldo.estado !== "COMPLETO" &&
    respaldo.estado !== "VENCIDO"
  ) {
    await db.update(respaldos).set({ estado: "VENCIDO" }).where(eq(respaldos.id, id));
    respaldo.estado = "VENCIDO";

    // Crear alerta global
    await createAlertaGlobal({
      mensaje: `ALERTA: El material de ${respaldo.proyectoTitulo} no esta respaldado. Ya pasaron 24 horas. Responsable: ${respaldo.responsableNombre}.`,
      tipo: "RESPALDO_VENCIDO",
      referenciaTabla: "respaldos",
      referenciaId: id,
    });
  }

  return NextResponse.json(respaldo);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Obtener respaldo actual
  const [current] = await db
    .select()
    .from(respaldos)
    .where(eq(respaldos.id, id));

  if (!current) {
    return NextResponse.json({ error: "Respaldo no encontrado" }, { status: 404 });
  }

  // Construir el update
  const updateData: Record<string, unknown> = {};

  // Checklist items
  if (body.tieneVideo !== undefined) updateData.tieneVideo = body.tieneVideo;
  if (body.tieneAudio !== undefined) updateData.tieneAudio = body.tieneAudio;
  if (body.tieneImagenes !== undefined) updateData.tieneImagenes = body.tieneImagenes;
  if (body.videoRespaldado !== undefined) updateData.videoRespaldado = body.videoRespaldado;
  if (body.audioRespaldado !== undefined) updateData.audioRespaldado = body.audioRespaldado;
  if (body.imagenesRespaldadas !== undefined) updateData.imagenesRespaldadas = body.imagenesRespaldadas;

  // Disco info
  if (body.discoMadre !== undefined) updateData.discoMadre = body.discoMadre;
  if (body.discoSSD !== undefined) updateData.discoSSD = body.discoSSD;
  if (body.editoraDestino !== undefined) updateData.editoraDestino = body.editoraDestino;

  // Estado
  if (body.estado !== undefined) updateData.estado = body.estado;

  // Si el estado cambia a COMPLETO
  if (body.estado === "COMPLETO") {
    updateData.completadoAt = new Date().toISOString();

    // Obtener info del proyecto para notificaciones
    const [proyecto] = await db
      .select({ titulo: projects.titulo, pmId: projects.pmId })
      .from(projects)
      .where(eq(projects.id, current.proyectoId));

    // Cambiar todos los entregables del proyecto de PENDIENTE_RESPALDO a EN_EDICION
    const entregablesUpdate: Record<string, unknown> = {
      estado: "EN_EDICION",
      updatedAt: new Date().toISOString(),
    };

    // Si se indico un editor destino (como userId), asignar
    if (body.editorId) {
      entregablesUpdate.editorId = body.editorId;
    }

    await db
      .update(entregables)
      .set(entregablesUpdate)
      .where(eq(entregables.proyectoId, current.proyectoId));

    // Notificar al PM
    if (proyecto?.pmId) {
      await createNotificacion({
        destinatarioId: proyecto.pmId,
        mensaje: `El respaldo de ${proyecto.titulo} esta completo. Los entregables ya estan en edicion.`,
        tipo: "ESTADO",
        referenciaTabla: "respaldos",
        referenciaId: id,
      });
    }

    // Crear recordatorios diarios para la editora si fue asignada
    if (body.editorId) {
      const [editor] = await db
        .select({ nombre: users.nombre })
        .from(users)
        .where(eq(users.id, body.editorId));

      // Buscar entregables recien actualizados para crear recordatorios
      const updatedEntregables = await db
        .select({ id: entregables.id, tipo: entregables.tipo })
        .from(entregables)
        .where(eq(entregables.proyectoId, current.proyectoId));

      for (const ent of updatedEntregables) {
        await createEdicionDailyReminders({
          destinatarioId: body.editorId,
          destinatarioNombre: editor?.nombre || "Editora",
          entregableTipo: ent.tipo,
          clienteNombre: proyecto?.titulo || "proyecto",
          entregableId: ent.id,
          fechaInicio: new Date(),
        });
      }
    }
  }

  const result = await db
    .update(respaldos)
    .set(updateData)
    .where(eq(respaldos.id, id))
    .returning();

  return NextResponse.json(result[0]);
}
