import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { alertasGlobales } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await db
    .select()
    .from(alertasGlobales)
    .where(eq(alertasGlobales.activa, true))
    .orderBy(desc(alertasGlobales.createdAt));

  return NextResponse.json(result);
}

// Desactivar una alerta global
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const result = await db
    .update(alertasGlobales)
    .set({ activa: false })
    .where(eq(alertasGlobales.id, id))
    .returning();

  return NextResponse.json(result[0]);
}
