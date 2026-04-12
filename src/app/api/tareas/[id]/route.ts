import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, corrections, users } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { canTransition } from "@/lib/state-machine";
import { addBusinessHours } from "@/lib/format";
import type { TaskStatus, UserRole } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task.length) {
    return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  }

  const taskCorrections = await db
    .select({
      id: corrections.id,
      detalles: corrections.detalles,
      inicioCiclo: corrections.inicioCiclo,
      vencimiento24h: corrections.vencimiento24h,
      cmId: corrections.cmId,
      cmNombre: users.nombre,
    })
    .from(corrections)
    .leftJoin(users, eq(corrections.cmId, users.id))
    .where(eq(corrections.tareaId, id));

  return NextResponse.json({ ...task[0], correcciones: taskCorrections });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();

  // State transition
  if (body.nuevoEstado) {
    const task = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task.length) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    const currentState = task[0].estado as TaskStatus;
    const targetState = body.nuevoEstado as TaskStatus;
    const userRole = (body.userRole || "PROJECT_MANAGER") as UserRole;

    if (!canTransition(currentState, targetState, userRole)) {
      return NextResponse.json(
        { error: `Transición no permitida: ${currentState} → ${targetState} para rol ${userRole}` },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {
      estado: targetState,
      updatedAt: new Date().toISOString(),
    };

    if (body.editorId) updateData.editorId = body.editorId;
    if (body.videoUrl) updateData.videoUrl = body.videoUrl;

    await db.update(tasks).set(updateData).where(eq(tasks.id, id));

    // If transitioning to CORRECTION_24H, create correction record
    if (targetState === "CORRECTION_24H" && body.detalles) {
      const now = new Date();
      const expiry = addBusinessHours(now, 24);
      await db.insert(corrections).values({
        tareaId: id,
        cmId: body.cmId || "",
        detalles: body.detalles,
        vencimiento24h: expiry.toISOString(),
      });
    }

    const updated = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return NextResponse.json(updated[0]);
  }

  // Regular update
  const updateFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.descripcion !== undefined) updateFields.descripcion = body.descripcion;
  if (body.videoUrl !== undefined) updateFields.videoUrl = body.videoUrl;
  if (body.editorId !== undefined) updateFields.editorId = body.editorId;
  if (body.fechaLimite !== undefined) updateFields.fechaLimite = body.fechaLimite;

  const result = await db.update(tasks).set(updateFields).where(eq(tasks.id, id)).returning();
  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await db.delete(corrections).where(eq(corrections.tareaId, id));
  await db.delete(tasks).where(eq(tasks.id, id));
  return NextResponse.json({ success: true });
}
