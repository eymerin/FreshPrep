import React, { useState } from 'react';
import { useAppStore } from '../store';
import { PendingPrep, PrepEvent, StorageType } from '../types';
import { addDays, computeWeekStreak, format } from '../utils/dates';

function uid() { return Math.random().toString(36).slice(2, 10); }

// ── Pending prep card (from Plan) ─────────────────────────────
function PendingCard({ pending }: { pending: PendingPrep }) {
  const recipes = useAppStore((s) => s.recipes);
  const markPrepComplete = useAppStore((s) => s.markPrepComplete);
  const removePendingPrep = useAppStore((s) => s.removePendingPrep);

  const recipe = recipes.find((r) => r.id === pending.recipeId);
  const [storage, setStorage] = useState<StorageType>('refrigerated');
  const [resolvedVariantId, setResolvedVariantId] = useState(pending.variantId || '');
  const [resolvedSlots, setResolvedSlots] = useState<Record<string, string>>(() => {
    // Pre-fill single picks
    const init: Record<string, string> = {};
    if (pending.slotPicks) {
      for (const [slotId, picks] of Object.entries(pending.slotPicks)) {
        if (picks.length === 1) init[slotId] = picks[0];
      }
    }
    return init;
  });

  const needsVariantResolution = (pending.pendingVariants?.length ?? 0) > 1;
  const needsSlotResolution = recipe?.type === 'composed' && recipe.slots?.some(
    (s) => (pending.slotPicks?.[s.id] || []).length > 1
  );
  const allSlotsResolved = !recipe?.slots || recipe.slots.every((s) => resolvedSlots[s.id]);
  const canComplete = (!needsVariantResolution || !!resolvedVariantId) && allSlotsResolved;

  // Build display label
  let displayName = '';
  if (recipe?.type === 'composed') {
    const parts = (recipe.slots || []).map((s) => resolvedSlots[s.id] || (pending.slotPicks?.[s.id]?.[0]));
    displayName = parts.filter(Boolean).join(' · ');
  } else {
    displayName = pending.variantName || (pending.pendingVariants?.[0]?.name ?? recipe?.name ?? '');
  }

  return (
    <div className="bg-brand-surface rounded-lg border border-brand-muted/15 overflow-hidden">
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-sm font-medium text-brand-muted">{pending.recipeName}</p>
          {displayName && displayName !== pending.recipeName && (
            <p className="text-xs text-brand-muted/50 mt-0.5">{displayName}</p>
          )}
          <p className="text-xs text-brand-muted/40 mt-0.5">{pending.servings} serving{pending.servings !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => removePendingPrep(pending.id)} className="text-brand-muted/25 hover:text-red-400 transition-colors text-xl leading-none">×</button>
      </div>

      {/* Resolve flexible variant */}
      {needsVariantResolution && (
        <div className="px-4 pb-3">
          <p className="text-xs text-brand-muted/50 mb-2">Which variant did you make?</p>
          <div className="flex flex-wrap gap-2">
            {pending.pendingVariants!.map((v) => (
              <button
                key={v.id}
                onClick={() => setResolvedVariantId(v.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  resolvedVariantId === v.id
                    ? 'bg-brand-accent text-white border-brand-accent'
                    : 'bg-brand-bg text-brand-muted/60 border-brand-muted/20 hover:border-brand-accent/50'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resolve flexible slots */}
      {needsSlotResolution && recipe?.slots?.map((slot) => {
        const picks = pending.slotPicks?.[slot.id] || [];
        if (picks.length <= 1) return null;
        return (
          <div key={slot.id} className="px-4 pb-3">
            <p className="text-xs text-brand-muted/50 mb-2">Which {slot.label.toLowerCase()} did you use?</p>
            <div className="flex flex-wrap gap-2">
              {picks.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setResolvedSlots((prev) => ({ ...prev, [slot.id]: opt }))}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    resolvedSlots[slot.id] === opt
                      ? 'bg-brand-accent text-white border-brand-accent'
                      : 'bg-brand-bg text-brand-muted/60 border-brand-muted/20 hover:border-brand-accent/50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Storage + complete */}
      <div className="px-4 pb-4 space-y-3 border-t border-brand-muted/10 pt-3">
        <div className="flex gap-2">
          {(['refrigerated', 'frozen'] as StorageType[]).map((type) => (
            <button
              key={type}
              onClick={() => setStorage(type)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                storage === type
                  ? 'bg-brand-slate text-white border-brand-slate'
                  : 'bg-brand-bg text-brand-muted/50 border-brand-muted/20 hover:border-brand-slate/50'
              }`}
            >
              {type === 'refrigerated' ? '❄️ Refrigerated' : '🧊 Frozen'}
            </button>
          ))}
        </div>
        <button
          disabled={!canComplete}
          onClick={() => markPrepComplete(pending.id, storage, resolvedSlots, resolvedVariantId || undefined)}
          className="w-full py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ✓ Mark as Prepped
        </button>
      </div>
    </div>
  );
}

// ── Manual log form ───────────────────────────────────────────
export default function PrepScreen() {
  const recipes            = useAppStore((s) => s.recipes);
  const logPrepEvent       = useAppStore((s) => s.logPrepEvent);
  const pendingPreps       = useAppStore((s) => s.pendingPreps);
  const preparedMeals      = useAppStore((s) => s.preparedMeals);
  const prepSessionsLogged = useAppStore((s) => s.prepSessionsLogged);
  const mealEatenDates     = useAppStore((s) => s.mealEatenDates);
  const userPrefs          = useAppStore((s) => s.userPrefs);

  const [recipeId, setRecipeId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [slotPicks, setSlotPicks] = useState<Record<string, string>>({});
  const [servings, setServings] = useState(4);
  const [prepDate, setPrepDate] = useState(format(new Date()));
  const [storage, setStorage] = useState<StorageType>('refrigerated');
  const [success, setSuccess] = useState(false);

  const recipe = recipes.find((r) => r.id === recipeId);
  const isComposed = recipe?.type === 'composed';
  const allSlotsPicked = isComposed ? (recipe?.slots || []).every((s) => slotPicks[s.id]) : !!variantId;
  const canSubmit = !!recipeId && (isComposed ? allSlotsPicked : (allSlotsPicked || recipe?.variants.length === 0));

  const inputClass = 'w-full bg-brand-bg border border-brand-muted/20 rounded-lg px-3 py-2 text-sm text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-transparent';

  function handleRecipeChange(id: string) { setRecipeId(id); setVariantId(''); setSlotPicks({}); }
  function pickSlot(slotId: string, option: string) { setSlotPicks((prev) => ({ ...prev, [slotId]: option })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const event: PrepEvent = isComposed
      ? { id: uid(), recipeId, slotPicks, servings, prepDate, storage }
      : { id: uid(), recipeId, variantId: variantId || undefined, servings, prepDate, storage };
    logPrepEvent(event);
    setRecipeId(''); setVariantId(''); setSlotPicks({}); setServings(4);
    setPrepDate(format(new Date())); setStorage('refrigerated');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 5000);
  }

  return (
    <div>
      {/* ── Screen heading ── */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-brand-muted">Log Prep</h2>
        <p className="text-sm text-brand-muted/50 mt-1">
          {pendingPreps.length > 0
            ? `${pendingPreps.length} meal${pendingPreps.length !== 1 ? 's' : ''} from your plan ready to confirm.`
            : 'Record what you cooked to track it all week.'}
        </p>
      </div>

      {/* ── From Plan queue ── */}
      {pendingPreps.length > 0 && (
        <div className="mb-6">
          <div className="space-y-3">
            {pendingPreps.map((p) => <PendingCard key={p.id} pending={p} />)}
          </div>
          <div className="border-t border-brand-muted/10 mt-6 pt-5">
            <p className="text-xs text-brand-muted/40 mb-4">Or log a different meal manually:</p>
          </div>
        </div>
      )}

      {success && (() => {
        const available = preparedMeals.filter((m) => m.servingsRemaining > 0).length;
        const streak    = computeWeekStreak(mealEatenDates);

        // Coverage estimate: how many days does current inventory cover?
        const mealsPerDay   = userPrefs ? userPrefs.mealsPerWeek / 7 : 1;
        const coverageDays  = available > 0 ? Math.round(available / mealsPerDay) : 0;
        const setForWeek    = coverageDays >= 7;
        const coverageLabel = (!setForWeek && coverageDays > 0)
          ? addDays(new Date(), coverageDays - 1).toLocaleDateString('en-US', { weekday: 'long' })
          : null;

        const coverageLine = setForWeek
          ? "You're set for the week."
          : coverageLabel
          ? `Covered through ${coverageLabel}.`
          : null;

        return (
          <div className="mb-5 bg-brand-surface rounded-xl border border-brand-accent/25 p-4 cursor-pointer" onClick={() => setSuccess(false)}>
            {/* Benefit-first headline */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-base font-semibold text-brand-muted leading-snug">
                  {available} meal{available !== 1 ? 's' : ''} ready.
                </p>
                {coverageLine && (
                  <p className="text-sm text-brand-muted/50 mt-0.5">{coverageLine}</p>
                )}
              </div>
              <div className="w-7 h-7 rounded-full bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-brand-accent text-xs font-bold">✓</span>
              </div>
            </div>

            {/* Stat chips */}
            <div className="flex gap-2 mb-2.5">
              <div className="flex-1 bg-brand-bg rounded-lg px-3 py-2.5">
                <p className="text-[11px] text-brand-muted/40 mb-1">In inventory</p>
                <p className="text-sm font-semibold text-brand-muted leading-none">{available}</p>
              </div>
              {streak > 0 && (
                <div className="flex-1 bg-brand-bg rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-brand-muted/40 mb-1">Streak</p>
                  <p className="text-sm font-semibold text-brand-muted leading-none">
                    {streak} wk{streak !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              <div className="flex-1 bg-brand-bg rounded-lg px-3 py-2.5">
                <p className="text-[11px] text-brand-muted/40 mb-1">Session</p>
                <p className="text-sm font-semibold text-brand-muted leading-none">#{prepSessionsLogged}</p>
              </div>
            </div>

            {/* Contextual bottom line */}
            {streak >= 2 && (
              <p className="text-xs text-brand-accent/70">{streak}-week consistency streak.</p>
            )}
            {streak === 1 && (
              <p className="text-xs text-brand-muted/40">First week active. Keep going.</p>
            )}
            {streak === 0 && prepSessionsLogged === 1 && (
              <p className="text-xs text-brand-muted/40">Head to Calendar to schedule your meals.</p>
            )}
          </div>
        );
      })()}

      <form onSubmit={handleSubmit} className="bg-brand-surface rounded-lg border border-brand-muted/15 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-brand-muted/70 mb-1.5">Recipe</label>
          <select value={recipeId} onChange={(e) => handleRecipeChange(e.target.value)} required className={inputClass}>
            <option value="">Select a recipe...</option>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {recipe && isComposed && recipe.slots?.map((slot) => (
          <div key={slot.id}>
            <label className="block text-sm font-medium text-brand-muted/70 mb-2">{slot.label}</label>
            <div className="flex flex-wrap gap-2">
              {slot.options.map((opt) => (
                <button key={opt.name} type="button" onClick={() => pickSlot(slot.id, opt.name)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${slotPicks[slot.id] === opt.name ? 'bg-brand-accent text-white border-brand-accent' : 'bg-brand-bg text-brand-muted/60 border-brand-muted/20 hover:border-brand-accent/50'}`}>
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        {recipe && !isComposed && recipe.variants.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-brand-muted/70 mb-1.5">Variant</label>
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)} required className={inputClass}>
              <option value="">Select a variant...</option>
              {recipe.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}

        {recipe && isComposed && allSlotsPicked && (
          <div className="px-3 py-2 bg-brand-bg rounded-lg border border-brand-muted/10">
            <p className="text-xs text-brand-muted/40 mb-1">Your plate</p>
            <p className="text-sm text-brand-muted/80">{(recipe.slots || []).map((s) => slotPicks[s.id]).filter(Boolean).join(' · ')}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-brand-muted/70 mb-1.5">Servings</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} className="w-8 h-8 rounded-full border border-brand-muted/20 text-brand-muted/60 hover:border-brand-accent hover:text-brand-accent flex items-center justify-center text-lg font-light transition-colors">−</button>
            <span className="text-lg font-semibold text-brand-muted w-8 text-center">{servings}</span>
            <button type="button" onClick={() => setServings((s) => s + 1)} className="w-8 h-8 rounded-full border border-brand-muted/20 text-brand-muted/60 hover:border-brand-accent hover:text-brand-accent flex items-center justify-center text-lg font-light transition-colors">+</button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-muted/70 mb-1.5">Prep Date</label>
          <input type="date" value={prepDate} onChange={(e) => setPrepDate(e.target.value)} required className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-muted/70 mb-2">Storage</label>
          <div className="flex gap-3">
            {(['refrigerated', 'frozen'] as StorageType[]).map((type) => (
              <button key={type} type="button" onClick={() => setStorage(type)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${storage === type ? 'bg-brand-slate text-white border-brand-slate' : 'bg-brand-bg text-brand-muted/60 border-brand-muted/20 hover:border-brand-slate/50'}`}>
                {type === 'refrigerated' ? 'Refrigerated' : 'Frozen'}
              </button>
            ))}
          </div>
          <p className="text-xs text-brand-muted/30 mt-2">{storage === 'refrigerated' ? 'Fresh for 4 days' : 'Fresh for 90 days'}</p>
        </div>

        <button type="submit" disabled={!canSubmit} className="w-full bg-brand-accent text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          Log Prep Session
        </button>
      </form>
    </div>
  );
}
