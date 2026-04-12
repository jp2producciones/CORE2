import type { TaskStatus, UserRole } from "@/db/schema";

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
  userRole: UserRole
): boolean {
  return TRANSITIONS.some(
    (t) => t.from === currentState && t.to === targetState && t.allowedRoles.includes(userRole)
  );
}

export function getAvailableTransitions(
  currentState: TaskStatus,
  userRole: UserRole
): TaskStatus[] {
  return TRANSITIONS
    .filter((t) => t.from === currentState && t.allowedRoles.includes(userRole))
    .map((t) => t.to);
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING_BACKUP: "Pendiente Backup",
  IN_EDITING: "En Edición",
  REVIEW_DIANE: "Revisión CM",
  CORRECTION_24H: "Corrección 24h",
  APPROVED: "Aprobado",
};

export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  PENDING_BACKUP: { bg: "bg-[#FEF3C7]", text: "text-[#D97706]" },
  IN_EDITING: { bg: "bg-[#DBEAFE]", text: "text-[#2563EB]" },
  REVIEW_DIANE: { bg: "bg-[#EDE9FE]", text: "text-[#7C3AED]" },
  CORRECTION_24H: { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]" },
  APPROVED: { bg: "bg-[#ECFDF5]", text: "text-[#059669]" },
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVO: "Activo",
  PAUSADO: "Pausado",
  FINALIZADO: "Finalizado",
};
