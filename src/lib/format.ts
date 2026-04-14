export function formatCLP(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 30) return `hace ${diffDays}d`;
  return formatDate(dateStr);
}

export function addBusinessHours(startDate: Date, hours: number): Date {
  const result = new Date(startDate);
  let remaining = hours;

  while (remaining > 0) {
    result.setHours(result.getHours() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }

  return result;
}

export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let remaining = days;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }

  return result;
}

export function hoursRemaining(deadline: string): number {
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.round(diffMs / 3600000));
}

export function daysRemaining(deadline: string): number {
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.round(diffMs / 86400000));
}
