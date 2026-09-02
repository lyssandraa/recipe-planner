export function getGreeting(name: string, date: Date = new Date()): string {
  const hour = date.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return `Good ${timeOfDay}, ${name}`;
}

// Small uppercase day-and-time line for the dashboard header, e.g.
// "MONDAY · 9:41 AM".
export function getDayTimeLine(date: Date = new Date()): string {
  const day = date.toLocaleDateString("en-GB", { weekday: "long" });
  const time = date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}
