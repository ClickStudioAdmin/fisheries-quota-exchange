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
