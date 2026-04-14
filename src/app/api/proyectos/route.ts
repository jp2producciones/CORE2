import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, tasks, entregables, respaldos } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";
import { addBusinessDays } from "@/lib/format";
import { createRespaldoNotificationChain } from "@/lib/notifications";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await db
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
      totalEntregables: sql<number>`(SELECT COUNT(*) FROM entregables WHERE entregables.proyecto_id = ${projects.id})`,
      entregablesAprobados: sql<number>`(SELECT COUNT(*) FROM entregables WHERE entregables.proyecto_id = ${projects.id} AND entregables.estado = 'APROBADO')`,
      // Legacy: mantener para paginas antiguas que aun usan tasks
      totalTareas: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.proyecto_id = ${projects.id})`,
      tareasAprobadas: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.proyecto_id = ${projects.id} AND tasks.estado = 'APPROVED')`,
    })
    .from(projects)
    .leftJoin(users, eq(projects.pmId, users.id))
    .orderBy(desc(projects.createdAt));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    titulo,
    cliente,
    pmId,
    tipoProyecto,
    fechaGrabacion,
    entregablesList, // [{tipo: "REEL", cantidad: 3}, {tipo: "CAPITULO", cantidad: 1}]
  } = body;

  if (!titulo || !cliente) {
    return NextResponse.json({ error: "titulo y cliente son requeridos" }, { status: 400 });
  }

  // 1. Crear el proyecto
  const [proyecto] = await db.insert(projects).values({
    titulo,
    cliente,
    pmId: pmId || null,
    estadoGlobal: "ACTIVO",
    tipoProyecto: tipoProyecto || null,
    fechaGrabacion: fechaGrabacion || null,
    origen: body.origen || "MANUAL",
    externalEventId: body.externalEventId || null,
  }).returning();

  // Calcular deadlines basados en fechaGrabacion
  const grabacion = fechaGrabacion ? new Date(fechaGrabacion) : new Date();
  const fechaLimiteRespaldo = new Date(grabacion.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const fechaLimiteEdicion = addBusinessDays(grabacion, 8).toISOString();   // +1 dia respaldo + 7 dias habiles edicion
  const fechaEntregaExternaLimite = addBusinessDays(grabacion, 10).toISOString(); // +1 respaldo + 9 dias habiles

  // 2. Crear entregables (si se especificaron)
  const createdEntregables = [];
  if (entregablesList && Array.isArray(entregablesList)) {
    for (const item of entregablesList) {
      const count = item.cantidad && item.cantidad > 1 ? item.cantidad : 1;
      for (let i = 0; i < count; i++) {
        const descripcion = count > 1
          ? `${item.descripcion || item.tipo} ${i + 1}`
          : (item.descripcion || null);

        const [entregable] = await db.insert(entregables).values({
          proyectoId: proyecto.id,
          tipo: item.tipo,
          cantidad: 1,
          descripcion,
          estado: "PENDIENTE_RESPALDO",
          fechaLimiteRespaldo,
          fechaLimiteEdicion,
          fechaEntregaExterna: fechaEntregaExternaLimite,
        }).returning();

        createdEntregables.push(entregable);
      }
    }
  }

  // 3. Auto-crear respaldo (buscar al filmmaker)
  let createdRespaldo = null;
  const [filmmaker] = await db
    .select({ id: users.id, nombre: users.nombre })
    .from(users)
    .where(eq(users.cargo, "FILMMAKER"));

  if (filmmaker) {
    const [respaldo] = await db.insert(respaldos).values({
      proyectoId: proyecto.id,
      responsableId: filmmaker.id,
      fechaLimite: fechaLimiteRespaldo,
    }).returning();

    createdRespaldo = respaldo;

    // 4. Programar cadena de notificaciones al filmmaker
    await createRespaldoNotificationChain({
      destinatarioId: filmmaker.id,
      destinatarioNombre: filmmaker.nombre,
      proyectoTitulo: titulo,
      respaldoId: respaldo.id,
      fechaLimite: fechaLimiteRespaldo,
    });
  }

  return NextResponse.json({
    proyecto,
    entregables: createdEntregables,
    respaldo: createdRespaldo,
  }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await request.json();
  const result = await db.update(projects)
    .set({
      titulo: body.titulo,
      cliente: body.cliente,
      pmId: body.pmId,
      estadoGlobal: body.estadoGlobal,
      tipoProyecto: body.tipoProyecto,
      fechaGrabacion: body.fechaGrabacion,
    })
    .where(eq(projects.id, body.id))
    .returning();
  return NextResponse.json(result[0]);
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  // Eliminar dependencias
  await db.delete(entregables).where(eq(entregables.proyectoId, id));
  await db.delete(respaldos).where(eq(respaldos.proyectoId, id));
  await db.delete(tasks).where(eq(tasks.proyectoId, id));
  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}
