import type {
  TaskStatus,
  UserRole,
  EntregableStatus,
  UserCargo,
  RespaldoStatus,
  EntregableTipo,
} from "@/db/schema";

// ════════════════════════════════════════════════════════
// NUEVO: Maquina de estados para Entregables
// ════════════════════════════════════════════════════════

type EntregableTransition = {
  from: EntregableStatus;
  to: EntregableStatus;
  allowedCargos: UserCargo[];
};

const ENTREGABLE_TRANSITIONS: EntregableTransition[] = [
  { from: "PENDIENTE_RESPALDO", to: "EN_RESPALDO",        allowedCargos: ["FILMMAKER", "PROJECT_MANAGER"] },
  { from: "EN_RESPALDO",        to: "RESPALDO_COMPLETO",  allowedCargos: ["FILMMAKER", "PROJECT_MANAGER"] },
  { from: "RESPALDO_COMPLETO",  to: "EN_EDICION",         allowedCargos: ["HEAD_EDITING", "PROJECT_MANAGER"] },
  { from: "EN_EDICION",         to: "EDICION_COMPLETA",   allowedCargos: ["EDITOR"] },
  { from: "EDICION_COMPLETA",   to: "ENTREGA_INTERNA",    allowedCargos: ["PROJECT_MANAGER", "COMMUNITY_MANAGER"] },
  { from: "ENTREGA_INTERNA",    to: "ENTREGA_EXTERNA",    allowedCargos: ["COMMUNITY_MANAGER"] },
  { from: "ENTREGA_EXTERNA",    to: "EN_REVISION_CLIENTE", allowedCargos: ["COMMUNITY_MANAGER"] },
  { from: "EN_REVISION_CLIENTE", to: "APROBADO",          allowedCargos: ["COMMUNITY_MANAGER"] },
];

/** Verifica si un cargo puede hacer la transicion de estado */
export function canEntregableTransition(
  currentState: EntregableStatus,
  targetState: EntregableStatus,
  userCargo: UserCargo,
): boolean {
  return ENTREGABLE_TRANSITIONS.some(
    (t) => t.from === currentState && t.to === targetState && t.allowedCargos.includes(userCargo),
  );
}

/** Retorna los estados disponibles segun cargo y estado actual */
export function getAvailableEntregableTransitions(
  currentState: EntregableStatus,
  userCargo: UserCargo,
): EntregableStatus[] {
  return ENTREGABLE_TRANSITIONS
    .filter((t) => t.from === currentState && t.allowedCargos.includes(userCargo))
    .map((t) => t.to);
}

/** Verifica si un cargo puede solicitar correccion (solo CM desde EN_REVISION_CLIENTE) */
export function canRequestCorrection(
  currentState: EntregableStatus,
  userCargo: UserCargo,
): boolean {
  return currentState === "EN_REVISION_CLIENTE" && userCargo === "COMMUNITY_MANAGER";
}

// ── Labels de estado de entregables ───────────────────
export const ENTREGABLE_STATUS_LABELS: Record<EntregableStatus, string> = {
  PENDIENTE_RESPALDO: "Pendiente Respaldo",
  EN_RESPALDO: "En Respaldo",
  RESPALDO_COMPLETO: "Respaldo Completo",
  EN_EDICION: "En Edicion",
  EDICION_COMPLETA: "Edicion Completa",
  ENTREGA_INTERNA: "Entrega Interna",
  ENTREGA_EXTERNA: "Entrega Externa",
  EN_REVISION_CLIENTE: "En Revision Cliente",
  APROBADO: "Aprobado",
};

// ── Colores de estado de entregables ──────────────────
export const ENTREGABLE_STATUS_COLORS: Record<EntregableStatus, { bg: string; text: string }> = {
  PENDIENTE_RESPALDO: { bg: "bg-yellow-100", text: "text-yellow-700" },
  EN_RESPALDO:        { bg: "bg-yellow-100", text: "text-yellow-700" },
  RESPALDO_COMPLETO:  { bg: "bg-blue-100",   text: "text-blue-700" },
  EN_EDICION:         { bg: "bg-blue-100",    text: "text-blue-700" },
  EDICION_COMPLETA:   { bg: "bg-purple-100",  text: "text-purple-700" },
  ENTREGA_INTERNA:    { bg: "bg-purple-100",  text: "text-purple-700" },
  ENTREGA_EXTERNA:    { bg: "bg-purple-100",  text: "text-purple-700" },
  EN_REVISION_CLIENTE: { bg: "bg-purple-100", text: "text-purple-700" },
  APROBADO:           { bg: "bg-green-100",   text: "text-green-700" },
};

