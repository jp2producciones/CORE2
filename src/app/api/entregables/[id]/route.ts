import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  entregables,
  projects,
  users,
  corrections,
} from "@/db/schema";
import type { EntregableStatus, UserCargo } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import {
  canEntregableTransition,
  canRequestCorrection,
} from "@/lib/state-machine";
import { addBusinessHours } from "@/lib/format";
import {
  createNotificacion,
  createAlertaGlobal,
  createRevisionClienteNotificationChain,
} from "@/lib/notifications";

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
      id: entregables.id,
      proyectoId: entregables.proyectoId,
      tipo: entregables.tipo,
      cantidad: entregables.cantidad,
      descripcion: entregables.descripcion,
      editorId: entregables.editorId,
      estado: entregables.estado,
      fechaLimiteRespaldo: entregables.fechaLimiteRespaldo,
      fechaLimiteEdicion: entregables.fechaLimiteEdicion,
      fechaEntregaInterna: entregables.fechaEntregaInterna,
      fechaEntregaExterna: entregables.fechaEntregaExterna,
      fechaLimiteRevisionCliente: entregables.fechaLimiteRevisionCliente,
      videoUrl: entregables.videoUrl,
      driveUrl: entregables.driveUrl,
      esCorreccion: entregables.esCorreccion,
      entregableOriginalId: entregables.entregableOriginalId,
      createdAt: entregables.createdAt,
      updatedAt: entregables.updatedAt,
      proyectoTitulo: projects.titulo,
      proyectoCliente: projects.cliente,
      editorNombre: users.nombre,
    })
    .from(entregables)
    .leftJoin(projects, eq(entregables.proyectoId, projects.id))
    .leftJoin(users, eq(entregables.editorId, users.id))
    .where(eq(entregables.id, id));

  if (result.length === 0) {
    return NextResponse.json({ error: "Entregable no encontrado" }, { status: 404 });
  }

  const entregable = result[0];

  // Traer correcciones asociadas
  const correccionesList = await db
    .select({
      id: corrections.id,
      detalles: corrections.detalles,
      inicioCiclo: corrections.inicioCiclo,
      vencimiento24h: corrections.vencimiento24h,
      cmNombre: users.nombre,
    })
    .from(corrections)
    .leftJoin(users, eq(corrections.cmId, users.id))
    .where(eq(corrections.entregableId, id))
    .orderBy(desc(corrections.inicioCiclo));

  // Traer entregables de correccion derivados
  const correccionesEntregables = await db
    .select({
      id: entregables.id,
      estado: entregables.estado,
      fechaLimiteEdicion: entregables.fechaLimiteEdicion,
      createdAt: entregables.createdAt,
    })
    .from(entregables)
    .where(eq(entregables.entregableOriginalId, id))
    .orderBy(desc(entregables.createdAt));

  return NextResponse.json({
    ...entregable,
    correcciones: correccionesList,
    correccionesEntregables,
  });
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

  // Obtener entregable actual
  const [current] = await db
    .select()
    .from(entregables)
    .where(eq(entregables.id, id));

  if (!current) {
    return NextResponse.json({ error: "Entregable no encontrado" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  // Campos editables directos
  if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
  if (body.editorId !== undefined) updateData.editorId = body.editorId || null;
  if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
  if (body.driveUrl !== undefined) updateData.driveUrl = body.driveUrl;

  // ── Transicion de estado ──────────────────────────────
  if (body.nuevoEstado && body.userCargo) {
    const nuevoEstado = body.nuevoEstado as EntregableStatus;
    const userCargo = body.userCargo as UserCargo;

    // Caso especial: correccion (crea nuevo entregable, no cambia el actual)
    if (body.esCorreccion) {
      return await handleCorrection(id, current, body);
    }

    // Validar transicion
    if (!canEntregableTransition(current.estado as EntregableStatus, nuevoEstado, userCargo)) {
      return NextResponse.json(
        { error: `Transicion no permitida: ${current.estado} → ${nuevoEstado} para cargo ${userCargo}` },
        { status: 403 },
      );
    }

    updateData.estado = nuevoEstado;

    // Guardar driveUrl/videoUrl si se envian con la transicion
    if (body.driveUrl) updateData.driveUrl = body.driveUrl;
    if (body.videoUrl) updateData.videoUrl = body.videoUrl;

    // Timestamps de entrega
    if (nuevoEstado === "ENTREGA_INTERNA") {
      updateData.fechaEntregaInterna = new Date().toISOString();
    }
    if (nuevoEstado === "ENTREGA_EXTERNA") {
      updateData.fechaEntregaExterna = new Date().toISOString();
    }

    // Obtener info del proyecto
    const [proyecto] = await db
      .select({ titulo: projects.titulo, cliente: projects.cliente, pmId: projects.pmId })
      .from(projects)
      .where(eq(projects.id, current.proyectoId));

    // Acciones automaticas segun transicion
    await handleTransitionSideEffects(
      nuevoEstado,
      current,
      proyecto,
      id,
      body,
    );
  }

  const result = await db
    .update(entregables)
    .set(updateData)
    .where(eq(entregables.id, id))
    .returning();

  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(entregables).where(eq(entregables.id, id));
  return NextResponse.json({ success: true });
}

// ── Helpers ─────────────────────────────────────────────

async function handleTransitionSideEffects(
  nuevoEstado: EntregableStatus,
  current: typeof entregables.$inferSelect,
  proyecto: { titulo: string; cliente: string; pmId: string | null } | undefined,
  entregableId: string,
  body: Record<string, unknown>,
) {
  if (!proyecto) return;

  // ENTREGA_INTERNA → notificar al PM que el material esta listo internamente
  if (nuevoEstado === "ENTREGA_INTERNA") {
    if (proyecto.pmId) {
      await createNotificacion({
        destinatarioId: proyecto.pmId,
        mensaje: `${current.tipo} de ${proyecto.cliente} esta en entrega interna. Listo para revision antes de enviar al cliente.`,
        tipo: "ESTADO",
        referenciaTabla: "entregables",
        referenciaId: entregableId,
      });
    }
  }

  // ENTREGA_EXTERNA → notificar al PM que el material se envio al cliente
  if (nuevoEstado === "ENTREGA_EXTERNA") {
    if (proyecto.pmId) {
      await createNotificacion({
        destinatarioId: proyecto.pmId,
        mensaje: `${current.tipo} de ${proyecto.cliente} fue entregado al cliente. Comienza revision de 24 horas.`,
        tipo: "ESTADO",
        referenciaTabla: "entregables",
        referenciaId: entregableId,
      });
    }
  }

  // APROBADO → notificar a todos los involucrados
  if (nuevoEstado === "APROBADO") {
    // Notificar al editor
    if (current.editorId) {
      await createNotificacion({
        destinatarioId: current.editorId,
        mensaje: `${current.tipo} de ${proyecto.cliente} fue APROBADO. Buen trabajo!`,
        tipo: "ESTADO",
        referenciaTabla: "entregables",
        referenciaId: entregableId,
      });
    }
    // Notificar al PM
    if (proyecto.pmId) {
      await createNotificacion({
        destinatarioId: proyecto.pmId,
        mensaje: `${current.tipo} de ${proyecto.cliente} fue APROBADO por el cliente.`,
        tipo: "ESTADO",
        referenciaTabla: "entregables",
        referenciaId: entregableId,
      });
    }
  }

  // EDICION_COMPLETA → notificar a Diane y PM
  if (nuevoEstado === "EDICION_COMPLETA") {
    // Buscar al CM (Diane)
    const cms = await db
      .select({ id: users.id, nombre: users.nombre })
      .from(users)
      .where(eq(users.cargo, "COMMUNITY_MANAGER"));

    const editorName = current.editorId
      ? (await db.select({ nombre: users.nombre }).from(users).where(eq(users.id, current.editorId)))[0]?.nombre
      : "Sin asignar";

    for (const cm of cms) {
      await createNotificacion({
        destinatarioId: cm.id,
        mensaje: `La editora ${editorName} completo ${current.tipo} de ${proyecto.cliente}. Listo para entrega al cliente.`,
        tipo: "ESTADO",
        referenciaTabla: "entregables",
        referenciaId: entregableId,
      });
    }

    if (proyecto.pmId) {
      await createNotificacion({
        destinatarioId: proyecto.pmId,
        mensaje: `La editora ${editorName} completo ${current.tipo} de ${proyecto.cliente}. Listo para entrega.`,
        tipo: "ESTADO",
        referenciaTabla: "entregables",
        referenciaId: entregableId,
      });
    }
  }

  // ENTREGA_EXTERNA → Diane sube material, inicia revision cliente 24h
  if (nuevoEstado === "ENTREGA_EXTERNA") {
    // Setear fecha limite de revision (ahora + 24h)
    const fechaLimiteRevision = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db
      .update(entregables)
      .set({ fechaLimiteRevisionCliente: fechaLimiteRevision })
      .where(eq(entregables.id, entregableId));
  }

  // EN_REVISION_CLIENTE → programar recordatorios a Diane
  if (nuevoEstado === "EN_REVISION_CLIENTE") {
    const fechaLimiteRevision = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db
      .update(entregables)
      .set({ fechaLimiteRevisionCliente: fechaLimiteRevision })
      .where(eq(entregables.id, entregableId));

    // Buscar a Diane (CM)
    const cms = await db
      .select({ id: users.id, nombre: users.nombre })
      .from(users)
      .where(eq(users.cargo, "COMMUNITY_MANAGER"));

    for (const cm of cms) {
      await createRevisionClienteNotificationChain({
        destinatarioId: cm.id,
        destinatarioNombre: cm.nombre,
        clienteNombre: proyecto.cliente,
        entregableTipo: current.tipo,
        entregableId,
        fechaLimiteRevision,
      });
    }
  }
}

async function handleCorrection(
  entregableId: string,
  current: typeof entregables.$inferSelect,
  body: Record<string, unknown>,
) {
  const detalles = body.detalles as string;
  const cmId = body.cmId as string;

  if (!detalles || !cmId) {
    return NextResponse.json(
      { error: "detalles y cmId son requeridos para correcciones" },
      { status: 400 },
    );
  }

  // Verificar que el estado actual permite correccion
  if (current.estado !== "EN_REVISION_CLIENTE") {
    return NextResponse.json(
      { error: "Solo se pueden solicitar correcciones desde EN_REVISION_CLIENTE" },
      { status: 403 },
    );
  }

  // Obtener info del proyecto
  const [proyecto] = await db
    .select({ titulo: projects.titulo, cliente: projects.cliente, pmId: projects.pmId })
    .from(projects)
    .where(eq(projects.id, current.proyectoId));

  // 1. Crear NUEVO entregable de correccion
  const fechaLimiteEdicion = addBusinessHours(new Date(), 24).toISOString();

  const [nuevoEntregable] = await db
    .insert(entregables)
    .values({
      proyectoId: current.proyectoId,
      tipo: current.tipo,
      cantidad: 1,
      descripcion: `${current.descripcion || current.tipo} — CORRECCION`,
      editorId: current.editorId,
      estado: "EN_EDICION",
      esCorreccion: true,
      entregableOriginalId: entregableId,
      fechaLimiteEdicion,
    })
    .returning();

  // 2. Crear registro en corrections
  await db.insert(corrections).values({
    tareaId: "legacy", // campo legacy requerido por notNull
    entregableId: nuevoEntregable.id,
    cmId,
    detalles,
    vencimiento24h: fechaLimiteEdicion,
  });

  // 3. Notificar a la editora
  if (current.editorId) {
    const [editor] = await db
      .select({ nombre: users.nombre })
      .from(users)
      .where(eq(users.id, current.editorId));

    await createNotificacion({
      destinatarioId: current.editorId,
      mensaje: `Se genero una correccion para ${current.tipo} de ${proyecto?.cliente || "cliente"}. Tienes 24 horas para resolverlo. Correcciones: ${detalles}`,
      tipo: "CORRECCION",
      referenciaTabla: "entregables",
      referenciaId: nuevoEntregable.id,
    });
  }

  // 4. Notificar a HEAD_EDITING
  const headsEditing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cargo, "HEAD_EDITING"));

  for (const he of headsEditing) {
    await createNotificacion({
      destinatarioId: he.id,
      mensaje: `Correccion solicitada para ${current.tipo} de ${proyecto?.cliente || "cliente"}. Editor: ${current.editorId ? "asignado" : "sin asignar"}. Detalles: ${detalles}`,
      tipo: "CORRECCION",
      referenciaTabla: "entregables",
      referenciaId: nuevoEntregable.id,
    });
  }

  // 5. Notificar al PM
  if (proyecto?.pmId) {
    const editorNombre = current.editorId
      ? (await db.select({ nombre: users.nombre }).from(users).where(eq(users.id, current.editorId)))[0]?.nombre
      : "Sin asignar";

    const [cm] = await db
      .select({ nombre: users.nombre })
      .from(users)
      .where(eq(users.id, cmId));

    await createNotificacion({
      destinatarioId: proyecto.pmId,
      mensaje: `${cm?.nombre || "CM"} reporto correcciones para ${current.tipo} de ${proyecto.cliente}. La editora ${editorNombre} tiene 24 horas.`,
      tipo: "CORRECCION",
      referenciaTabla: "entregables",
      referenciaId: nuevoEntregable.id,
    });
  }

  return NextResponse.json({
    original: entregableId,
    correccion: nuevoEntregable,
    message: "Correccion creada exitosamente",
  }, { status: 201 });
}
