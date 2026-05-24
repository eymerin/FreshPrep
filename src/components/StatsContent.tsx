import { useAppStore } from '../store';
import {
  computeWeekStreak, computeBestWeekStreak, computeWeeksOnTarget,
  getMondayOfWeek, format, addDays,
} from '../utils/dates';

function getWeekDates() {
  return Array.from({ length: 7 }, (_, i) => format(addDays(new Date(), i)));
}

function SectionHead({ label, description }: { label: string; description: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold text-brand-muted/30 uppercase tracking-widest">{label}</p>
      <p className="text-xs text-brand-muted/40 mt-0.5">{description}</p>
    </div>
  );
}

function Stat({ value, unit, label, accent = false, wide = false }: {
  value: number | string; unit?: string; label: string; accent?: boolean; wide?: boolean;
}) {
  return (
    <div className={`bg-brand-bg rounded-lg px-4 py-4 ${wide ? 'col-span-2' : ''} ${accent ? 'border border-brand-accent/30' : ''}`}>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <p className={`text-2xl font-semibold leading-none ${accent ? 'text-brand-accent' : 'text-brand-muted'}`}>{value}</p>
        {unit && <p className={`text-xs leading-none ${accent ? 'text-brand-accent/60' : 'text-brand-muted/40'}`}>{unit}</p>}
      </div>
      <p className="text-[11px] text-brand-muted/45 leading-tight">{label}</p>
    </div>
  );
}

