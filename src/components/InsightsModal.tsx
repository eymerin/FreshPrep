import { useAppStore } from '../store';
import {
  computeWeekStreak,
  computeBestWeekStreak,
  computeWeeksOnTarget,
  getMondayOfWeek,
  format,
  addDays,
} from '../utils/dates';

function getWeekDates(): string[] {
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

function Stat({
  value,
  unit,
  label,
  accent = false,
  wide = false,
}: {
  value: number | string;
  unit?: string;
  label: string;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`bg-brand-bg rounded-lg px-4 py-4 ${wide ? 'col-span-2' : ''} ${
        accent ? 'border border-brand-accent/30' : ''
      }`}
    >
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <p className={`text-2xl font-semibold leading-none ${accent ? 'text-brand-accent' : 'text-brand-muted'}`}>
          {value}
        </p>
        {unit && (
          <p className={`text-xs leading-none ${accent ? 'text-brand-accent/60' : 'text-brand-muted/40'}`}>
            {unit}
          </p>
        )}
      </div>
      <p className="text-[11px] text-brand-muted/45 leading-tight">{label}</p>
    </div>
  );
}

export default function InsightsModal({ onClose }: { onClose: () => void }) {
  const mealEatenDates     = useAppStore((s) => s.mealEatenDates);
  const mealsEatenAllTime  = useAppStore((s) => s.mealsEatenAllTime);
  const prepSessionsLogged = useAppStore((s) => s.prepSessionsLogged);
  const userPrefs          = useAppStore((s) => s.userPrefs);

  const isEmpty = mealsEatenAllTime === 0 && prepSessionsLogged === 0;

  const currentStreak = computeWeekStreak(mealEatenDates);
  const bestStreak    = computeBestWeekStreak(mealEatenDates);
  const atPeak        = currentStreak > 0 && currentStreak === bestStreak;
  const activeWeeks   = new Set(mealEatenDates.map(getMondayOfWeek)).size;

  const target        = userPrefs?.mealsPerWeek ?? 3;
  const weeksOnTarget = computeWeeksOnTarget(mealEatenDates, target);

  const weekDates  = getWeekDates();
  const weekEaten  = mealEatenDates.filter((d) => weekDates.includes(d)).length;

  const streakLabel  = (n: number) => n === 0 ? '—' : String(n);
  const streakUnit   = (n: number) => n > 0 ? (n === 1 ? 'wk' : 'wks') : undefined;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface border border-brand-muted/15 rounded-xl w-full max-w-sm shadow-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-brand-muted/10 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-semibold text-brand-muted">Your Progress</h3>
            {!isEmpty && (
              <p className="text-xs text-brand-muted/40 mt-0.5">
                {activeWeeks} week{activeWeeks !== 1 ? 's' : ''} of data
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-brand-muted/40 hover:text-brand-muted transition-colors text-xl leading-none ml-4"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-7">
          {isEmpty ? (
            <div className="py-10 text-center">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/20 mx-auto mb-4">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <p className="text-sm font-medium text-brand-muted/55">No data yet</p>
              <p className="text-xs text-brand-muted/40 mt-1.5 leading-relaxed">
                Complete your first prep session to start tracking your consistency.
              </p>
            </div>
          ) : (
            <>
              {/* CONSISTENCY */}
              <div>
                <SectionHead
                  label="Consistency"
                  description="Weeks with at least one meal eaten from your prep inventory."
                />
                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    value={streakLabel(currentStreak)}
                    unit={streakUnit(currentStreak)}
                    label="current streak"
                    accent={atPeak && currentStreak > 0}
                  />
                  <Stat
                    value={streakLabel(bestStreak)}
                    unit={streakUnit(bestStreak)}
                    label="best streak"
                  />
                  <Stat
                    value={activeWeeks}
                    unit={activeWeeks === 1 ? 'wk' : 'wks'}
                    label="active weeks total"
                    wide
                  />
                </div>
                {atPeak && currentStreak > 1 && (
                  <p className="text-xs text-brand-accent/70 mt-2.5">
                    Current streak matches your all-time best.
                  </p>
                )}
              </div>

              {/* EXECUTION */}
              <div>
                <SectionHead
                  label="Execution"
                  description="Meals cooked and eaten since you started tracking."
                />
                <div className="grid grid-cols-2 gap-2">
                  <Stat value={prepSessionsLogged} label="prep sessions" />
                  <Stat value={weekEaten} label="eaten this week" />
                  <Stat value={mealsEatenAllTime} label="total meals eaten from prep" wide />
                </div>
              </div>

              {/* PLANNING */}
              <div>
                <SectionHead
                  label="Planning"
                  description={
                    userPrefs
                      ? `Weeks where you hit your target of ${target} meal${target !== 1 ? 's' : ''}.`
                      : 'Weeks where you ate 3 or more prepped meals.'
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    value={weeksOnTarget}
                    label="weeks on target"
                  />
                  <Stat
                    value={activeWeeks > 0 ? `${Math.round((weeksOnTarget / activeWeeks) * 100)}%` : '—'}
                    label="hit rate"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
