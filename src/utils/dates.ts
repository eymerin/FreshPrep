export function format(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseISO(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function differenceInDays(dateA: Date, dateB: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((dateA.getTime() - dateB.getTime()) / msPerDay);
}

export function formatDisplay(dateStr: string): string {
  return parseISO(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getDayLabel(dateStr: string): string {
  return parseISO(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

export function getMondayOfWeek(dateStr: string): string {
  const d = parseISO(dateStr);
  const day = d.getDay();
  const daysBack = day === 0 ? 6 : day - 1;
  return format(addDays(d, -daysBack));
}

export function computeWeekStreak(mealEatenDates: string[]): number {
  if (mealEatenDates.length === 0) return 0;
  const weekSet = new Set(mealEatenDates.map(getMondayOfWeek));
  let streak = 0;
  let monday = getMondayOfWeek(format(new Date()));
  while (weekSet.has(monday)) {
    streak++;
    monday = format(addDays(parseISO(monday), -7));
  }
  return streak;
}

export function computeBestWeekStreak(mealEatenDates: string[]): number {
  if (mealEatenDates.length === 0) return 0;
  const weeks = [...new Set(mealEatenDates.map(getMondayOfWeek))].sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < weeks.length; i++) {
    if (differenceInDays(parseISO(weeks[i]), parseISO(weeks[i - 1])) === 7) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

export function computeWeeksOnTarget(mealEatenDates: string[], target: number): number {
  const weekCounts: Record<string, number> = {};
  for (const d of mealEatenDates) {
    const monday = getMondayOfWeek(d);
    weekCounts[monday] = (weekCounts[monday] || 0) + 1;
  }
  return Object.values(weekCounts).filter((n) => n >= target).length;
}

export function computePrepWeekStreak(prepDates: string[]): number {
  if (prepDates.length === 0) return 0;
  const weekSet = new Set(prepDates.map(getMondayOfWeek));
  const today = new Date();
  const currentMonday = getMondayOfWeek(format(today));
  // Allow current week to count even if we're mid-week
  let checking = weekSet.has(currentMonday)
    ? currentMonday
    : getMondayOfWeek(format(addDays(today, -7)));
  let streak = 0;
  while (weekSet.has(checking)) {
    streak++;
    checking = format(addDays(parseISO(checking), -7));
  }
  return streak;
}
