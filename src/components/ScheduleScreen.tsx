import { useState } from 'react';
import { useAppStore } from '../store';
import { MealTime, PreparedMeal, NutrientInfo } from '../types';
import { addDays, computeWeekStreak, format, formatDisplay, getDayLabel, parseISO } from '../utils/dates';

type Tab = 'plan' | 'prep' | 'schedule' | 'meals' | 'recipes';

const MEAL_TIMES: MealTime[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const MEAL_TIME_LABELS: Record<MealTime, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

function getWeekDates(): string[] {
  return Array.from({ length: 7 }, (_, i) => format(addDays(new Date(), i)));
}

function formatDayFull(dateStr: string): string {
  return parseISO(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function mealSubtitle(meal: PreparedMeal): string | null {
  return meal.variantName && meal.variantName !== meal.recipeName ? meal.variantName : null;
}

function AssignModal({ date, mealTime, onClose }: { date: string; mealTime: MealTime; onClose: () => void }) {
  const preparedMeals = useAppStore((s) => s.preparedMeals);
  const scheduledMeals = useAppStore((s) => s.scheduledMeals);
  const scheduleMeal = useAppStore((s) => s.scheduleMeal);
  const getFreshnessStatus = useAppStore((s) => s.getFreshnessStatus);

  const available = preparedMeals.filter((m) => {
    if (m.servingsRemaining <= 0 || getFreshnessStatus(m) === 'expired') return false;
    return m.servingsRemaining - scheduledMeals.filter((s) => s.preparedMealId === m.id).length > 0;
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-brand-surface border border-brand-raised/40 rounded-xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-brand-raised/30 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-brand-muted">Schedule Meal</h3>
            <p className="text-xs text-brand-muted/50 mt-0.5">{MEAL_TIME_LABELS[mealTime]} · {formatDisplay(date)}</p>
          </div>
          <button onClick={onClose} className="text-brand-muted/40 hover:text-brand-muted text-lg leading-none">×</button>
        </div>
        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {available.length === 0 && <p className="text-sm text-brand-muted/50 text-center py-4">No meals available.</p>}
          {available.map((meal) => (
            <button key={meal.id} onClick={() => { scheduleMeal(date, mealTime, meal.id); onClose(); }}
              className="w-full text-left px-3 py-3 rounded-lg border border-brand-raised/30 hover:border-brand-accent hover:bg-brand-accent/10 transition-colors">
              <p className="text-sm font-medium text-brand-muted">{meal.recipeName}</p>
              {mealSubtitle(meal) && <p className="text-xs text-brand-muted/50">{mealSubtitle(meal)}</p>}
              <p className="text-xs text-brand-muted/50 mt-0.5">
                {meal.servingsRemaining - scheduledMeals.filter((s) => s.preparedMealId === meal.id).length} unscheduled
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwapModal({ scheduledMealId, onClose }: { scheduledMealId: string; onClose: () => void }) {
  const preparedMeals = useAppStore((s) => s.preparedMeals);
  const scheduledMeals = useAppStore((s) => s.scheduledMeals);
  const swapScheduledMeal = useAppStore((s) => s.swapScheduledMeal);
  const getFreshnessStatus = useAppStore((s) => s.getFreshnessStatus);

  const available = preparedMeals.filter((m) => {
    if (m.servingsRemaining <= 0 || getFreshnessStatus(m) === 'expired') return false;
    return m.servingsRemaining - scheduledMeals.filter((s) => s.preparedMealId === m.id).length > 0;
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-brand-surface border border-brand-raised/40 rounded-xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-brand-raised/30 flex items-center justify-between">
          <h3 className="font-semibold text-brand-muted">Swap Meal</h3>
          <button onClick={onClose} className="text-brand-muted/40 hover:text-brand-muted text-lg leading-none">×</button>
        </div>
        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {available.length === 0 && <p className="text-sm text-brand-muted/50 text-center py-4">No available meals.</p>}
          {available.map((meal) => (
            <button key={meal.id} onClick={() => { swapScheduledMeal(scheduledMealId, meal.id); onClose(); }}
              className="w-full text-left px-3 py-3 rounded-lg border border-brand-raised/30 hover:border-brand-accent hover:bg-brand-accent/10 transition-colors">
              <p className="text-sm font-medium text-brand-muted">{meal.recipeName}</p>
              {mealSubtitle(meal) && <p className="text-xs text-brand-muted/50">{mealSubtitle(meal)}</p>}
              <p className="text-xs text-brand-muted/50 mt-0.5">{meal.storage === 'refrigerated' ? 'Fridge' : 'Frozen'}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Week helpers ──────────────────────────────────────────────
function getLastWeekDates(): string[] {
  return Array.from({ length: 7 }, (_, i) => format(addDays(new Date(), -(i + 1))));
}

// ── Section label ─────────────────────────────────────────────
function SectionLabel({ label, right }: { label: string; right?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <p className="text-xs font-semibold text-brand-muted/60 uppercase tracking-widest">{label}</p>
      {right && <p className="text-xs text-brand-muted/40">{right}</p>}
    </div>
  );
}

// ── TODAY: Next action card ───────────────────────────────────
function NextActionCard({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const preparedMeals     = useAppStore((s) => s.preparedMeals);
  const scheduledMeals    = useAppStore((s) => s.scheduledMeals);
  const eatenScheduledIds = useAppStore((s) => s.eatenScheduledIds);
  const planEntries       = useAppStore((s) => s.planEntries);
  const mealEatenDates    = useAppStore((s) => s.mealEatenDates);
  const getFreshnessStatus = useAppStore((s) => s.getFreshnessStatus);

  const today = format(new Date());
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  const available = preparedMeals.filter((m) => m.servingsRemaining > 0);
  const expiringSoon = available.filter((m) => {
    const st = getFreshnessStatus(m);
    return st === 'expiring' || st === 'expired';
  });
  const todayScheduled = scheduledMeals.filter((s) => s.date === today);
  const todayEaten     = todayScheduled.filter((s) => eatenScheduledIds.includes(s.id));
  const todayAllEaten  = todayScheduled.length > 0 && todayEaten.length === todayScheduled.length;

  // Weekly reset window: Sunday 5pm+ or Monday before 1pm
  const inResetWindow = (dayOfWeek === 0 && hour >= 17) || (dayOfWeek === 1 && hour < 13);
  const lastWeekEaten = inResetWindow
    ? mealEatenDates.filter((d) => getLastWeekDates().includes(d)).length
    : 0;
  const showWeeklyReset = inResetWindow && lastWeekEaten >= 3 && planEntries.length === 0;

  type Action = { message: string; cta?: string; tab?: Tab; urgency: 'success' | 'warn' | 'normal' };
  let action: Action | null = null;

  if (todayAllEaten) {
    if (available.length === 0)
      action = { message: 'All done today. Inventory empty — plan your next batch.', cta: 'Plan prep →', tab: 'plan', urgency: 'normal' };
    else if (available.length <= 2)
      action = { message: 'On track today. Running low on inventory.', cta: 'Plan prep →', tab: 'plan', urgency: 'normal' };
    else
      action = { message: 'All meals eaten today. You\'re on track.', urgency: 'success' };
  } else if (expiringSoon.length > 0) {
    action = { message: `${expiringSoon.length} meal${expiringSoon.length !== 1 ? 's' : ''} expiring soon — prioritize these.`, cta: 'View →', tab: 'meals', urgency: 'warn' };
  } else if (available.length === 0) {
    action = { message: 'No meals in inventory. Plan your next prep batch.', cta: 'Plan now →', tab: 'plan', urgency: 'normal' };
  } else if (showWeeklyReset) {
    action = {
      message: lastWeekEaten >= 5
        ? 'Strong week. Build this week\'s plan to keep the momentum.'
        : 'You stayed on track last week. Ready to plan this week?',
      cta: 'Plan now →',
      tab: 'plan',
      urgency: 'success',
    };
  } else if (todayScheduled.length === 0) {
    action = { message: `${available.length} meal${available.length !== 1 ? 's' : ''} ready — none scheduled for today.`, urgency: 'normal' };
  } else if (planEntries.length > 0) {
    action = { message: 'Shopping list in progress.', cta: 'Continue →', tab: 'plan', urgency: 'normal' };
  } else if (available.length <= 2) {
    action = { message: 'Running low — plan your next prep soon.', cta: 'Plan prep →', tab: 'plan', urgency: 'normal' };
  }

  if (!action) return null;

  const st = {
    success: { wrap: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700/25', text: 'text-emerald-700 dark:text-emerald-300/80', cta: 'text-emerald-700 dark:text-emerald-400' },
    warn:    { wrap: 'bg-amber-100 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700/25',       text: 'text-amber-800 dark:text-amber-300/80',   cta: 'text-amber-800 font-semibold dark:text-amber-400' },
    normal:  { wrap: 'bg-brand-raised/20 border-brand-warm/30', text: 'text-brand-muted/60', cta: 'text-brand-warm' },
  }[action.urgency];

  return (
    <div className={`mb-4 px-3 py-2.5 rounded-lg border flex items-center justify-between gap-3 ${st.wrap}`}>
      <p className={`text-xs leading-relaxed ${st.text}`}>{action.message}</p>
      {action.cta && action.tab && (
        <button onClick={() => onNavigate(action.tab!)} className={`text-xs font-medium shrink-0 ${st.cta}`}>
          {action.cta}
        </button>
      )}
    </div>
  );
}

// ── THIS WEEK zone ────────────────────────────────────────────
function ThisWeekZone() {
  const scheduledMeals = useAppStore((s) => s.scheduledMeals);
  const preparedMeals  = useAppStore((s) => s.preparedMeals);
  const mealEatenDates = useAppStore((s) => s.mealEatenDates);
  const userPrefs      = useAppStore((s) => s.userPrefs);

  const weekDates      = getWeekDates();
  const weekScheduled  = scheduledMeals.filter((s) => weekDates.includes(s.date));
  const available      = preparedMeals.filter((m) => m.servingsRemaining > 0);
  const target         = userPrefs?.mealsPerWeek ?? null;
  const weekEaten      = mealEatenDates.filter((d) => weekDates.includes(d)).length;
  const pct            = target ? Math.min(100, Math.round((weekScheduled.length / target) * 100)) : null;
  const gap            = target ? Math.max(0, target - weekScheduled.length) : null;

  return (
    <div className="space-y-2">
      {/* Scheduled vs target */}
      <div className="bg-brand-surface rounded-lg border border-brand-muted/15 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-brand-muted/50">Meals scheduled</p>
          <p className="text-sm font-semibold text-brand-muted">
            {weekScheduled.length}
            {target !== null && <span className="font-normal text-brand-muted/40"> / {target}</span>}
          </p>
        </div>
        {pct !== null && (
          <div className="h-1.5 bg-brand-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-accent rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {gap !== null && gap > 0 && (
          <p className="text-[11px] text-brand-muted/35 mt-1.5">{gap} more to hit your weekly target</p>
        )}
        {gap === 0 && target !== null && (
          <p className="text-[11px] text-brand-accent/60 mt-1.5">Weekly target hit</p>
        )}
      </div>

      {/* Inventory + eaten chips */}
      <div className="flex gap-2">
        <div className="flex-1 bg-brand-surface rounded-lg border border-brand-muted/15 px-3 py-3">
          <p className="text-[11px] text-brand-muted/40 mb-1.5">In inventory</p>
          <p className="text-base font-semibold text-brand-muted leading-none">{available.length}</p>
        </div>
        <div className="flex-1 bg-brand-surface rounded-lg border border-brand-muted/15 px-3 py-3">
          <p className="text-[11px] text-brand-muted/40 mb-1.5">Eaten this week</p>
          <p className="text-base font-semibold text-brand-muted leading-none">{weekEaten}</p>
        </div>
      </div>
    </div>
  );
}

// ── MOMENTUM zone ─────────────────────────────────────────────
function MomentumZone() {
  const mealEatenDates     = useAppStore((s) => s.mealEatenDates);
  const prepSessionsLogged = useAppStore((s) => s.prepSessionsLogged);
  const mealsEatenAllTime  = useAppStore((s) => s.mealsEatenAllTime);

  if (prepSessionsLogged === 0 && mealsEatenAllTime === 0) return null;

  const streak    = computeWeekStreak(mealEatenDates);
  const weekDates = getWeekDates();
  const weekEaten = mealEatenDates.filter((d) => weekDates.includes(d)).length;

  const stats = [
    { value: streak,             label: 'week streak' },
    { value: weekEaten,          label: 'eaten this week' },
    { value: prepSessionsLogged, label: 'prep sessions' },
  ];

  return (
    <>
      <SectionLabel label="Momentum" />
      <div className="flex gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex-1 bg-brand-surface rounded-lg border border-brand-muted/15 px-3 py-3 text-center">
            <p className="text-base font-semibold text-brand-muted leading-none mb-1.5">{stat.value}</p>
            <p className="text-[11px] text-brand-muted/45 leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>
    </>
  );
}

// ── TODAY: macro totals ───────────────────────────────────────
function TodayMacros() {
  const scheduledMeals   = useAppStore((s) => s.scheduledMeals);
  const preparedMeals    = useAppStore((s) => s.preparedMeals);
  const nutritionGoals   = useAppStore((s) => s.nutritionGoals);
  const today = format(new Date());

  const todayMeals = scheduledMeals
    .filter((s) => s.date === today)
    .map((s) => preparedMeals.find((m) => m.id === s.preparedMealId))
    .filter((m): m is PreparedMeal => !!m?.nutrientsPerServing);

  if (todayMeals.length === 0) return null;

  const total = todayMeals.reduce<NutrientInfo>(
    (acc, m) => ({
      calories: acc.calories + m.nutrientsPerServing!.calories,
      protein:  acc.protein  + m.nutrientsPerServing!.protein,
      carbs:    acc.carbs    + m.nutrientsPerServing!.carbs,
      fat:      acc.fat      + m.nutrientsPerServing!.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const macros = [
    { key: 'calories', val: Math.round(total.calories), goal: nutritionGoals.calories, label: 'calories' },
    { key: 'protein',  val: Math.round(total.protein),  goal: nutritionGoals.protein,  label: 'protein g' },
    { key: 'carbs',    val: Math.round(total.carbs),    goal: nutritionGoals.carbs,     label: 'carbs g' },
    { key: 'fat',      val: Math.round(total.fat),      goal: nutritionGoals.fat,       label: 'fat g' },
  ];

  return (
    <div className="mb-6">
      <SectionLabel label="Today's Nutrition" right={`${todayMeals.length} meal${todayMeals.length !== 1 ? 's' : ''} tracked`} />
      <div className="flex gap-2">
        {macros.map(({ key, val, goal, label }) => {
          const pct = goal ? Math.min(100, Math.round((val / goal) * 100)) : null;
          const over = goal && val > goal;
          return (
            <div key={key} className="flex-1 bg-brand-raised rounded-lg px-2 py-3 text-center">
              <p className="text-base font-semibold text-brand-muted leading-none">{val}</p>
              {goal && <p className="text-[10px] text-brand-muted/35 mt-0.5 leading-none">/ {goal}</p>}
              <p className="text-[11px] text-brand-muted/45 mt-1.5 leading-tight">{label}</p>
              {pct !== null && (
                <div className="mt-2 h-1 bg-brand-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-brand-accent'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyView({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const scheduledMeals = useAppStore((s) => s.scheduledMeals);
  const preparedMeals = useAppStore((s) => s.preparedMeals);
  const unscheduleMeal = useAppStore((s) => s.unscheduleMeal);
  const consumeServing = useAppStore((s) => s.consumeServing);
  const eatenScheduledIds = useAppStore((s) => s.eatenScheduledIds);
  const markScheduledEaten = useAppStore((s) => s.markScheduledEaten);
  const [assignTarget, setAssignTarget] = useState<MealTime | null>(null);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const today = format(new Date());

  function markEaten(scheduledId: string, preparedMealId: string) {
    consumeServing(preparedMealId);
    markScheduledEaten(scheduledId);
  }

  return (
    <div>
      {/* ── TODAY ──────────────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel label="Today's Schedule" right={formatDayFull(today)} />
        <NextActionCard onNavigate={onNavigate} />
        <div className="space-y-3">
          {MEAL_TIMES.map((mealTime) => {
            const scheduled = scheduledMeals.find((s) => s.date === today && s.mealTime === mealTime);
            const meal = scheduled ? preparedMeals.find((m) => m.id === scheduled.preparedMealId) : undefined;
          return (
            <div key={mealTime} className="bg-brand-surface rounded-lg border border-brand-raised/40 overflow-hidden">
              <div className="px-4 py-2.5 bg-brand-raised">
                <span className="text-sm font-semibold text-brand-muted">{MEAL_TIME_LABELS[mealTime]}</span>
              </div>
              {meal && scheduled ? (
                <div className="px-4 py-3">
                  <p className={`text-sm font-medium transition-colors ${eatenScheduledIds.includes(scheduled.id) ? 'text-brand-muted/40 line-through' : 'text-brand-muted'}`}>
                    {meal.recipeName}
                  </p>
                  {mealSubtitle(meal) && (
                    <p className={`text-xs mt-0.5 ${eatenScheduledIds.includes(scheduled.id) ? 'text-brand-muted/30' : 'text-brand-muted/50'}`}>{mealSubtitle(meal)}</p>
                  )}
                  {meal.nutrientsPerServing && (
                    <div className={`flex gap-3 mt-1.5 text-xs transition-colors ${eatenScheduledIds.includes(scheduled.id) ? 'text-brand-muted/25' : 'text-brand-muted/50'}`}>
                      <span><span className="font-semibold">{Math.round(meal.nutrientsPerServing.calories)}</span> cal</span>
                      <span><span className="font-semibold">{Math.round(meal.nutrientsPerServing.protein)}g</span> protein</span>
                      <span><span className="font-semibold">{Math.round(meal.nutrientsPerServing.carbs)}g</span> carbs</span>
                      <span><span className="font-semibold">{Math.round(meal.nutrientsPerServing.fat)}g</span> fat</span>
                    </div>
                  )}
                  {eatenScheduledIds.includes(scheduled.id) ? (
                    <p className="text-xs text-brand-accent/70 font-medium mt-2">✓ Eaten</p>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => markEaten(scheduled.id, meal.id)}
                        className="flex-1 text-xs py-1.5 bg-brand-accent text-white rounded-lg hover:bg-brand-accent/80 transition-colors font-medium"
                      >
                        Mark as Eaten
                      </button>
                      <button
                        onClick={() => setSwapTarget(scheduled.id)}
                        className="px-3 text-xs py-1.5 bg-brand-slate/20 text-brand-slate border border-brand-slate/30 rounded-lg hover:bg-brand-slate/30 transition-colors font-medium"
                      >
                        Swap
                      </button>
                      <button
                        onClick={() => unscheduleMeal(scheduled.id)}
                        className="px-3 text-xs py-1.5 border border-brand-raised/40 text-brand-muted/40 rounded-lg hover:border-red-700 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAssignTarget(mealTime)}
                  className="w-full px-4 py-3 text-left text-xs text-brand-muted/30 hover:text-brand-accent transition-colors"
                >
                  + Assign meal
                </button>
              )}
            </div>
          );
          })}
        </div>
      </div>

      {/* ── TODAY'S NUTRITION ───────────────────────────────── */}
      <TodayMacros />

      {/* ── THIS WEEK ───────────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel label="This Week" />
        <ThisWeekZone />
      </div>

      {/* ── MOMENTUM ────────────────────────────────────────── */}
      <div className="mb-2">
        <MomentumZone />
      </div>

      {assignTarget && <AssignModal date={today} mealTime={assignTarget} onClose={() => setAssignTarget(null)} />}
      {swapTarget && <SwapModal scheduledMealId={swapTarget} onClose={() => setSwapTarget(null)} />}
    </div>
  );
}

function WeeklyView() {
  const scheduledMeals = useAppStore((s) => s.scheduledMeals);
  const preparedMeals = useAppStore((s) => s.preparedMeals);
  const unscheduleMeal = useAppStore((s) => s.unscheduleMeal);
  const eatenScheduledIds = useAppStore((s) => s.eatenScheduledIds);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ date: string; mealTime: MealTime } | null>(null);
  const weekDates = getWeekDates();

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-semibold text-brand-muted/60 uppercase tracking-widest mb-1">Weekly Plan</p>
        <p className="text-sm text-brand-muted/45">Assign and adjust meals across the week</p>
      </div>
      <div className="space-y-4">
        {weekDates.map((date) => {
          const dayCalories = MEAL_TIMES.reduce((sum, mt) => {
            const s = scheduledMeals.find(s => s.date === date && s.mealTime === mt);
            const m = s ? preparedMeals.find(m => m.id === s.preparedMealId) : undefined;
            return sum + (m?.nutrientsPerServing?.calories ?? 0);
          }, 0);
          return (
          <div key={date} className="bg-brand-surface rounded-lg border border-brand-raised/40 overflow-hidden">
            <div className="px-4 py-2.5 bg-brand-raised flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-muted">{getDayLabel(date)}</span>
              <div className="flex items-center gap-2">
                {dayCalories > 0 && (
                  <span className="text-xs font-medium text-brand-accent/80">{Math.round(dayCalories)} cal</span>
                )}
                <span className="text-xs text-brand-muted/50">{formatDisplay(date)}</span>
              </div>
            </div>
            <div className="divide-y divide-brand-raised/20">
              {MEAL_TIMES.map((mealTime) => {
                const scheduled = scheduledMeals.find((s) => s.date === date && s.mealTime === mealTime);
                const meal: PreparedMeal | undefined = scheduled
                  ? preparedMeals.find((m) => m.id === scheduled.preparedMealId)
                  : undefined;
                return (
                  <div key={mealTime} className="px-4 py-3 flex items-center justify-between gap-3 bg-brand-bg/40">
                    <span className="text-xs font-medium text-brand-muted/50 w-16 shrink-0">
                      {MEAL_TIME_LABELS[mealTime]}
                    </span>
                    {meal && scheduled ? (
                      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm text-brand-muted truncate">{meal.recipeName}</p>
                          {mealSubtitle(meal) && <p className="text-xs text-brand-muted/50 truncate">{mealSubtitle(meal)}</p>}
                          {meal.nutrientsPerServing && (
                            <p className="text-xs text-brand-muted/40 mt-0.5">
                              {Math.round(meal.nutrientsPerServing.calories)} cal · {Math.round(meal.nutrientsPerServing.protein)}g protein
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0 items-center">
                          {eatenScheduledIds.includes(scheduled.id) ? (
                            <span className="text-xs text-brand-accent/70 font-medium">✓ Eaten</span>
                          ) : (
                            <button
                              onClick={() => setSwapTarget(scheduled.id)}
                              className="text-xs px-2.5 py-1 bg-brand-slate/20 text-brand-slate border border-brand-slate/30 rounded-full hover:bg-brand-slate/30 transition-colors font-medium"
                            >
                              Swap
                            </button>
                          )}
                          <button
                            onClick={() => unscheduleMeal(scheduled.id)}
                            className="text-xs px-2 py-1 text-brand-muted/40 hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssignTarget({ date, mealTime })}
                        className="flex-1 text-left text-xs text-brand-muted/30 hover:text-brand-accent transition-colors py-1"
                      >
                        + Assign meal
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
      {swapTarget && <SwapModal scheduledMealId={swapTarget} onClose={() => setSwapTarget(null)} />}
      {assignTarget && (
        <AssignModal date={assignTarget.date} mealTime={assignTarget.mealTime} onClose={() => setAssignTarget(null)} />
      )}
    </div>
  );
}

// ── Desktop inventory + alerts rail ──────────────────────────
function DesktopInventoryRail({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const preparedMeals     = useAppStore((s) => s.preparedMeals);
  const appNotifications  = useAppStore((s) => s.appNotifications);
  const getDaysRemaining  = useAppStore((s) => s.getDaysRemaining);

  const available = preparedMeals
    .filter((m) => m.servingsRemaining > 0)
    .sort((a, b) => getDaysRemaining(a) - getDaysRemaining(b))
    .slice(0, 4);

  const unread = appNotifications.filter((n) => !n.read);

  return (
    <div className="hidden lg:flex flex-col gap-5 sticky top-6">
      {/* Inventory rail */}
      <div className="bg-brand-surface rounded-xl border border-brand-muted/15 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-muted/10">
          <p className="text-xs font-semibold text-brand-muted/60 uppercase tracking-wide">Inventory</p>
          <button
            onClick={() => onNavigate('prep')}
            className="text-xs text-brand-accent font-medium hover:text-brand-accent/80 transition-colors"
          >
            + Log prep
          </button>
        </div>

        {available.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-brand-muted/40">No meals in inventory</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-muted/10">
            {available.map((meal) => {
              const days = getDaysRemaining(meal);
              const isExpiring = days <= 2;
              const barColor = isExpiring ? 'bg-amber-400' : 'bg-emerald-500';
              const shelfLife = meal.storage === 'refrigerated' ? 4 : 90;
              const pct = Math.max(0, Math.min(100, (days / shelfLife) * 100));
              return (
                <div key={meal.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-brand-muted leading-tight truncate flex-1">{meal.recipeName}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      meal.storage === 'refrigerated'
                        ? 'bg-brand-slate/20 text-brand-slate'
                        : 'bg-brand-raised text-brand-muted/50'
                    }`}>
                      {meal.storage === 'refrigerated' ? 'Fridge' : 'Frozen'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-brand-muted/50">{meal.servingsRemaining} serving{meal.servingsRemaining !== 1 ? 's' : ''}</p>
                    <p className={`text-[11px] font-medium ${isExpiring ? 'text-amber-400' : 'text-brand-muted/40'}`}>
                      {days > 0 ? `${days}d left` : 'Expired'}
                    </p>
                  </div>
                  <div className="h-1 bg-brand-bg rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-brand-muted/10">
          <button
            onClick={() => onNavigate('meals')}
            className="text-xs text-brand-accent font-medium hover:text-brand-accent/80 transition-colors"
          >
            View all in Ready
          </button>
        </div>
      </div>

      {/* Alerts rail */}
      {unread.length > 0 && (
        <div className="bg-brand-surface rounded-xl border border-brand-muted/15 overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-muted/10">
            <p className="text-xs font-semibold text-brand-muted/60 uppercase tracking-wide">Alerts</p>
          </div>
          <div className="divide-y divide-brand-muted/10">
            {unread.map((n) => (
              <div key={n.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <p className={`text-sm leading-snug flex-1 ${n.type === 'expiry' ? 'text-amber-400' : 'text-brand-muted/70'}`}>
                  {n.title}
                </p>
                <button
                  onClick={() => onNavigate('plan')}
                  className="text-xs text-brand-accent font-medium shrink-0 hover:text-brand-accent/80 transition-colors"
                >
                  Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Desktop weekly grid ───────────────────────────────────────
function DesktopWeeklyGrid() {
  const scheduledMeals    = useAppStore((s) => s.scheduledMeals);
  const preparedMeals     = useAppStore((s) => s.preparedMeals);
  const eatenScheduledIds = useAppStore((s) => s.eatenScheduledIds);
  const getFreshnessStatus = useAppStore((s) => s.getFreshnessStatus);
  const [assignTarget, setAssignTarget] = useState<{ date: string; mealTime: MealTime } | null>(null);
  const weekDates = getWeekDates();
  const today = format(new Date());

  return (
    <div>
      <div className="lg:grid lg:grid-cols-7 lg:gap-2">
        {weekDates.map((date) => {
          const isToday = date === today;
          const dayCalories = MEAL_TIMES.reduce((sum, mt) => {
            const s = scheduledMeals.find(s => s.date === date && s.mealTime === mt);
            const m = s ? preparedMeals.find(m => m.id === s.preparedMealId) : undefined;
            return sum + (m?.nutrientsPerServing?.calories ?? 0);
          }, 0);

          return (
            <div
              key={date}
              className={`rounded-xl border overflow-hidden ${
                isToday
                  ? 'border-brand-accent bg-brand-accent/5'
                  : 'border-brand-muted/10 bg-brand-surface'
              }`}
            >
              {/* Day header */}
              <div className={`px-2 pt-2.5 pb-1.5 ${isToday ? 'bg-brand-accent/10' : 'bg-brand-raised/40'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-brand-accent' : 'text-brand-muted/50'}`}>
                  {getDayLabel(date)}
                </p>
                <p className={`text-xs font-medium ${isToday ? 'text-brand-accent/80' : 'text-brand-muted/40'}`}>
                  {parseISO(date).getDate()}
                </p>
                {dayCalories > 0 && (
                  <p className="text-[10px] text-brand-accent/70 mt-0.5">{Math.round(dayCalories)}</p>
                )}
              </div>

              {/* Meal slots */}
              <div className="p-1.5 space-y-1">
                {MEAL_TIMES.map((mealTime) => {
                  const scheduled = scheduledMeals.find(s => s.date === date && s.mealTime === mealTime);
                  const meal = scheduled ? preparedMeals.find(m => m.id === scheduled.preparedMealId) : undefined;
                  const isEaten = scheduled ? eatenScheduledIds.includes(scheduled.id) : false;
                  const freshness = meal ? getFreshnessStatus(meal) : 'fresh';
                  const isExpiring = freshness === 'expiring' || freshness === 'expired';

                  if (meal && scheduled) {
                    return (
                      <div
                        key={mealTime}
                        className={`px-1.5 py-1.5 rounded-lg border text-left w-full ${
                          isExpiring
                            ? 'border-amber-600/50 bg-amber-900/10'
                            : 'border-brand-muted/10 bg-brand-bg/60'
                        }`}
                      >
                        <p className="text-[10px] text-brand-muted/40 uppercase leading-none mb-0.5">
                          {MEAL_TIME_LABELS[mealTime].slice(0, 4)}
                        </p>
                        <p className="text-[11px] font-medium text-brand-muted leading-tight truncate">
                          {meal.recipeName}
                        </p>
                        {meal.nutrientsPerServing && (
                          <p className="text-[10px] text-brand-muted/40 mt-0.5">
                            {Math.round(meal.nutrientsPerServing.calories)} cal
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-0.5">
                          {isEaten && (
                            <span className="text-[10px] text-brand-accent/80 font-medium">✓</span>
                          )}
                          {isExpiring && (
                            <span className="text-[10px] text-amber-400 font-medium">!</span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={mealTime}
                      onClick={() => setAssignTarget({ date, mealTime })}
                      className="w-full px-1.5 py-1.5 rounded-lg border border-dashed border-brand-muted/15 hover:border-brand-accent/40 hover:bg-brand-accent/5 transition-colors text-left"
                    >
                      <p className="text-[10px] text-brand-muted/25 hover:text-brand-accent/50 transition-colors">
                        + {MEAL_TIME_LABELS[mealTime].slice(0, 4)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {assignTarget && (
        <AssignModal
          date={assignTarget.date}
          mealTime={assignTarget.mealTime}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}

// ── Desktop week strip (summary bar) ─────────────────────────
function DesktopWeekStrip() {
  const scheduledMeals    = useAppStore((s) => s.scheduledMeals);
  const preparedMeals     = useAppStore((s) => s.preparedMeals);
  const mealEatenDates    = useAppStore((s) => s.mealEatenDates);
  const prepSessionsLogged = useAppStore((s) => s.prepSessionsLogged);
  const userPrefs         = useAppStore((s) => s.userPrefs);

  const weekDates     = getWeekDates();
  const weekScheduled = scheduledMeals.filter(s => weekDates.includes(s.date));
  const available     = preparedMeals.filter(m => m.servingsRemaining > 0);
  const target        = userPrefs?.mealsPerWeek ?? null;
  const weekEaten     = mealEatenDates.filter(d => weekDates.includes(d)).length;
  const pct           = target ? Math.min(100, Math.round((weekScheduled.length / target) * 100)) : null;
  const gap           = target ? Math.max(0, target - weekScheduled.length) : null;
  const streak        = computeWeekStreak(mealEatenDates);

  return (
    <div className="hidden lg:flex gap-4 mt-4 bg-brand-surface rounded-xl border border-brand-muted/10 px-5 py-3">
      {/* Meals scheduled */}
      <div className="flex-1 flex flex-col gap-0.5">
        <p className="text-[10px] text-brand-muted/40 uppercase tracking-wide">Meals scheduled</p>
        <p className="text-sm font-semibold text-brand-muted">
          {weekScheduled.length}{target !== null && <span className="text-brand-muted/40 font-normal"> / {target}</span>}
        </p>
        {pct !== null && (
          <div className="h-1 bg-brand-bg rounded-full overflow-hidden mt-0.5">
            <div className="h-full bg-brand-accent rounded-full" style={{ width: `${pct}%` }} />
          </div>
        )}
        {gap !== null && gap > 0 && (
          <p className="text-[10px] text-brand-muted/30">{gap} to target</p>
        )}
      </div>

      {/* Eaten this week */}
      <div className="flex-1 flex flex-col gap-0.5">
        <p className="text-[10px] text-brand-muted/40 uppercase tracking-wide">Eaten</p>
        <p className="text-sm font-semibold text-brand-muted">{weekEaten}</p>
        <p className="text-[10px] text-brand-muted/30">this week</p>
      </div>

      {/* In inventory */}
      <div className="flex-1 flex flex-col gap-0.5">
        <p className="text-[10px] text-brand-muted/40 uppercase tracking-wide">In inventory</p>
        <p className="text-sm font-semibold text-brand-muted">{available.length}</p>
        <p className="text-[10px] text-brand-muted/30">meals ready</p>
      </div>

      {/* Streak */}
      <div className="flex-1 flex flex-col gap-0.5">
        <p className="text-[10px] text-brand-muted/40 uppercase tracking-wide">Streak</p>
        <p className="text-sm font-semibold text-brand-muted">{streak} wk{streak !== 1 ? 's' : ''}</p>
        <p className="text-[10px] text-brand-muted/30">consecutive</p>
      </div>

      {/* Prep sessions */}
      <div className="flex-1 flex flex-col gap-0.5">
        <p className="text-[10px] text-brand-muted/40 uppercase tracking-wide">Prep sessions</p>
        <p className="text-sm font-semibold text-brand-muted">{prepSessionsLogged}</p>
        <p className="text-[10px] text-brand-muted/30">total logged</p>
      </div>
    </div>
  );
}

export default function ScheduleScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const subTab = useAppStore((s) => s.calendarSubTab);
  const setSubTab = useAppStore((s) => s.setCalendarSubTab);
  const [desktopView, setDesktopView] = useState<'weekly' | 'daily'>('weekly');

  const weekDates = getWeekDates();
  const monday = weekDates[0];
  const sunday = weekDates[6];

  return (
    <div className="lg:grid lg:grid-cols-[1fr_312px] lg:gap-10 lg:items-start">
      {/* Left column: schedule content */}
      <div>
        {/* ── Mobile tab toggle (unchanged) ───────────────────── */}
        <div className="flex lg:hidden bg-brand-surface rounded-lg border border-brand-muted/15 p-1 mb-5">
          <button
            onClick={() => setSubTab('daily')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${subTab === 'daily' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/50 hover:text-brand-muted/70'}`}
          >
            Daily
          </button>
          <button
            onClick={() => setSubTab('weekly')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${subTab === 'weekly' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/50 hover:text-brand-muted/70'}`}
          >
            Weekly
          </button>
        </div>

        {/* ── Mobile content (unchanged) ──────────────────────── */}
        <div className="lg:hidden">
          {subTab === 'daily' && <DailyView onNavigate={onNavigate} />}
          {subTab === 'weekly' && <WeeklyView />}
        </div>

        {/* ── Desktop calendar header ──────────────────────────── */}
        <div className="hidden lg:block mb-5">
          <p className="text-[11px] font-semibold text-brand-accent/80 uppercase tracking-widest mb-1">
            WEEK OF {formatDisplay(monday)} – {formatDisplay(sunday)}
          </p>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold text-brand-muted">
              {formatDisplay(monday)} – {formatDisplay(sunday)}
            </h1>
            {/* Daily/Weekly segmented toggle */}
            <div className="flex bg-brand-surface rounded-lg border border-brand-muted/15 p-0.5 shrink-0">
              <button
                onClick={() => setDesktopView('weekly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${desktopView === 'weekly' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/50 hover:text-brand-muted/70'}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setDesktopView('daily')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${desktopView === 'daily' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/50 hover:text-brand-muted/70'}`}
              >
                Daily
              </button>
            </div>
          </div>
        </div>

        {/* ── Desktop: weekly 7-column grid ───────────────────── */}
        {desktopView === 'weekly' && (
          <div className="hidden lg:block">
            <DesktopWeeklyGrid />
            <DesktopWeekStrip />
          </div>
        )}

        {/* ── Desktop: daily view ──────────────────────────────── */}
        {desktopView === 'daily' && (
          <div className="hidden lg:block">
            <DailyView onNavigate={onNavigate} />
          </div>
        )}

        {/* Hide This Week + Momentum sections on desktop (shown in week strip) */}
      </div>

      {/* Right column: desktop-only rails */}
      <DesktopInventoryRail onNavigate={onNavigate} />
    </div>
  );
}
