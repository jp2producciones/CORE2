import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Users ──────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  rol: text("rol", {
    enum: ["PROJECT_MANAGER", "HEAD_EDITING", "EDITOR", "COMMUNITY_MANAGER"],
  }).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Projects ───────────────────────────────────────────
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  titulo: text("titulo").notNull(),
  cliente: text("cliente").notNull(),
  pmId: text("pm_id").references(() => users.id),
  estadoGlobal: text("estado_global", {
    enum: ["ACTIVO", "PAUSADO", "FINALIZADO"],
  }).notNull().default("ACTIVO"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Tasks ──────────────────────────────────────────────
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  proyectoId: text("proyecto_id").references(() => projects.id).notNull(),
  editorId: text("editor_id").references(() => users.id),
  estado: text("estado", {
    enum: [
      "PENDING_BACKUP",
      "IN_EDITING",
      "REVIEW_DIANE",
      "CORRECTION_24H",
      "APPROVED",
    ],
  }).notNull().default("PENDING_BACKUP"),
  fechaLimite: text("fecha_limite"),
  videoUrl: text("video_url"),
  descripcion: text("descripcion"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Events (webhook ingestion audit) ───────────────────
export const events = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tareaId: text("tarea_id").references(() => tasks.id),
  proveedor: text("proveedor", {
    enum: ["CALENDLY", "GOOGLE_CALENDAR", "MANUAL"],
  }).notNull(),
  externalId: text("external_id").unique(),
  payloadRaw: text("payload_raw"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Corrections ────────────────────────────────────────
export const corrections = sqliteTable("corrections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tareaId: text("tarea_id").references(() => tasks.id).notNull(),
  cmId: text("cm_id").references(() => users.id).notNull(),
  detalles: text("detalles").notNull(),
  inicioCiclo: text("inicio_ciclo").default(sql`(datetime('now'))`).notNull(),
  vencimiento24h: text("vencimiento_24h").notNull(),
});

// ── Type exports ───────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Correction = typeof corrections.$inferSelect;
export type NewCorrection = typeof corrections.$inferInsert;
export type Event = typeof events.$inferSelect;

export type UserRole = "PROJECT_MANAGER" | "HEAD_EDITING" | "EDITOR" | "COMMUNITY_MANAGER";
export type TaskStatus = "PENDING_BACKUP" | "IN_EDITING" | "REVIEW_DIANE" | "CORRECTION_24H" | "APPROVED";
export type ProjectStatus = "ACTIVO" | "PAUSADO" | "FINALIZADO";
