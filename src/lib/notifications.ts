import { db } from "@/db";
import { notificaciones, alertasGlobales } from "@/db/schema";
import type { NotificacionTipo, AlertaTipo } from "@/db/schema";

// ── Helpers para crear notificaciones programadas ─────

type NotifData = {
  destinatarioId: string;
  mensaje: string;
  tipo: NotificacionTipo;
  referenciaTabla: string;
  referenciaId: string;
  programadaPara: string;
};

/** Crea multiples notificaciones de una vez */
export async function createNotifications(items: NotifData[]) {
  if (items.length === 0) return;
  await db.insert(notificaciones).values(items);
}

/** Crea la cadena de 4 notificaciones de respaldo para el filmmaker */
export async function createRespaldoNotificationChain(opts: {
  destinatarioId: string;
  destinatarioNombre: string;
  proyectoTitulo: string;
  respaldoId: string;
  fechaLimite: string; // ISO datetime del deadline (grabacion + 24h)
}) {
  const { destinatarioId, destinatarioNombre, proyectoTitulo, respaldoId, fechaLimite } = opts;
  const deadline = new Date(fechaLimite);

  // T-24h: al crear (24 horas restantes)
  const t24h = new Date(deadline.getTime() - 24 * 60 * 60 * 1000);
  // T-12h: 12 horas restantes
  const t12h = new Date(deadline.getTime() - 12 * 60 * 60 * 1000);
  // T-6h: 6 horas restantes
  const t6h = new Date(deadline.getTime() - 6 * 60 * 60 * 1000);
  // T-3h: 3 horas restantes
  const t3h = new Date(deadline.getTime() - 3 * 60 * 60 * 1000);

  const items: NotifData[] = [
    {
      destinatarioId,
      mensaje: `Hola ${destinatarioNombre}, recuerda que tienes 24 horas para respaldar el material de ${proyectoTitulo}.`,
      tipo: "RECORDATORIO",
      referenciaTabla: "respaldos",
      referenciaId: respaldoId,
      programadaPara: t24h.toISOString(),
    },
    {
      destinatarioId,
      mensaje: `Hola ${destinatarioNombre}, te quedan 12 horas para respaldar ${proyectoTitulo}.`,
      tipo: "RECORDATORIO",
      referenciaTabla: "respaldos",
      referenciaId: respaldoId,
      programadaPara: t12h.toISOString(),
    },
    {
      destinatarioId,
      mensaje: `Hola ${destinatarioNombre}, te quedan 6 horas para respaldar ${proyectoTitulo}.`,
      tipo: "RECORDATORIO",
      referenciaTabla: "respaldos",
      referenciaId: respaldoId,
      programadaPara: t6h.toISOString(),
    },
    {
      destinatarioId,
      mensaje: `Hola ${destinatarioNombre}, te quedan 3 horas. Respalda ${proyectoTitulo} urgente.`,
      tipo: "RECORDATORIO",
      referenciaTabla: "respaldos",
      referenciaId: respaldoId,
      programadaPara: t3h.toISOString(),
    },
  ];

  await createNotifications(items);
}

/** Crea la cadena de notificaciones de revision de cliente (T-12h, T-6h, T-3h) */
export async function createRevisionClienteNotificationChain(opts: {
  destinatarioId: string;
  destinatarioNombre: string;
  clienteNombre: string;
  entregableTipo: string;
  entregableId: string;
  fechaLimiteRevision: string;
}) {
  const { destinatarioId, destinatarioNombre, clienteNombre, entregableTipo, entregableId, fechaLimiteRevision } = opts;
  const deadline = new Date(fechaLimiteRevision);

  const t12h = new Date(deadline.getTime() - 12 * 60 * 60 * 1000);
  const t6h = new Date(deadline.getTime() - 6 * 60 * 60 * 1000);
  const t3h = new Date(deadline.getTime() - 3 * 60 * 60 * 1000);

  const items: NotifData[] = [
    {
      destinatarioId,
      mensaje: `Hola ${destinatarioNombre}, han llegado correcciones de ${clienteNombre} para ${entregableTipo}? Avisame.`,
      tipo: "RECORDATORIO",
      referenciaTabla: "entregables",
      referenciaId: entregableId,
      programadaPara: t12h.toISOString(),
    },
    {
      destinatarioId,
      mensaje: `Hola ${destinatarioNombre}, correcciones de ${clienteNombre}? Quedan 6 horas.`,
      tipo: "RECORDATORIO",
      referenciaTabla: "entregables",
      referenciaId: entregableId,
      programadaPara: t6h.toISOString(),
    },
    {
      destinatarioId,
      mensaje: `Hola ${destinatarioNombre}, correcciones de ${clienteNombre}? Quedan 3 horas.`,
      tipo: "RECORDATORIO",
      referenciaTabla: "entregables",
      referenciaId: entregableId,
      programadaPara: t3h.toISOString(),
    },
  ];

  await createNotifications(items);
}

/** Crea una alerta global visible para todos */
export async function createAlertaGlobal(opts: {
  mensaje: string;
  tipo: AlertaTipo;
  referenciaTabla?: string;
  referenciaId?: string;
}) {
  await db.insert(alertasGlobales).values({
    mensaje: opts.mensaje,
    tipo: opts.tipo,
    referenciaTabla: opts.referenciaTabla || null,
    referenciaId: opts.referenciaId || null,
  });
}

/** Crea cadena de recordatorios diarios de edicion (7 dias habiles a las 17:50) */
export async function createEdicionDailyReminders(opts: {
  destinatarioId: string;
  destinatarioNombre: string;
  entregableTipo: string;
  clienteNombre: string;
  entregableId: string;
  fechaInicio: Date;
}) {
  const { destinatarioId, destinatarioNombre, entregableTipo, clienteNombre, entregableId, fechaInicio } = opts;
  const items: NotifData[] = [];

  // 7 dias habiles de recordatorios
  let currentDay = new Date(fechaInicio);
  for (let i = 1; i <= 7; i++) {
    // Avanzar al siguiente dia habil
    currentDay = new Date(currentDay);
    currentDay.setDate(currentDay.getDate() + 1);
    while (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // Recordatorio a las 17:50 Chile (UTC-4)
    const reminder = new Date(currentDay);
    reminder.setHours(21, 50, 0, 0); // 17:50 CLT = 21:50 UTC

    const diasRestantes = 7 - i;
    items.push({
      destinatarioId,
      mensaje: diasRestantes > 0
        ? `Hola ${destinatarioNombre}, te quedan ${diasRestantes} dias para completar ${entregableTipo} de ${clienteNombre}. Reporta tu avance.`
        : `Hola ${destinatarioNombre}, HOY es tu ultimo dia para completar ${entregableTipo} de ${clienteNombre}. Envia tu material.`,
      tipo: "RECORDATORIO",
      referenciaTabla: "entregables",
      referenciaId: entregableId,
      programadaPara: reminder.toISOString(),
    });
  }

  await createNotifications(items);
}

/** Crea una notificacion simple (no programada, inmediata) */
export async function createNotificacion(opts: {
  destinatarioId: string;
  mensaje: string;
  tipo: NotificacionTipo;
  referenciaTabla?: string;
  referenciaId?: string;
}) {
  await db.insert(notificaciones).values({
    destinatarioId: opts.destinatarioId,
    mensaje: opts.mensaje,
    tipo: opts.tipo,
    referenciaTabla: opts.referenciaTabla || null,
    referenciaId: opts.referenciaId || null,
    programadaPara: new Date().toISOString(), // inmediata
  });
}
