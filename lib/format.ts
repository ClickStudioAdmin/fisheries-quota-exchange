export function formatTableDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-AU");
}

export function formatTableDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-AU");
}

export function timestampHasPassed(value: string) {
  const time = Date.parse(value);
  return !Number.isNaN(time) && time <= Date.now();
}

export function formatCountdown(msRemaining: number) {
  if (!Number.isFinite(msRemaining) || msRemaining <= 0) {
    return "Ended";
  }

  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (days > 0 || hours > 0) {
    parts.push(`${hours}h`);
  }
  if (days > 0 || hours > 0 || minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (days === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
}

