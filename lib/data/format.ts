const DISPLAY_DATE: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

export function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", DISPLAY_DATE).replace(",", " ·");
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;

  if (diffMs < 60_000) return "Just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function subtractHours(iso: string, hours: number): string {
  const date = new Date(iso);
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}