export default function StatsContent() {
  const mealEatenDates     = useAppStore((s) => s.mealEatenDates);
  const mealsEatenAllTime  = useAppStore((s) => s.mealsEatenAllTime);
  const prepSessionsLogged = useAppStore((s) => s.prepSessionsLogged);
  const userPrefs          = useAppStore((s) => s.userPrefs);

  const isEmpty        = mealsEatenAllTime === 0 && prepSessionsLogged === 0;
  const currentStreak  = computeWeekStreak(mealEatenDates);
  const bestStreak     = computeBestWeekStreak(mealEatenDates);
  const atPeak         = currentStreak > 0 && currentStreak === bestStreak;
  const activeWeeks    = new Set(mealEatenDates.map(getMondayOfWeek)).size;
  const target         = userPrefs?.mealsPerWeek ?? 3;
  const weeksOnTarget  = computeWeeksOnTarget(mealEatenDates, target);
  const weekEaten      = mealEatenDates.filter((d) => getWeekDates().includes(d)).length;
  const sl = (n: number) => n === 0 ? '—' : String(n);
  const su = (n: number) => n > 0 ? (n === 1 ? 'wk' : 'wks') : undefined;

  if (isEmpty) {
    return (
      <div className="py-10 text-center">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/20 mx-auto mb-4">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <p className="text-sm font-medium text-brand-muted/55">No data yet</p>
        <p className="text-xs text-brand-muted/40 mt-1.5 leading-relaxed">Complete your first prep session to start tracking your consistency.</p>
      </div>
    );
  }

  // Compute last 10 weeks of meal counts
  const weeks = Array.from({ length: 10 }, (_, i) => {
    const refDate = format(addDays(new Date(), -(9 - i) * 7));
    const monday = getMondayOfWeek(refDate);
    const count = mealEatenDates.filter(d => getMondayOfWeek(d) === monday).length;
    const isCurrentWeek = i === 9;
    return { monday, count, isCurrentWeek };
  });
  const maxCount = Math.max(...weeks.map(w => w.count), userPrefs?.mealsPerWeek ?? 5);

  const hitRate = activeWeeks > 0 ? Math.round((weeksOnTarget / activeWeeks) * 100) : 0;

  return (
    <div className="space-y-7">
      <div>
        <SectionHead label="Consistency" description="Weeks with at least one meal eaten from your prep inventory." />
        <div className="grid grid-cols-2 gap-2">
          <Stat value={sl(currentStreak)} unit={su(currentStreak)} label="current streak" accent={atPeak && currentStreak > 0} />
          <Stat value={sl(bestStreak)} unit={su(bestStreak)} label="best streak" />
          <Stat value={activeWeeks} unit={activeWeeks === 1 ? 'wk' : 'wks'} label="active weeks total" wide />
        </div>
        <p className="text-xs text-brand-muted/45 mt-2.5 leading-relaxed">
          {atPeak && currentStreak > 1
            ? `${currentStreak}-week streak — your best ever. Keep it going.`
            : currentStreak > 0 && bestStreak > currentStreak
            ? `${currentStreak}-week streak, ${bestStreak - currentStreak} week${bestStreak - currentStreak !== 1 ? 's' : ''} short of your best.`
            : currentStreak === 0 && activeWeeks > 0
            ? 'No active streak this week — log a meal to restart.'
            : activeWeeks === 0
            ? 'Eat a prepped meal to start your first streak.'
            : `${currentStreak} week${currentStreak !== 1 ? 's' : ''} and counting.`}
        </p>

        {/* Weekly bar chart — last 10 weeks */}
        <div className="grid grid-cols-10 gap-1.5 items-end h-20 mt-3 px-1">
          {weeks.map((week, i) => {
            const heightPct = maxCount > 0 ? (week.count / maxCount) * 100 : 0;
            const atTarget = userPrefs && week.count >= (userPrefs.mealsPerWeek ?? 0);
            const barColor = week.count === 0
              ? 'bg-brand-muted/10'
              : week.isCurrentWeek
              ? 'bg-brand-accent'
              : atTarget
              ? 'bg-brand-accent/70'
              : 'bg-brand-muted/25';
            return (
              <div key={i} className="flex flex-col items-center justify-end gap-1 h-full">
                <div
                  className={`w-full rounded-sm transition-all ${barColor}`}
                  style={{ height: `${Math.max(heightPct, week.count > 0 ? 8 : 4)}%` }}
                  title={`Week of ${week.monday}: ${week.count} meals`}
                />
                {week.count > 0 && (
                  <span className="text-[9px] text-brand-muted/40 leading-none">{week.count}</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-brand-muted/30 mt-1 text-right">last 10 weeks</p>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-5">
        <div>
          <SectionHead label="Execution" description="Meals cooked and eaten since you started tracking." />
          <div className="grid grid-cols-2 gap-2">
            <Stat value={prepSessionsLogged} label="prep sessions" />
            <Stat value={weekEaten} label="eaten this week" />
            <Stat value={mealsEatenAllTime} label="total meals eaten from prep" wide />
          </div>
          <p className="text-xs text-brand-muted/45 mt-2.5 leading-relaxed">
            {prepSessionsLogged === 0
              ? 'Log your first prep session to start tracking.'
              : mealsEatenAllTime === 0
              ? 'Meals prepped but none eaten yet — schedule and mark them as eaten.'
              : `${mealsEatenAllTime} meal${mealsEatenAllTime !== 1 ? 's' : ''} eaten across ${prepSessionsLogged} prep session${prepSessionsLogged !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <div>
          <SectionHead
            label="Planning"
            description={userPrefs ? `Weeks where you hit your target of ${target} meal${target !== 1 ? 's' : ''}.` : 'Weeks where you ate 3 or more prepped meals.'}
          />
          <div className="grid grid-cols-2 gap-2">
            <Stat value={weeksOnTarget} label="weeks on target" />
            <Stat value={activeWeeks > 0 ? `${hitRate}%` : '—'} label="hit rate" />
          </div>
          <p className="text-xs text-brand-muted/45 mt-2.5 leading-relaxed">
            {activeWeeks === 0
              ? 'Complete a week with prepped meals to see your planning rate.'
              : hitRate >= 80
              ? `${hitRate}% hit rate — highly consistent. Your planning is working.`
              : hitRate >= 50
              ? `${hitRate}% hit rate across ${activeWeeks} active week${activeWeeks !== 1 ? 's' : ''}. Room to grow.`
              : `${hitRate}% hit rate. Try reducing your weekly target to build the habit first.`}
          </p>
        </div>
      </div>
    </div>
  );
}
