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


type MealFilter = 'all' | 'fridge' | 'frozen' | 'expiring' | 'unscheduled';

// ── Meal card (shared between card and list views) ────────────
function MealCard({
  meal,
  viewMode,
  assignedCount,
  onSchedule,
  onRemove,
  confirmRemoveId,
  setConfirmRemoveId,
}: {
  meal: PreparedMeal;
  viewMode: 'card' | 'list';
  assignedCount: number;
  onSchedule: () => void;
  onRemove: () => void;
  confirmRemoveId: string | null;
  setConfirmRemoveId: (id: string | null) => void;
}) {
  const unassigned = meal.servingsRemaining - assignedCount;
  const getFreshnessStatus = useAppStore((s) => s.getFreshnessStatus);
  const getDaysRemaining   = useAppStore((s) => s.getDaysRemaining);
  const getExpirationDate  = useAppStore((s) => s.getExpirationDate);
  const status      = getFreshnessStatus(meal);
  const days        = getDaysRemaining(meal);
  const expDate     = getExpirationDate(meal);
  const shelfLife   = meal.storage === 'refrigerated' ? 4 : 90;
  const freshPct    = Math.max(0, Math.min(100, (days / shelfLife) * 100));
  const isFridge    = meal.storage === 'refrigerated';
  const storageLabel = isFridge ? 'Fridge' : 'Frozen';

  if (viewMode === 'list') {
    const n = meal.nutrientsPerServing;
    return (
      <div className="bg-brand-surface rounded-lg border border-brand-muted/15 px-4 py-2.5 flex items-center gap-4">
        {/* Name + variant */}
        <div className="min-w-0" style={{ width: '22%' }}>
          <p className="font-semibold text-brand-muted text-sm leading-tight truncate">{meal.recipeName}</p>
          {meal.variantName && meal.variantName !== meal.recipeName && (
            <p className="text-xs text-brand-muted/50 truncate">{meal.variantName}</p>
          )}
        </div>
        {/* Storage + servings */}
        <div className="flex items-center gap-3 shrink-0" style={{ width: '14%' }}>
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-muted/60">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isFridge ? 'bg-brand-accent' : 'bg-brand-slate'}`} />
            {storageLabel}
          </span>
          <span className="text-xs text-brand-muted/40">{meal.servingsRemaining} srv</span>
        </div>
        {/* Macros — 4 columns */}
        {n ? (
          <div className="flex gap-5 shrink-0" style={{ width: '38%' }}>
            {[
              { val: Math.round(n.calories), label: 'cal' },
              { val: Math.round(n.protein),  label: 'protein' },
              { val: Math.round(n.carbs),    label: 'carbs' },
              { val: Math.round(n.fat),      label: 'fat' },
            ].map(({ val, label }) => (
              <div key={label} className="flex flex-col min-w-[36px]">
                <span className="text-sm font-semibold text-brand-muted leading-none">
                  {val}{label !== 'cal' ? 'g' : ''}
                </span>
                <span className="text-[10px] text-brand-muted/40 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1" style={{ width: '38%' }}>
            <span className="text-xs text-brand-muted/25 italic">No nutrition data</span>
          </div>
        )}
        {/* Actions */}
        <div className="flex gap-2 shrink-0 ml-auto">
          <button
            onClick={onSchedule}
            disabled={unassigned <= 0}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              unassigned > 0
                ? 'bg-brand-accent text-white hover:bg-brand-accent/80'
                : 'bg-brand-surface border border-brand-muted/15 text-brand-muted/25 cursor-not-allowed'
            }`}
          >
            {unassigned > 0 ? 'Schedule' : 'Scheduled'}
          </button>
          {confirmRemoveId === meal.id ? (
            <>
              <button onClick={onRemove} className="text-xs text-red-400 px-2 py-1">Remove</button>
              <button onClick={() => setConfirmRemoveId(null)} className="text-xs text-brand-muted/40 px-2 py-1">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmRemoveId(meal.id)} className="text-brand-muted/30 hover:text-red-400 transition-colors text-sm px-1">×</button>
          )}
        </div>
      </div>
    );
  }

  // Status pill colours matching v5 CSS custom properties
  const storagePillCls = isFridge
    ? 'bg-brand-accent/15 text-emerald-300/80'
    : 'bg-brand-slate/20 text-brand-slate';
  const freshnessPillCls = status === 'fresh'
    ? 'bg-emerald-900/20 text-emerald-300'
    : status === 'expiring'
    ? 'bg-amber-900/20 text-amber-300'
    : 'bg-red-400/10 text-red-400';
  const freshnessLabel = status === 'fresh' ? 'Fresh' : status === 'expiring' ? 'Expiring soon' : 'Expired';
  const barCls = status === 'fresh' ? 'bg-emerald-500' : status === 'expiring' ? 'bg-amber-400' : 'bg-red-500';
  const expiryText = days > 0 ? `${days}d · ${formatDisplay(expDate)}` : `Expired ${formatDisplay(expDate)}`;

  return (
    <div className="bg-brand-surface rounded-xl border border-brand-muted/15 p-4 flex flex-col gap-[11px] relative">

      {/* 1. Head — name + variant left, storage pill right */}
      <div className="flex items-start justify-between gap-[10px]">
        <div>
          <p className="text-[14px] font-semibold text-brand-muted leading-[1.25]">{meal.recipeName}</p>
          {meal.variantName && meal.variantName !== meal.recipeName && (
            <p className="text-[12px] text-brand-muted/50 mt-[2px]">{meal.variantName}</p>
          )}
        </div>
        <span className={`inline-flex items-center gap-[6px] text-[11px] font-semibold px-[9px] py-[3px] rounded-full shrink-0 ${storagePillCls}`}>
          <span className="w-[6px] h-[6px] rounded-full bg-current shrink-0" />
          {storageLabel}
        </span>
      </div>

      {/* 2. Meta — "Prepped date · N servings · N unscheduled" */}
      <div className="flex gap-[14px] flex-wrap text-[11px] text-brand-muted/50">
        <span>Prepped {formatDisplay(meal.prepDate)}</span>
        <span><span className="font-semibold text-brand-muted">{meal.servingsRemaining}</span> servings</span>
        {unassigned > 0
          ? <span><span className="font-semibold text-brand-muted">{unassigned}</span> unscheduled</span>
          : <span className="text-brand-muted/35">Fully scheduled</span>
        }
      </div>

      {/* 3. Freshness block — status pill + days/date, then progress bar */}
      <div>
        <div className="flex items-center justify-between mb-[6px] gap-[8px]">
          <span className={`inline-flex items-center text-[11px] font-semibold px-[9px] py-[3px] rounded-full ${freshnessPillCls}`}>
            {freshnessLabel}
          </span>
          <span className="text-[11px] text-brand-muted/60">{expiryText}</span>
        </div>
        <div className="h-[4px] bg-brand-bg rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${freshPct}%` }} />
        </div>
      </div>

      {/* 4. Macros mini — border-top, 4 stacked value/label columns */}
      <div className="flex gap-[12px] pt-[10px] border-t border-brand-muted/[0.08] text-[11px] text-brand-muted/50">
        {meal.nutrientsPerServing ? (
          [
            { val: Math.round(meal.nutrientsPerServing.calories), label: 'cal' },
            { val: Math.round(meal.nutrientsPerServing.protein),  label: 'protein' },
            { val: Math.round(meal.nutrientsPerServing.carbs),    label: 'carbs' },
            { val: Math.round(meal.nutrientsPerServing.fat),      label: 'fat' },
          ].map(({ val, label }) => (
            <div key={label} className="flex flex-col">
              <span className="text-[12px] font-semibold text-brand-muted">{val}{label !== 'cal' ? 'g' : ''}</span>
              <span>{label}</span>
            </div>
          ))
        ) : (
          <span className="text-brand-muted/25 italic">No nutrition data</span>
        )}
      </div>

      {/* 5. Actions — border-top, Schedule (flex-1) + trash icon */}
      <div className="flex gap-[6px] pt-[10px] border-t border-brand-muted/[0.08]">
        <button
          onClick={onSchedule}
          disabled={unassigned <= 0}
          className={`flex-1 py-[5px] px-[10px] text-[12px] font-semibold rounded-lg transition-colors ${
            unassigned > 0
              ? 'bg-brand-accent text-white hover:bg-brand-accent/80'
              : 'border border-brand-muted/15 text-brand-muted/30 cursor-not-allowed'
          }`}
        >
          {unassigned > 0 ? 'Schedule' : 'Fully scheduled'}
        </button>
        {confirmRemoveId === meal.id ? (
          <div className="flex items-center gap-1.5">
            <button onClick={onRemove} className="text-xs text-red-400 px-2 py-1">Yes</button>
            <button onClick={() => setConfirmRemoveId(null)} className="text-xs text-brand-muted/40 px-2 py-1">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRemoveId(meal.id)}
            className="w-8 h-8 flex items-center justify-center text-brand-muted/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            aria-label="Remove meal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
}

// ── Main screen ───────────────────────────────────────────────
export default function MealsScreen({ onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const preparedMeals      = useAppStore((s) => s.preparedMeals);
  const scheduledMeals     = useAppStore((s) => s.scheduledMeals);
  const removePreparedMeal = useAppStore((s) => s.removePreparedMeal);
  const getFreshnessStatus = useAppStore((s) => s.getFreshnessStatus);
  const userPrefs          = useAppStore((s) => s.userPrefs);
  const [schedulingMeal, setSchedulingMeal] = useState<PreparedMeal | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<MealFilter>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortMode, setSortMode] = useState<'urgency' | 'recent'>('urgency');

  // Desktop sidebar filters
  const [storageFilter, setStorageFilter] = useState('any');
  const [freshnessFilter, setFreshnessFilter] = useState('any');
  const [scheduleFilter, setScheduleFilter] = useState('any');

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

  function assignedCount(mealId: string) {
    return scheduledMeals.filter((s) => s.preparedMealId === mealId).length;
  }

  const sortedAll = [...available].sort((a, b) => {
    if (sortMode === 'urgency') {
      const order = { expired: 0, expiring: 1, fresh: 2 };
      return order[getFreshnessStatus(a)] - order[getFreshnessStatus(b)];
    }
    return new Date(b.prepDate).getTime() - new Date(a.prepDate).getTime();
  });

  // Filter chips counts (for mobile)
  const fridgeCount      = available.filter((m) => m.storage === 'refrigerated').length;
  const frozenCount      = available.filter((m) => m.storage === 'frozen').length;
  const expiringCount    = expiringSoon.length;
  const unscheduledCount = available.filter((m) => {
    const assigned = assignedCount(m.id);
    return m.servingsRemaining - assigned > 0;
  }).length;

  const filterChips: { id: MealFilter; label: string; count: number }[] = [
    { id: 'all',         label: 'All',         count: available.length },
    { id: 'fridge',      label: 'Fridge',      count: fridgeCount },
    { id: 'frozen',      label: 'Frozen',      count: frozenCount },
    { id: 'expiring',    label: 'Expiring',    count: expiringCount },
    { id: 'unscheduled', label: 'Unscheduled', count: unscheduledCount },
  ];

  // Apply mobile filter chips
  const mobileFiltered = sortedAll.filter((m) => {
    if (activeFilter === 'all')         return true;
    if (activeFilter === 'fridge')      return m.storage === 'refrigerated';
    if (activeFilter === 'frozen')      return m.storage === 'frozen';
    if (activeFilter === 'expiring')    return expiringSoon.includes(m);
    if (activeFilter === 'unscheduled') return m.servingsRemaining - assignedCount(m.id) > 0;
    return true;
  });

  // Apply desktop sidebar filters
  const desktopFiltered = sortedAll.filter((m) => {
    if (storageFilter === 'fridge' && m.storage !== 'refrigerated') return false;
    if (storageFilter === 'frozen' && m.storage !== 'frozen') return false;
    const freshness = getFreshnessStatus(m);
    if (freshnessFilter === 'fresh' && freshness !== 'fresh') return false;
    if (freshnessFilter === 'expiring' && freshness !== 'expiring') return false;
    if (freshnessFilter === 'expired' && freshness !== 'expired') return false;
    if (scheduleFilter === 'unscheduled' && !(m.servingsRemaining - assignedCount(m.id) > 0)) return false;
    if (scheduleFilter === 'scheduled' && m.servingsRemaining - assignedCount(m.id) > 0) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] font-bold text-brand-accent uppercase tracking-widest mb-1">Meals Ready</p>
          <h2 className="text-2xl font-semibold text-brand-muted tracking-tight">
            {available.length > 0
              ? `${available.length} prepared meal${available.length !== 1 ? 's' : ''} in inventory`
              : 'No prepared meals in inventory'}
          </h2>
          {available.length > 0 && (setForWeek || coverageDay) && (
            <p className="text-sm text-brand-accent mt-1 font-medium">
              {setForWeek ? "You're set for the week." : `Covered through ${coverageDay}.`}
            </p>
          )}
        </div>
        <button
          onClick={() => onNavigate?.('prep')}
          className="hidden lg:flex shrink-0 items-center gap-2 bg-brand-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-accent/80 transition-colors"
        >
          + Log prep session
        </button>
      </div>

      {/* Toolbar (view + sort) */}
      {available.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* View toggle — desktop only */}
          <div className="hidden lg:flex bg-brand-surface rounded-lg border border-brand-muted/15 p-0.5">
            <button
              onClick={() => setViewMode('card')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'card' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/40 hover:text-brand-muted/70'}`}
              aria-label="Card view"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/40 hover:text-brand-muted/70'}`}
              aria-label="List view"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
          {/* Sort control */}
          <div className="flex bg-brand-surface rounded-lg border border-brand-muted/15 p-0.5">
            <button
              onClick={() => setSortMode('urgency')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${sortMode === 'urgency' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/40 hover:text-brand-muted/70'}`}
            >
              By urgency
            </button>
            <button
              onClick={() => setSortMode('recent')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${sortMode === 'recent' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/40 hover:text-brand-muted/70'}`}
            >
              By recent
            </button>
          </div>
        </div>
      )}

      {/* Filter chips toolbar — mobile only */}
      {available.length > 0 && (
        <div className="flex lg:hidden gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors border ${
                activeFilter === chip.id
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-brand-surface border-brand-muted/20 text-brand-muted/60 hover:border-brand-accent/40 hover:text-brand-muted'
              }`}
            >
              {chip.label}
              <span className={`text-[10px] font-semibold ${activeFilter === chip.id ? 'text-white/80' : 'text-brand-muted/40'}`}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {expiringSoon.length > 0 && available.length > 0 && sortMode === 'urgency' && (
        <p className="text-[11px] text-brand-muted/35 mb-4 lg:hidden">
          Sorted by urgency — eat oldest meals first.
        </p>
      )}

      {/* ── Desktop 2-column layout ─────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_clamp(220px,18vw,260px)] lg:gap-8 lg:items-start">

        {/* Main content column */}
        <div>
          {desktopFiltered.length === 0 && available.length === 0 && (
            <div className="text-center py-16">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/20 mx-auto mb-4">
                <path d="M6 10h12v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7Z" />
                <line x1="5" y1="10" x2="19" y2="10" />
                <path d="M9 10V8.5C9 7.7 10.3 7 12 7s3 .7 3 1.5V10" />
              </svg>
              <p className="font-medium text-brand-muted/60">No meals in inventory</p>
              <p className="text-sm mt-1.5 text-brand-muted/40 max-w-xs mx-auto">
                Cook a batch and log it as a prep session to start tracking your meals.
              </p>
              <button
                onClick={() => onNavigate?.('prep')}
                className="mt-4 text-sm font-medium text-brand-accent hover:text-brand-accent/80 transition-colors"
              >
                Log a prep session →
              </button>
            </div>
          )}

          {desktopFiltered.length === 0 && available.length > 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-brand-muted/40">No meals match this filter.</p>
            </div>
          )}

          {/* Desktop card grid */}
          <div className={`hidden lg:block ${viewMode === 'card' ? 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3' : 'flex flex-col gap-1'}`}>
            {desktopFiltered.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                viewMode={viewMode}
                assignedCount={assignedCount(meal.id)}
                onSchedule={() => assignedCount(meal.id) < meal.servingsRemaining && setSchedulingMeal(meal)}
                onRemove={() => { removePreparedMeal(meal.id); setConfirmRemoveId(null); }}
                confirmRemoveId={confirmRemoveId}
                setConfirmRemoveId={setConfirmRemoveId}
              />
            ))}
          </div>

          {/* Mobile grid (unchanged filter logic) */}
          <div className="lg:hidden">
            {mobileFiltered.length === 0 && available.length > 0 && (
              <div className="text-center py-10">
                <p className="text-sm text-brand-muted/40">No meals match this filter.</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {mobileFiltered.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  viewMode="card"
                  assignedCount={assignedCount(meal.id)}
                  onSchedule={() => assignedCount(meal.id) < meal.servingsRemaining && setSchedulingMeal(meal)}
                  onRemove={() => { removePreparedMeal(meal.id); setConfirmRemoveId(null); }}
                  confirmRemoveId={confirmRemoveId}
                  setConfirmRemoveId={setConfirmRemoveId}
                />
              ))}
            </div>
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
        </div>

        {/* Desktop filter sidebar */}
        <div className="hidden lg:flex flex-col gap-4 sticky top-6 bg-brand-surface border border-brand-muted/10 rounded-xl p-4">

          {/* Storage */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-brand-muted/50 uppercase tracking-wider">Storage</p>
            <div className="flex items-center gap-1.5">
              <select
                value={storageFilter}
                onChange={(e) => setStorageFilter(e.target.value)}
                className="flex-1 bg-brand-bg border border-brand-muted/15 rounded-lg px-3 py-2 text-sm text-brand-muted focus:outline-none focus:border-brand-accent/60 appearance-none"
              >
                <option value="any">Any storage</option>
                <option value="fridge">Fridge</option>
                <option value="frozen">Frozen</option>
              </select>
              <button onClick={() => setStorageFilter('any')} className="text-brand-muted/30 hover:text-brand-muted/60 text-base w-6 h-6 flex items-center justify-center transition-colors">×</button>
            </div>
            <button className="text-xs text-brand-muted/40 hover:text-brand-accent/70 transition-colors text-left">+ Add storage</button>
          </div>

          <div className="h-px bg-brand-muted/8" />

          {/* Freshness */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-brand-muted/50 uppercase tracking-wider">Freshness</p>
            <div className="flex items-center gap-1.5">
              <select
                value={freshnessFilter}
                onChange={(e) => setFreshnessFilter(e.target.value)}
                className="flex-1 bg-brand-bg border border-brand-muted/15 rounded-lg px-3 py-2 text-sm text-brand-muted focus:outline-none focus:border-brand-accent/60 appearance-none"
              >
                <option value="any">Any</option>
                <option value="fresh">Fresh</option>
                <option value="expiring">Expiring soon</option>
                <option value="expired">Expired</option>
              </select>
              <button onClick={() => setFreshnessFilter('any')} className="text-brand-muted/30 hover:text-brand-muted/60 text-base w-6 h-6 flex items-center justify-center transition-colors">×</button>
            </div>
            <button className="text-xs text-brand-muted/40 hover:text-brand-accent/70 transition-colors text-left">+ Add freshness</button>
          </div>

          <div className="h-px bg-brand-muted/8" />

          {/* Schedule */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-brand-muted/50 uppercase tracking-wider">Schedule</p>
            <div className="flex items-center gap-1.5">
              <select
                value={scheduleFilter}
                onChange={(e) => setScheduleFilter(e.target.value)}
                className="flex-1 bg-brand-bg border border-brand-muted/15 rounded-lg px-3 py-2 text-sm text-brand-muted focus:outline-none focus:border-brand-accent/60 appearance-none"
              >
                <option value="any">Any</option>
                <option value="unscheduled">Unscheduled</option>
                <option value="scheduled">Fully scheduled</option>
              </select>
              <button onClick={() => setScheduleFilter('any')} className="text-brand-muted/30 hover:text-brand-muted/60 text-base w-6 h-6 flex items-center justify-center transition-colors">×</button>
            </div>
            <button className="text-xs text-brand-muted/40 hover:text-brand-accent/70 transition-colors text-left">+ Add status</button>
          </div>

        </div>
      </div>

      {schedulingMeal && (
        <ScheduleModal meal={schedulingMeal} onClose={() => setSchedulingMeal(null)} />
      )}
    </div>
  );
}
