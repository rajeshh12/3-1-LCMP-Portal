export function daysUntil(date, now = new Date()) {
  const dayValue = (value) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(value)).reduce((result, part) => {
      if (part.type !== "literal") result[part.type] = Number(part.value);
      return result;
    }, {});
    return Date.UTC(parts.year, parts.month - 1, parts.day);
  };
  return Math.round((dayValue(date) - dayValue(now)) / 86400000);
}
