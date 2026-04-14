import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entregables, projects, users } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc, and, sql } from "drizzle-orm";
import { createNotificacion, createAlertaGlobal } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Auto-aprobacion: si EN_REVISION_CLIENTE y paso la fecha limite → APROBADO
  const now = new Date().toISOString();
  const enRevision = await db
    .select({ id: entregables.id, fechaLimiteRevisionCliente: entregables.fechaLimiteRevisionCliente, proyectoId: entregables.proyectoId })
    .from(entregables)
    .where(eq(entregables.estado, "EN_REVISION_CLIENTE"));

  for (const e of enRevision) {
    if (e.fechaLimiteRevisionCliente && e.fechaLimiteRevisionCliente < now) {
      await db
        .update(entregables)
        .set({ estado: "APROBADO", updatedAt: now })
        .where(eq(entregables.id, e.id));

      // Notificar al PM
      const [proyecto] = await db
        .select({ pmId: projects.pmId, titulo: projects.titulo })
        .from(projects)
        .where(eq(projects.id, e.proyectoId));

      if (proyecto?.pmId) {
        await createNotificacion({
          destinatarioId: proyecto.pmId,
          mensaje: `Entregable de ${proyecto.titulo} aprobado automaticamente (24h sin correcciones del cliente).`,
          tipo: "SISTEMA",
          referenciaTabla: "entregables",
          referenciaId: e.id,
        });
      }
    }
  }

  // Correcciones vencidas: EN_EDICION + esCorreccion + fechaLimiteEdicion pasada → alerta global
  const correccionesEnEdicion = await db
    .select({
      id: entregables.id,
      fechaLimiteEdicion: entregables.fechaLimiteEdicion,
      proyectoId: entregables.proyectoId,
      tipo: entregables.tipo,
      editorId: entregables.editorId,
    })
    .from(entregables)
    .where(and(eq(entregables.estado, "EN_EDICION"), eq(entregables.esCorreccion, true)));

  for (const c of correccionesEnEdicion) {
    if (c.fechaLimiteEdicion && c.fechaLimiteEdicion < now) {
      const [proyecto] = await db
        .select({ titulo: projects.titulo, cliente: projects.cliente, pmId: projects.pmId })
        .from(projects)
        .where(eq(projects.id, c.proyectoId));

      const editorNombre = c.editorId
        ? (await db.select({ nombre: users.nombre }).from(users).where(eq(users.id, c.editorId)))[0]?.nombre
        : "Sin asignar";

      await createAlertaGlobal({
        mensaje: `ALERTA: Correccion vencida de ${c.tipo} para ${proyecto?.cliente || "cliente"}. Editor: ${editorNombre}. Ya pasaron las 24 horas.`,
        tipo: "EDICION_VENCIDA",
        referenciaTabla: "entregables",
        referenciaId: c.id,
      });

      // Notificar al PM
      if (proyecto?.pmId) {
        await createNotificacion({
          destinatarioId: proyecto.pmId,
          mensaje: `Correccion vencida: ${editorNombre} no completo la correccion de ${c.tipo} de ${proyecto.cliente} en 24 horas.`,
          tipo: "ALERTA",
          referenciaTabla: "entregables",
          referenciaId: c.id,
        });
      }
    }
  }

  const { searchParams } = new URL(request.url);
  const editorId = searchParams.get("editorId");
  const proyectoId = searchParams.get("proyectoId");
  const estado = searchParams.get("estado");

  const conditions = [];
  if (editorId) conditions.push(eq(entregables.editorId, editorId));
  if (proyectoId) conditions.push(eq(entregables.proyectoId, proyectoId));
  if (estado) conditions.push(eq(entregables.estado, estado as typeof entregables.estado.enumValues[number]));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
      // Joins
      proyectoTitulo: projects.titulo,
      proyectoCliente: projects.cliente,
      editorNombre: users.nombre,
    })
    .from(entregables)
    .leftJoin(projects, eq(entregables.proyectoId, projects.id))
    .leftJoin(users, eq(entregables.editorId, users.id))
    .where(whereClause)
    .orderBy(desc(entregables.updatedAt));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { proyectoId, tipo, cantidad, descripcion, editorId } = body;

  if (!proyectoId || !tipo) {
    return NextResponse.json(
      { error: "proyectoId y tipo son requeridos" },
      { status: 400 },
    );
  }

  // Si cantidad > 1, crear multiples registros individuales
  const count = cantidad && cantidad > 1 ? cantidad : 1;
  const created = [];

  for (let i = 0; i < count; i++) {
    const desc = count > 1 ? `${descripcion || tipo} ${i + 1}` : (descripcion || null);

    const result = await db
      .insert(entregables)
      .values({
        proyectoId,
        tipo,
        cantidad: 1, // cada fila es 1 unidad
        descripcion: desc,
        editorId: editorId || null,
        estado: "PENDIENTE_RESPALDO",
        fechaLimiteRespaldo: body.fechaLimiteRespaldo || null,
        fechaLimiteEdicion: body.fechaLimiteEdicion || null,
        fechaEntregaInterna: body.fechaEntregaInterna || null,
        fechaEntregaExterna: body.fechaEntregaExterna || null,
      })
      .returning();

    created.push(result[0]);
  }

  return NextResponse.json(created, { status: 201 });
}
