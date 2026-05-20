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

  return (
    <div className="space-y-7">
      <div>
        <SectionHead label="Consistency" description="Weeks with at least one meal eaten from your prep inventory." />
        <div className="grid grid-cols-2 gap-2">
          <Stat value={sl(currentStreak)} unit={su(currentStreak)} label="current streak" accent={atPeak && currentStreak > 0} />
          <Stat value={sl(bestStreak)} unit={su(bestStreak)} label="best streak" />
          <Stat value={activeWeeks} unit={activeWeeks === 1 ? 'wk' : 'wks'} label="active weeks total" wide />
        </div>
        {atPeak && currentStreak > 1 && <p className="text-xs text-brand-accent/70 mt-2.5">Current streak matches your all-time best.</p>}
      </div>
      <div>
        <SectionHead label="Execution" description="Meals cooked and eaten since you started tracking." />
        <div className="grid grid-cols-2 gap-2">
          <Stat value={prepSessionsLogged} label="prep sessions" />
          <Stat value={weekEaten} label="eaten this week" />
          <Stat value={mealsEatenAllTime} label="total meals eaten from prep" wide />
        </div>
      </div>
      <div>
        <SectionHead
          label="Planning"
          description={userPrefs ? `Weeks where you hit your target of ${target} meal${target !== 1 ? 's' : ''}.` : 'Weeks where you ate 3 or more prepped meals.'}
        />
        <div className="grid grid-cols-2 gap-2">
          <Stat value={weeksOnTarget} label="weeks on target" />
          <Stat value={activeWeeks > 0 ? `${Math.round((weeksOnTarget / activeWeeks) * 100)}%` : '—'} label="hit rate" />
        </div>
      </div>
    </div>
  );
}
