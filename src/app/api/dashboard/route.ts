import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, corrections, projects, users } from "@/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq, sql, count } from "drizzle-orm";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Task counts by status
  const statusCounts = await db
    .select({
      estado: tasks.estado,
      count: count(),
    })
    .from(tasks)
    .groupBy(tasks.estado);

  // Total projects
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
    .from(tasks)
    .where(eq(tasks.estado, "APPROVED"));

  // Average lead time (creation to approval) in hours
  const leadTime = await db.all(sql`
    SELECT AVG(
      (julianday(updated_at) - julianday(created_at)) * 24
    ) as avg_hours
    FROM tasks
    WHERE estado = 'APPROVED'
  `);

  // Tasks per editor (bottleneck heatmap data)
  const editorLoad = await db
    .select({
      editorId: tasks.editorId,
      editorNombre: users.nombre,
      estado: tasks.estado,
      count: count(),
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.editorId, users.id))
    .where(sql`${tasks.editorId} IS NOT NULL`)
    .groupBy(tasks.editorId, users.nombre, tasks.estado);

  // Recent activity (last 30 days task counts by date)
  const recentActivity = await db.all(sql`
    SELECT date(created_at) as fecha, COUNT(*) as count
    FROM tasks
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY fecha
  `);

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
  });
}
