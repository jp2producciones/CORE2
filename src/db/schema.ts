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
  cargo: text("cargo", {
    enum: ["FILMMAKER", "EDITOR", "COMMUNITY_MANAGER", "PROJECT_MANAGER", "HEAD_EDITING"],
  }),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Projects (Grabaciones) ────────────────────────────
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  titulo: text("titulo").notNull(),
  cliente: text("cliente").notNull(),
  pmId: text("pm_id").references(() => users.id),
  estadoGlobal: text("estado_global", {
    enum: ["ACTIVO", "PAUSADO", "FINALIZADO"],
  }).notNull().default("ACTIVO"),
  tipoProyecto: text("tipo_proyecto", {
    enum: ["PODCAST", "REELS", "LIVE", "CORPORATIVO", "OTRO"],
  }),
  fechaGrabacion: text("fecha_grabacion"),
  origen: text("origen", {
    enum: ["CALENDLY", "GOOGLE_CALENDAR", "MANUAL"],
  }).default("MANUAL"),
  externalEventId: text("external_event_id"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Entregables (reemplaza tasks) ─────────────────────
export const entregables = sqliteTable("entregables", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  proyectoId: text("proyecto_id").references(() => projects.id).notNull(),

  // Que es
  tipo: text("tipo", {
    enum: ["CAPITULO", "REEL", "LIVE_EDIT", "THUMBNAIL", "CORTE", "OTRO"],
  }).notNull(),
  cantidad: integer("cantidad").notNull().default(1),
  descripcion: text("descripcion"),

  // Quien
  editorId: text("editor_id").references(() => users.id),

  // Estado (maquina de estados)
  estado: text("estado", {
    enum: [
      "PENDIENTE_RESPALDO",
      "EN_RESPALDO",
      "RESPALDO_COMPLETO",
      "EN_EDICION",
      "EDICION_COMPLETA",
      "ENTREGA_INTERNA",
      "ENTREGA_EXTERNA",
      "EN_REVISION_CLIENTE",
      "APROBADO",
    ],
  }).notNull().default("PENDIENTE_RESPALDO"),

  // Fechas calculadas automaticamente
  fechaLimiteRespaldo: text("fecha_limite_respaldo"),
  fechaLimiteEdicion: text("fecha_limite_edicion"),
  fechaEntregaInterna: text("fecha_entrega_interna"),
  fechaEntregaExterna: text("fecha_entrega_externa"),
  fechaLimiteRevisionCliente: text("fecha_limite_revision_cliente"),

  // URLs y archivos
  videoUrl: text("video_url"),
  driveUrl: text("drive_url"),

  // Flags de correccion
  esCorreccion: integer("es_correccion", { mode: "boolean" }).default(false),
  entregableOriginalId: text("entregable_original_id"), // self-ref a entregables.id

  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Respaldos ─────────────────────────────────────────
export const respaldos = sqliteTable("respaldos", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  proyectoId: text("proyecto_id").references(() => projects.id).notNull(),

  // Quien respalda (por defecto el filmmaker, ej. Vicente)
  responsableId: text("responsable_id").references(() => users.id).notNull(),

  // Checklist de material
  tieneVideo: integer("tiene_video", { mode: "boolean" }).default(false),
  tieneAudio: integer("tiene_audio", { mode: "boolean" }).default(false),
  tieneImagenes: integer("tiene_imagenes", { mode: "boolean" }).default(false),
  videoRespaldado: integer("video_respaldado", { mode: "boolean" }).default(false),
  audioRespaldado: integer("audio_respaldado", { mode: "boolean" }).default(false),
  imagenesRespaldadas: integer("imagenes_respaldadas", { mode: "boolean" }).default(false),

  // Disco destino
  discoMadre: text("disco_madre"),
  discoSSD: text("disco_ssd"),
  editoraDestino: text("editora_destino"),

  // Estado
  estado: text("estado", {
    enum: ["PENDIENTE", "EN_PROGRESO", "DISCO_MADRE_OK", "SSD_OK", "COMPLETO", "VENCIDO"],
  }).notNull().default("PENDIENTE"),

  // Fechas
  fechaLimite: text("fecha_limite").notNull(),
  completadoAt: text("completado_at"),

  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Notificaciones ────────────────────────────────────
export const notificaciones = sqliteTable("notificaciones", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

  // A quien va
  destinatarioId: text("destinatario_id").references(() => users.id).notNull(),

  // Contenido
  mensaje: text("mensaje").notNull(),
  tipo: text("tipo", {
    enum: ["RECORDATORIO", "ALERTA", "ALERTA_GLOBAL", "CORRECCION", "ESTADO", "SISTEMA"],
  }).notNull(),

  // Referencia (a que se refiere)
  referenciaTabla: text("referencia_tabla"),
  referenciaId: text("referencia_id"),

  // Estado
  leida: integer("leida", { mode: "boolean" }).default(false),

  // Cuando se debe mostrar (para notificaciones programadas)
  programadaPara: text("programada_para"),

  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Alertas Globales ──────────────────────────────────
export const alertasGlobales = sqliteTable("alertas_globales", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  mensaje: text("mensaje").notNull(),
  tipo: text("tipo", {
    enum: ["RESPALDO_VENCIDO", "EDICION_VENCIDA", "ENTREGA_VENCIDA"],
  }).notNull(),
  referenciaTabla: text("referencia_tabla"),
  referenciaId: text("referencia_id"),
  activa: integer("activa", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Corrections (extendida) ───────────────────────────
export const corrections = sqliteTable("corrections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tareaId: text("tarea_id").references(() => tasks.id).notNull(), // legacy, se eliminara
  entregableId: text("entregable_id"),                             // nuevo, ref a entregables
  cmId: text("cm_id").references(() => users.id).notNull(),
  detalles: text("detalles").notNull(),
  inicioCiclo: text("inicio_ciclo").default(sql`(datetime('now'))`).notNull(),
  vencimiento24h: text("vencimiento_24h").notNull(),
});

// ── Tasks (DEPRECATED - se eliminara en secciones futuras) ──
// Mantenida temporalmente para que las APIs y paginas actuales
// sigan compilando hasta que se reescriban.
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
  tareaId: text("tarea_id"), // legacy ref
  proveedor: text("proveedor", {
    enum: ["CALENDLY", "GOOGLE_CALENDAR", "MANUAL"],
  }).notNull(),
  externalId: text("external_id").unique(),
  payloadRaw: text("payload_raw"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ── Type exports ───────────────────────────────────────

// Users
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = "PROJECT_MANAGER" | "HEAD_EDITING" | "EDITOR" | "COMMUNITY_MANAGER";
export type UserCargo = "FILMMAKER" | "EDITOR" | "COMMUNITY_MANAGER" | "PROJECT_MANAGER" | "HEAD_EDITING";

// Projects
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectStatus = "ACTIVO" | "PAUSADO" | "FINALIZADO";
export type TipoProyecto = "PODCAST" | "REELS" | "LIVE" | "CORPORATIVO" | "OTRO";

// Entregables (nuevo)
export type Entregable = typeof entregables.$inferSelect;
export type NewEntregable = typeof entregables.$inferInsert;
export type EntregableStatus =
  | "PENDIENTE_RESPALDO"
  | "EN_RESPALDO"
  | "RESPALDO_COMPLETO"
  | "EN_EDICION"
  | "EDICION_COMPLETA"
  | "ENTREGA_INTERNA"
  | "ENTREGA_EXTERNA"
  | "EN_REVISION_CLIENTE"
  | "APROBADO";
export type EntregableTipo = "CAPITULO" | "REEL" | "LIVE_EDIT" | "THUMBNAIL" | "CORTE" | "OTRO";

// Respaldos (nuevo)
export type Respaldo = typeof respaldos.$inferSelect;
export type NewRespaldo = typeof respaldos.$inferInsert;
export type RespaldoStatus = "PENDIENTE" | "EN_PROGRESO" | "DISCO_MADRE_OK" | "SSD_OK" | "COMPLETO" | "VENCIDO";

// Notificaciones (nuevo)
export type Notificacion = typeof notificaciones.$inferSelect;
export type NewNotificacion = typeof notificaciones.$inferInsert;
export type NotificacionTipo = "RECORDATORIO" | "ALERTA" | "ALERTA_GLOBAL" | "CORRECCION" | "ESTADO" | "SISTEMA";

// Alertas Globales (nuevo)
export type AlertaGlobal = typeof alertasGlobales.$inferSelect;
export type NewAlertaGlobal = typeof alertasGlobales.$inferInsert;
export type AlertaTipo = "RESPALDO_VENCIDO" | "EDICION_VENCIDA" | "ENTREGA_VENCIDA";

// Corrections
export type Correction = typeof corrections.$inferSelect;
export type NewCorrection = typeof corrections.$inferInsert;

// Events
export type Event = typeof events.$inferSelect;

// Tasks (DEPRECATED)
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskStatus = "PENDING_BACKUP" | "IN_EDITING" | "REVIEW_DIANE" | "CORRECTION_24H" | "APPROVED";
