import { useState } from 'react';
import { useAppStore } from '../store';
import { PreparedMeal, MealTime } from '../types';
import { formatDisplay, addDays, format, getDayLabel } from '../utils/dates';

const MEAL_TIMES: MealTime[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const MEAL_TIME_LABELS: Record<MealTime, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

function getWeekDates(): string[] {
  return Array.from({ length: 7 }, (_, i) => format(addDays(new Date(), i)));
}

// ── Schedule modal ────────────────────────────────────────────
function ScheduleModal({ meal, onClose }: { meal: PreparedMeal; onClose: () => void }) {
  const scheduledMeals = useAppStore((s) => s.scheduledMeals);
  const scheduleMeal = useAppStore((s) => s.scheduleMeal);

  const weekDates = getWeekDates();

  const alreadyAssigned = scheduledMeals.filter((s) => s.preparedMealId === meal.id).length;
  const servingsLeft = meal.servingsRemaining - alreadyAssigned;

  // Build list of unassigned slots (slots with no meal scheduled yet)
  const unassignedSlots: { date: string; mealTime: MealTime }[] = [];
  for (const date of weekDates) {
    for (const mealTime of MEAL_TIMES) {
      const taken = scheduledMeals.some((s) => s.date === date && s.mealTime === mealTime);
      if (!taken) unassignedSlots.push({ date, mealTime });
    }
  }

  // Group by date for display
  const slotsByDate: Record<string, MealTime[]> = {};
  for (const { date, mealTime } of unassignedSlots) {
    if (!slotsByDate[date]) slotsByDate[date] = [];
    slotsByDate[date].push(mealTime);
  }

  function handlePick(date: string, mealTime: MealTime) {
    scheduleMeal(date, mealTime, meal.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-brand-surface border border-brand-raised/40 rounded-xl w-full max-w-sm shadow-2xl max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-brand-raised/30 flex items-start justify-between shrink-0">
          <div>
            <h3 className="font-semibold text-brand-muted">Schedule Meal</h3>
            <p className="text-xs text-brand-muted/50 mt-0.5 truncate max-w-[220px]">
              {meal.recipeName}{meal.variantName && meal.variantName !== meal.recipeName ? ` · ${meal.variantName}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-brand-muted/40 hover:text-brand-muted text-lg leading-none ml-3 shrink-0">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {servingsLeft <= 0 ? (
            <p className="text-sm text-brand-muted/50 text-center py-6">All servings are already scheduled.</p>
          ) : Object.keys(slotsByDate).length === 0 ? (
            <p className="text-sm text-brand-muted/50 text-center py-6">All slots this week are filled.</p>
          ) : (
            <div className="space-y-4">
              {weekDates.filter((d) => slotsByDate[d]).map((date) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-brand-muted/50 uppercase tracking-wide mb-2">
                    {getDayLabel(date)} · {formatDisplay(date)}
                  </p>
                  <div className="space-y-1.5">
                    {slotsByDate[date].map((mealTime) => (
                      <button
                        key={mealTime}
                        onClick={() => handlePick(date, mealTime)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-brand-raised/30 hover:border-brand-accent hover:bg-brand-accent/10 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm text-brand-muted">{MEAL_TIME_LABELS[mealTime]}</span>
                        <span className="text-xs text-brand-muted/30">+</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Freshness bar ─────────────────────────────────────────────
function FreshnessBar({ meal }: { meal: PreparedMeal }) {
  const getDaysRemaining = useAppStore((s) => s.getDaysRemaining);
  const getFreshnessStatus = useAppStore((s) => s.getFreshnessStatus);
  const getExpirationDate = useAppStore((s) => s.getExpirationDate);

  const status = getFreshnessStatus(meal);
  const days = getDaysRemaining(meal);
  const expDate = getExpirationDate(meal);
  const shelfLife = meal.storage === 'refrigerated' ? 4 : 90;
  const pct = Math.max(0, Math.min(100, (days / shelfLife) * 100));

  const barColor = status === 'fresh' ? 'bg-emerald-500' : status === 'expiring' ? 'bg-amber-400' : 'bg-red-500';
  const statusColor = status === 'fresh'
    ? 'text-emerald-700 bg-emerald-100 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-900/40 dark:border-emerald-800'
    : status === 'expiring'
    ? 'text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-400 dark:bg-amber-900/40 dark:border-amber-800'
    : 'text-red-700 bg-red-100 border-red-300 dark:text-red-400 dark:bg-red-900/40 dark:border-red-800';

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor}`}>
          {status === 'fresh' ? 'Fresh' : status === 'expiring' ? 'Expiring soon' : 'Expired'}
        </span>
        <span className="text-xs text-brand-muted/60">
          {days > 0 ? `${days}d left · expires ${formatDisplay(expDate)}` : `Expired ${formatDisplay(expDate)}`}
        </span>
      </div>
      <div className="h-1.5 bg-brand-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function MealsScreen() {
  const preparedMeals      = useAppStore((s) => s.preparedMeals);
  const scheduledMeals     = useAppStore((s) => s.scheduledMeals);
  const removePreparedMeal = useAppStore((s) => s.removePreparedMeal);
  const getFreshnessStatus = useAppStore((s) => s.getFreshnessStatus);
  const userPrefs          = useAppStore((s) => s.userPrefs);
  const [schedulingMeal, setSchedulingMeal] = useState<PreparedMeal | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const available      = preparedMeals.filter((m) => m.servingsRemaining > 0);
  const empty          = preparedMeals.filter((m) => m.servingsRemaining === 0);
  const expiringSoon   = available.filter((m) => {
    const s = getFreshnessStatus(m);
    return s === 'expiring' || s === 'expired';
  });

  // Coverage estimate
  const mealsPerDay    = userPrefs ? userPrefs.mealsPerWeek / 7 : 1;
  const coverageDays   = available.length > 0 ? Math.round(available.length / mealsPerDay) : 0;
  const setForWeek     = coverageDays >= 7;
  const coverageDay    = !setForWeek && coverageDays > 0
    ? addDays(new Date(), coverageDays - 1).toLocaleDateString('en-US', { weekday: 'long' })
    : null;

  const sorted = [...available].sort((a, b) => {
    const order = { expired: 0, expiring: 1, fresh: 2 };
    return order[getFreshnessStatus(a)] - order[getFreshnessStatus(b)];
  });

  function assignedCount(mealId: string) {
    return scheduledMeals.filter((s) => s.preparedMealId === mealId).length;
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-brand-muted">Meals Ready</h2>
        <p className="text-sm text-brand-muted/50 mt-1">
          {available.length > 0
            ? `${available.length} prepared meal${available.length !== 1 ? 's' : ''} in inventory`
            : 'No prepared meals in inventory'}
        </p>
        {available.length > 0 && (setForWeek || coverageDay) && (
          <p className="text-xs text-brand-accent mt-1.5 font-medium">
            {setForWeek ? "You're set for the week." : `Covered through ${coverageDay}.`}
          </p>
        )}
      </div>

      {expiringSoon.length > 0 && available.length > 0 && (
        <p className="text-[11px] text-brand-muted/35 mb-4">
          Sorted by urgency — eat oldest meals first.
        </p>
      )}

      {sorted.length === 0 && (
        <div className="text-center py-16">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/20 mx-auto mb-4">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
            <path d="M3 8l9 5 9-5" />
            <path d="M12 13v8" />
          </svg>
          <p className="font-medium text-brand-muted/60">Inventory empty</p>
          <p className="text-sm mt-1.5 text-brand-muted/40">
            Log a prep session to add meals to your inventory.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((meal) => {
          const assigned = assignedCount(meal.id);
          const unassigned = meal.servingsRemaining - assigned;

          return (
            <div key={meal.id} className="bg-brand-surface rounded-lg border border-brand-raised/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brand-muted text-sm leading-tight">{meal.recipeName}</p>
                  {meal.variantName && meal.variantName !== meal.recipeName && (
                    <p className="text-xs text-brand-muted/60 mt-0.5">{meal.variantName}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brand-bg text-brand-muted shrink-0">
                  {meal.storage === 'refrigerated' ? '❄️ Fridge' : '🧊 Frozen'}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-4 text-xs text-brand-muted/60">
                  <span>Prepped {formatDisplay(meal.prepDate)}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-brand-muted/60">Servings <span className="font-medium text-brand-muted">{meal.servingsRemaining}</span></span>
                  <span className={unassigned > 0 ? 'text-brand-muted/60' : 'text-brand-muted/30'}>
                    Unscheduled <span className={`font-medium ${unassigned > 0 ? 'text-brand-muted' : 'text-brand-muted/30'}`}>{unassigned}</span>
                  </span>
                </div>
                {meal.nutrientsPerServing && (
                  <div className="pt-1">
                    <p className="text-[10px] text-brand-muted/35 uppercase tracking-wide mb-0.5">Per serving</p>
                    <div className="flex items-center gap-3 text-xs text-brand-muted/50">
                      <span><span className="font-medium text-brand-muted">{Math.round(meal.nutrientsPerServing.calories)}</span> cal</span>
                      <span><span className="font-medium text-brand-muted">{Math.round(meal.nutrientsPerServing.protein)}g</span> protein</span>
                      <span><span className="font-medium text-brand-muted">{Math.round(meal.nutrientsPerServing.carbs)}g</span> carbs</span>
                      <span><span className="font-medium text-brand-muted">{Math.round(meal.nutrientsPerServing.fat)}g</span> fat</span>
                    </div>
                  </div>
                )}
              </div>

              <FreshnessBar meal={meal} />

              <div className="flex gap-2 mt-3 pt-3 border-t border-brand-raised/30">
                <button
                  onClick={() => unassigned > 0 && setSchedulingMeal(meal)}
                  disabled={unassigned <= 0}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-colors font-medium ${
                    unassigned > 0
                      ? 'bg-brand-accent text-white hover:bg-brand-accent/80'
                      : 'bg-brand-surface border border-brand-raised/30 text-brand-muted/25 cursor-not-allowed'
                  }`}
                >
                  {unassigned > 0 ? 'Schedule' : 'Fully Scheduled'}
                </button>
                {confirmRemoveId === meal.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-brand-muted/50">Remove meal?</span>
                    <button
                      onClick={() => { removePreparedMeal(meal.id); setConfirmRemoveId(null); }}
                      className="px-3 py-1.5 text-sm font-medium text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors"
                    >Remove</button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="px-3 py-1.5 text-sm text-brand-muted/50 border border-brand-muted/20 rounded-lg hover:text-brand-muted transition-colors"
                    >Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(meal.id)}
                    className="text-brand-muted/35 hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-400/10"
                    aria-label="Remove meal"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {empty.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-brand-muted/30 uppercase tracking-widest font-semibold mb-2">Used Up</p>
          {empty.map((meal) => (
            <div key={meal.id} className="flex items-center justify-between py-2 px-3 bg-brand-surface/40 rounded-lg mb-1.5 opacity-50">
              <p className="text-sm text-brand-muted">{meal.recipeName}</p>
              <button onClick={() => removePreparedMeal(meal.id)} className="text-xs text-brand-muted/40 hover:text-red-400 transition-colors">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {schedulingMeal && (
        <ScheduleModal meal={schedulingMeal} onClose={() => setSchedulingMeal(null)} />
      )}
    </div>
  );
}
