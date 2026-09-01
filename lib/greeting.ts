export function getGreeting(name: string, date: Date = new Date()): string {
  const hour = date.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return `Good ${timeOfDay}, ${name}`;
}
