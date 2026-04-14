import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificaciones } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";

// Marcar notificacion como leida
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const result = await db
    .update(notificaciones)
    .set({ leida: true })
    .where(eq(notificaciones.id, id))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Notificacion no encontrada" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}