// ── Labels de tipo de entregable ──────────────────────
export const ENTREGABLE_TIPO_LABELS: Record<EntregableTipo, string> = {
  CAPITULO: "Capitulo",
  REEL: "Reel",
  LIVE_EDIT: "Live Edit",
  THUMBNAIL: "Thumbnail",
  CORTE: "Corte",
  OTRO: "Otro",
};

// ── Labels y colores de estado de respaldo ────────────
export const RESPALDO_STATUS_LABELS: Record<RespaldoStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En Progreso",
  DISCO_MADRE_OK: "Disco Madre OK",
  SSD_OK: "SSD OK",
  COMPLETO: "Completo",
  VENCIDO: "Vencido",
};

export const RESPALDO_STATUS_COLORS: Record<RespaldoStatus, { bg: string; text: string }> = {
  PENDIENTE:     { bg: "bg-yellow-100", text: "text-yellow-700" },
  EN_PROGRESO:   { bg: "bg-blue-100",   text: "text-blue-700" },
  DISCO_MADRE_OK: { bg: "bg-blue-100",  text: "text-blue-700" },
  SSD_OK:        { bg: "bg-blue-100",    text: "text-blue-700" },
  COMPLETO:      { bg: "bg-green-100",   text: "text-green-700" },
  VENCIDO:       { bg: "bg-red-100",     text: "text-red-700" },
};

// ── Labels de proyecto ────────────────────────────────
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVO: "Activo",
  PAUSADO: "Pausado",
  FINALIZADO: "Finalizado",
};

export const TIPO_PROYECTO_LABELS: Record<string, string> = {
  PODCAST: "Podcast",
  REELS: "Reels",
  LIVE: "Live",
  CORPORATIVO: "Corporativo",
  OTRO: "Otro",
};

// ════════════════════════════════════════════════════════
// LEGACY: Maquina de estados para Tasks (DEPRECATED)
// Se mantiene para que las paginas/APIs actuales compilen.
// Se eliminara cuando se reescriban.
// ════════════════════════════════════════════════════════

type Transition = {
  from: TaskStatus;
  to: TaskStatus;
  allowedRoles: UserRole[];
};

const TRANSITIONS: Transition[] = [
  { from: "PENDING_BACKUP", to: "IN_EDITING", allowedRoles: ["HEAD_EDITING", "PROJECT_MANAGER"] },
  { from: "IN_EDITING", to: "REVIEW_DIANE", allowedRoles: ["EDITOR"] },
  { from: "REVIEW_DIANE", to: "APPROVED", allowedRoles: ["COMMUNITY_MANAGER"] },
  { from: "REVIEW_DIANE", to: "CORRECTION_24H", allowedRoles: ["COMMUNITY_MANAGER"] },
  { from: "CORRECTION_24H", to: "REVIEW_DIANE", allowedRoles: ["EDITOR"] },
];

export function canTransition(
  currentState: TaskStatus,
  targetState: TaskStatus,
  userRole: UserRole,
): boolean {
  return TRANSITIONS.some(
    (t) => t.from === currentState && t.to === targetState && t.allowedRoles.includes(userRole),
  );
}

export function getAvailableTransitions(
  currentState: TaskStatus,
  userRole: UserRole,
): TaskStatus[] {
  return TRANSITIONS
    .filter((t) => t.from === currentState && t.allowedRoles.includes(userRole))
    .map((t) => t.to);
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING_BACKUP: "Pendiente Backup",
  IN_EDITING: "En Edicion",
  REVIEW_DIANE: "Revision CM",
  CORRECTION_24H: "Correccion 24h",
  APPROVED: "Aprobado",
};

export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  PENDING_BACKUP: { bg: "bg-[#FEF3C7]", text: "text-[#D97706]" },
  IN_EDITING:     { bg: "bg-[#DBEAFE]", text: "text-[#2563EB]" },
  REVIEW_DIANE:   { bg: "bg-[#EDE9FE]", text: "text-[#7C3AED]" },
  CORRECTION_24H: { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]" },
  APPROVED:       { bg: "bg-[#ECFDF5]", text: "text-[#059669]" },
};
