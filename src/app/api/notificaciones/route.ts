import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificaciones, users } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, and, lte, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const todas = searchParams.get("todas") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const now = new Date().toISOString();
  const conditions = [];

  // Solo mostrar notificaciones cuya fecha programada ya paso
  conditions.push(lte(notificaciones.programadaPara, now));

  // Filtrar por destinatario
  if (userId) {
    conditions.push(eq(notificaciones.destinatarioId, userId));
  }

  // Si no se pide "todas", solo las no leidas
  if (!todas) {
    conditions.push(eq(notificaciones.leida, false));
  }

  const result = await db
    .select({
      id: notificaciones.id,
      destinatarioId: notificaciones.destinatarioId,
      mensaje: notificaciones.mensaje,
      tipo: notificaciones.tipo,
      referenciaTabla: notificaciones.referenciaTabla,
      referenciaId: notificaciones.referenciaId,
      leida: notificaciones.leida,
      programadaPara: notificaciones.programadaPara,
      createdAt: notificaciones.createdAt,
      destinatarioNombre: users.nombre,
    })
    .from(notificaciones)
    .leftJoin(users, eq(notificaciones.destinatarioId, users.id))
    .where(and(...conditions))
    .orderBy(desc(notificaciones.programadaPara))
    .limit(limit);

  // Contar no leidas (para badge)
  const countConditions = [lte(notificaciones.programadaPara, now), eq(notificaciones.leida, false)];
  if (userId) countConditions.push(eq(notificaciones.destinatarioId, userId));

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notificaciones)
    .where(and(...countConditions));

  return NextResponse.json({
    notificaciones: result,
    noLeidas: countResult.count,
  });
}
