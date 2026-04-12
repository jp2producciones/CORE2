import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, tasks } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";

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
      createdAt: projects.createdAt,
      pmNombre: users.nombre,
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
  const result = await db.insert(projects).values({
    titulo: body.titulo,
    cliente: body.cliente,
    pmId: body.pmId || null,
    estadoGlobal: body.estadoGlobal || "ACTIVO",
  }).returning();
  return NextResponse.json(result[0], { status: 201 });
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

  // Delete related tasks first
  await db.delete(tasks).where(eq(tasks.proyectoId, id));
  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}
