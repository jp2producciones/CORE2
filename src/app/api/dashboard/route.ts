import { NextResponse } from "next/server";
import { db } from "@/db";
import { entregables, corrections, projects, users, respaldos } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, sql, count } from "drizzle-orm";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Entregable counts by status
  const statusCounts = await db
    .select({
      estado: entregables.estado,
      count: count(),
    })
    .from(entregables)
    .groupBy(entregables.estado);

  // Total projects by status
  const projectCounts = await db
    .select({
      estadoGlobal: projects.estadoGlobal,
      count: count(),
    })
    .from(projects)
    .groupBy(projects.estadoGlobal);

  // Correction stats
  const totalCorrections = await db.select({ count: count() }).from(corrections);
  const totalApproved = await db
    .select({ count: count() })
    .from(entregables)
    .where(eq(entregables.estado, "APROBADO"));

  // Average lead time (creation to approval) in hours
  const leadTime = await db.all(sql`
    SELECT AVG(
      (julianday(updated_at) - julianday(created_at)) * 24
    ) as avg_hours
    FROM entregables
    WHERE estado = 'APROBADO'
  `);

  // Entregables per editor (bottleneck heatmap data)
  const editorLoad = await db
    .select({
      editorId: entregables.editorId,
      editorNombre: users.nombre,
      estado: entregables.estado,
      count: count(),
    })
    .from(entregables)
    .leftJoin(users, eq(entregables.editorId, users.id))
    .where(sql`${entregables.editorId} IS NOT NULL`)
    .groupBy(entregables.editorId, users.nombre, entregables.estado);

  // Recent activity (last 30 days entregable counts by date)
  const recentActivity = await db.all(sql`
    SELECT date(created_at) as fecha, COUNT(*) as count
    FROM entregables
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY fecha
  `);

  // Respaldo stats
  const respaldoStats = await db
    .select({
      estado: respaldos.estado,
      count: count(),
    })
    .from(respaldos)
    .groupBy(respaldos.estado);

  const correctionRate =
    totalApproved[0].count > 0
      ? totalCorrections[0].count / (totalApproved[0].count + totalCorrections[0].count)
      : 0;

  return NextResponse.json({
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.estado, s.count])),
    projectCounts: Object.fromEntries(projectCounts.map((p) => [p.estadoGlobal, p.count])),
    totalCorrections: totalCorrections[0].count,
    totalApproved: totalApproved[0].count,
    correctionRate: Math.round(correctionRate * 100),
    avgLeadTimeHours: Math.round(((leadTime[0] as { avg_hours: number })?.avg_hours || 0) * 10) / 10,
    editorLoad,
    recentActivity,
    respaldoStats: Object.fromEntries(respaldoStats.map((r) => [r.estado, r.count])),
  });
}
