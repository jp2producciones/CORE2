import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await db.select().from(users).orderBy(users.nombre);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await request.json();
  const result = await db.insert(users).values({
    email: body.email,
    nombre: body.nombre,
    rol: body.rol,
    cargo: body.cargo || null,
  }).returning();
  return NextResponse.json(result[0], { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await request.json();
  const result = await db.update(users)
    .set({ email: body.email, nombre: body.nombre, rol: body.rol, cargo: body.cargo })
    .where(eq(users.id, body.id))
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
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
