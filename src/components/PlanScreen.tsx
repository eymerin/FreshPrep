import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { PlanEntry, Recipe } from '../types';
import { scaleQuantity } from '../utils/scale';
import { categorizeIngredient, categorizeSlotLabel, CATEGORY_ORDER } from '../utils/categorize';


// ── Helpers ───────────────────────────────────────────────────
function getEntrySummary(entry: PlanEntry, recipe: Recipe): string {
  if (recipe.type === 'composed' && recipe.slots) {
    const parts = recipe.slots
      .map((slot) => {
        const picks = entry.slotPicks[slot.id] || [];
        if (picks.length === 0) return null;
        return picks.length === 1 ? picks[0] : picks.join(' or ');
      })
      .filter(Boolean) as string[];
    if (parts.length === 0) return 'Nothing configured yet';
    if (parts.length < recipe.slots.length) return `${parts.length} of ${recipe.slots.length} components set`;
    return parts.join(' · ');
  } else {
    const selected = entry.selectedVariantIds;
    if (recipe.variants.length === 0 || selected.length === 0) return '';
    const names = recipe.variants.filter((v) => selected.includes(v.id)).map((v) => v.name);
    return selected.length === 1 ? names[0] : names.join(', ') + ' (flexible)';
  }
}

// ── Recipe picker modal ───────────────────────────────────────
function RecipePicker({ onSelect, onClose, onNavigate }: {
  onSelect: (id: string) => void;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}) {
  const recipes = useAppStore((s) => s.recipes);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-brand-surface border border-brand-muted/15 rounded-xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-brand-muted/10 flex items-center justify-between">
          <h3 className="font-semibold text-brand-muted">Add to Plan</h3>
          <button onClick={onClose} className="text-brand-muted/40 hover:text-brand-muted text-lg leading-none">×</button>
        </div>
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {recipes.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-brand-muted/60">No recipes yet.</p>
              <p className="text-xs text-brand-muted/40">Build your first recipe, then come back to plan your week.</p>
              <button
                onClick={() => { onClose(); onNavigate('recipes'); }}
                className="mt-1 text-sm text-brand-accent font-medium"
              >
                Go to Recipes →
              </button>
            </div>
          ) : (
            recipes.map((r) => (
              <button
                key={r.id}
                onClick={() => { onSelect(r.id); onClose(); }}
                className="w-full text-left px-3 py-3 rounded-lg border border-brand-muted/15 hover:border-brand-accent hover:bg-brand-accent/10 transition-colors"
              >
                <p className="text-sm font-medium text-brand-muted">{r.name}</p>
                <p className="text-xs text-brand-muted/50 mt-0.5">
                  {r.type === 'composed'
                    ? '1 meal per build'
                    : `Makes ${r.serves ?? 4} meals`}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Collapsible plan entry card ───────────────────────────────
function EntryCard({ entry, recipe, entryNumber }: { entry: PlanEntry; recipe: Recipe; entryNumber: number }) {
  const collapsed = useAppStore((s) => !!s.collapsedEntries[entry.id]);
  const toggleCollapsed = useAppStore((s) => s.toggleEntryCollapsed);
  const toggleVariant = useAppStore((s) => s.togglePlanVariant);
  const toggleSlot = useAppStore((s) => s.togglePlanSlotOption);
  const removeEntry = useAppStore((s) => s.removePlanEntry);
  const sameRecipeCount = useAppStore((s) => s.planEntries.filter((e) => e.recipeId === entry.recipeId).length);
  const updateServings = useAppStore((s) => s.updatePlanServings);
  const hasContent = recipe.type === 'composed' ? (recipe.slots?.length ?? 0) > 0 : recipe.variants.length > 0;
  const summary = getEntrySummary(entry, recipe);

  return (
    <div className="bg-brand-surface rounded-lg border border-brand-muted/15 overflow-hidden">
      {/* Header — always visible */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => hasContent && toggleCollapsed(entry.id)}
          className={`flex-1 text-left min-w-0 ${!hasContent ? 'cursor-default' : ''}`}
        >
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-brand-muted">
              {recipe.name}{sameRecipeCount > 1 ? ` — Meal ${entryNumber}` : ''}
            </p>
            {hasContent && (
              <span className="text-brand-muted/30 text-xs">{collapsed ? '▼' : '▲'}</span>
            )}
          </div>
          {hasContent && collapsed && summary && (
            <p className="text-xs text-brand-muted/50 mt-0.5 truncate">{summary}</p>
          )}
        </button>

        {/* Serving counter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => updateServings(entry.id, Math.max(1, entry.servings - 1))}
            className="w-11 h-11 rounded border border-brand-muted/20 text-brand-muted/50 hover:border-brand-accent hover:text-brand-accent flex items-center justify-center text-sm leading-none transition-colors"
          >−</button>
          <span className="text-sm font-medium text-brand-muted w-5 text-center">{entry.servings}</span>
          <button
            onClick={() => updateServings(entry.id, entry.servings + 1)}
            className="w-11 h-11 rounded border border-brand-muted/20 text-brand-muted/50 hover:border-brand-accent hover:text-brand-accent flex items-center justify-center text-sm leading-none transition-colors"
          >+</button>
          <span className="text-xs text-brand-muted/30 ml-0.5">meals</span>
        </div>

        <button onClick={() => removeEntry(entry.id)} className="text-brand-muted/25 hover:text-red-400 transition-colors text-xl leading-none shrink-0">×</button>
      </div>

      {/* Body — only shown when there is content and not collapsed */}
      {hasContent && !collapsed && (
        <div className="border-t border-brand-muted/10 px-4 py-3 space-y-4">
          {recipe.type === 'composed' && recipe.slots ? (
            <>
              {recipe.slots.map((slot) => {
                const picked = entry.slotPicks[slot.id] || [];
                return (
                  <div key={slot.id}>
                    <p className="text-xs font-semibold text-brand-muted/50 uppercase tracking-wide mb-2">{slot.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {slot.options.map((opt) => (
                        <button
                          key={opt.name}
                          onClick={() => toggleSlot(entry.id, slot.id, opt.name)}
                          className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                            picked.includes(opt.name)
                              ? 'bg-brand-accent text-white border-brand-accent'
                              : 'bg-brand-bg text-brand-muted/60 border-brand-muted/20 hover:border-brand-accent/50'
                          }`}
                        >
                          {opt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : recipe.variants.length > 0 ? (
            <div className="space-y-2">
              {recipe.variants.map((variant) => {
                  const isSelected = entry.selectedVariantIds.includes(variant.id);
                  return (
                    <label
                      key={variant.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-brand-accent bg-brand-accent/10'
                          : 'border-brand-muted/15 hover:border-brand-accent/40 hover:bg-brand-muted/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleVariant(entry.id, variant.id)}
                        className="accent-brand-accent w-4 h-4"
                      />
                      <div>
                        <p className="text-sm text-brand-muted/80">{variant.name}</p>
                        {variant.additionalIngredients.length > 0 && (
                          <p className="text-xs text-brand-muted/40 mt-0.5">
                            + {variant.additionalIngredients.slice(0, 3).map((i) => i.name).join(', ')}
                            {variant.additionalIngredients.length > 3 ? '…' : ''}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Shopping list ─────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

function ShoppingTab() {
  const planEntries = useAppStore((s) => s.planEntries);
  const recipes = useAppStore((s) => s.recipes);
  const addPendingPreps = useAppStore((s) => s.addPendingPreps);
  const shoppingGrabbed = useAppStore((s) => s.shoppingGrabbed);
  const shoppingChosen = useAppStore((s) => s.shoppingChosen);
  const shoppingCollapsed = useAppStore((s) => s.shoppingCollapsed);
  const setShoppingGrabbed = useAppStore((s) => s.setShoppingGrabbed);
  const setShoppingChosen = useAppStore((s) => s.setShoppingChosen);
  const setShoppingCollapsed = useAppStore((s) => s.setShoppingCollapsed);
  const resetShoppingState = useAppStore((s) => s.resetShoppingState);
  const clearPlan = useAppStore((s) => s.clearPlan);

  const sortMode = useAppStore((s) => s.shoppingSortMode);
  const setSortMode = useAppStore((s) => s.setShoppingSortMode);

  // Derive a Set for O(1) lookups
  const grabbed = new Set(shoppingGrabbed);
  const chosen = shoppingChosen;
  const collapsedSections = shoppingCollapsed;

  const grabbedRef = useRef(grabbed);
  const chosenRef = useRef(chosen);
  // Tracks sections the user manually expanded after completion — exempt from auto-collapse
  const userExpandedRef = useRef<Set<string>>(new Set());
  grabbedRef.current = grabbed;
  chosenRef.current = chosen;

  function toggleGrabbed(key: string) {
    const next = new Set(shoppingGrabbed);
    next.has(key) ? next.delete(key) : next.add(key);
    setShoppingGrabbed([...next]);
  }

  function chooseOption(groupKey: string, option: string) {
    setShoppingChosen({
      ...chosen,
      [groupKey]: chosen[groupKey] === option ? '' : option,
    });
  }

  function setCollapsedSections(val: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) {
    if (typeof val === 'function') {
      setShoppingCollapsed(val(shoppingCollapsed));
    } else {
      setShoppingCollapsed(val);
    }
  }

  // Build sections
  type ShoppingItem =
    | { kind: 'single'; key: string; name: string; quantity?: string; category?: string }
    | { kind: 'group';  groupKey: string; label: string; options: string[] }
    | { kind: 'header'; key: string; label: string };

  type Section = { title: string; items: ShoppingItem[] };
  const sections: Section[] = [];

  const recipeCounts: Record<string, number> = {};
  for (const e of planEntries) {
    recipeCounts[e.recipeId] = (recipeCounts[e.recipeId] || 0) + 1;
  }
  const recipeSeen: Record<string, number> = {};

  for (const entry of planEntries) {
    const recipe = recipes.find((r) => r.id === entry.recipeId);
    if (!recipe) continue;

    recipeSeen[entry.recipeId] = (recipeSeen[entry.recipeId] || 0) + 1;
    const mealNum = recipeSeen[entry.recipeId];
    const base = recipeCounts[entry.recipeId] > 1 ? `${recipe.name} — Meal ${mealNum}` : recipe.name;
    const title = entry.servings > 1 ? `${base} (×${entry.servings})` : base;

    // Scale quantities so shopping list shows what you actually need for the planned servings.
    // e.g. Bolognese (serves 6) planned at 6 → scale ×1. Planned at 12 → scale ×2.
    const scaleFactor = entry.servings / Math.max(1, recipe.serves ?? 1);
    const scale = (q: string) => scaleQuantity(q, scaleFactor);
    const items: ShoppingItem[] = [];

    if (recipe.type === 'composed' && recipe.slots) {
      for (const slot of recipe.slots) {
        const picks = entry.slotPicks[slot.id] || [];
        if (picks.length === 0) continue;
        // Look up quantity for each picked option name
        const getQty = (name: string) => {
          const opt = slot.options.find((o) => o.name === name);
          return opt ? scale(opt.quantity) : undefined;
        };
        if (picks.length === 1) {
          const slotOpt = slot.options.find((o) => o.name === picks[0]);
          items.push({ kind: 'single', key: `${entry.id}-${slot.id}-${picks[0]}`, name: picks[0], quantity: getQty(picks[0]), category: slotOpt?.category });
        } else {
          // Multiple picks for this slot — show ALL as individual checkable items.
          // Same pattern as multi-variant: a header for context, individual checkboxes underneath.
          items.push({ kind: 'header', key: `${entry.id}::slot-header::${slot.id}`, label: slot.label });
          for (const name of picks) {
            const slotOpt = slot.options.find((o) => o.name === name);
            items.push({ kind: 'single', key: `${entry.id}-${slot.id}-${name}`, name, quantity: getQty(name), category: slotOpt?.category });
          }
        }
      }
    } else {
      for (const ing of recipe.coreIngredients) {
        items.push({ kind: 'single', key: `${entry.id}-core-${ing.id}`, name: ing.name, quantity: scale(ing.quantity), category: ing.category });
      }
      const selectedVariants = recipe.variants.filter((v) => entry.selectedVariantIds.includes(v.id));
      if (selectedVariants.length === 1) {
        for (const ing of selectedVariants[0].additionalIngredients) {
          items.push({ kind: 'single', key: `${entry.id}-${selectedVariants[0].id}-${ing.id}`, name: ing.name, quantity: scale(ing.quantity), category: ing.category });
        }
      } else if (selectedVariants.length > 1) {
        // Each variant needs ALL its ingredients — show a non-interactive header
        // per variant followed by individual checkable items, not a pick-one group.
        selectedVariants.forEach((variant) => {
          items.push({ kind: 'header', key: `${entry.id}::variant-header::${variant.id}`, label: variant.name });
          for (const ing of variant.additionalIngredients) {
            items.push({ kind: 'single', key: `${entry.id}-${variant.id}-${ing.id}`, name: ing.name, quantity: scale(ing.quantity), category: ing.category });
          }
        });
      }
    }

    if (items.length > 0) sections.push({ title, items });
  }

  // ── Build category-grouped view ───────────────────────────
  type CatItem = ShoppingItem & { recipeLabel: string };
  const categoryMap: Record<string, CatItem[]> = {};

  for (const section of sections) {
    for (const item of section.items) {
      if (item.kind === 'header') continue;
      const cat = item.kind === 'single'
        ? (item.category || categorizeIngredient(item.name))
        : categorizeSlotLabel((item as { label: string }).label);
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push({ ...item, recipeLabel: section.title } as CatItem);
    }
  }

  const categorySections = CATEGORY_ORDER
    .filter((cat) => categoryMap[cat]?.length)
    .map((cat) => ({ title: cat, items: categoryMap[cat] }));

  const displaySections = sortMode === 'category' ? categorySections : sections;

  // Auto-collapse sections when all items are complete
  useEffect(() => {
    setCollapsedSections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const section of displaySections) {
        const checkableItems = section.items.filter(i => i.kind !== 'header');
        const allDone = checkableItems.length > 0 && checkableItems.every((item) => {
          if (item.kind === 'single') return grabbedRef.current.has(item.key);
          return !!(chosenRef.current as Record<string, string>)[(item as { groupKey: string }).groupKey];
        });
        if (allDone && !next[section.title] && !userExpandedRef.current.has(section.title)) {
          next[section.title] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [grabbed, chosen]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSection(title: string) {
    setCollapsedSections((prev) => {
      const isCurrentlyCollapsed = !!prev[title];
      if (isCurrentlyCollapsed) {
        // User is manually expanding — protect from auto-collapse
        userExpandedRef.current.add(title);
      } else {
        // User is manually collapsing — remove protection
        userExpandedRef.current.delete(title);
      }
      return { ...prev, [title]: !prev[title] };
    });
  }

  const totalItems = displaySections.reduce((n, s) => n + s.items.filter(i => i.kind !== 'header').length, 0);
  const checkedItems = displaySections.reduce((n, s) =>
    n + s.items.filter(i => i.kind !== 'header').filter((item) => {
      if (item.kind === 'single') return grabbed.has(item.key);
      return !!(chosen as Record<string, string>)[(item as { groupKey: string }).groupKey];
    }).length, 0);
  const allChecked = totalItems > 0 && checkedItems === totalItems;
  const canSend = allChecked;

  function handleSendToLogPrep() {
    const preps = planEntries.flatMap((entry) => {
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) return [];

      if (recipe.type === 'composed') {
        const hasAnyPick = recipe.slots?.some((s) => (entry.slotPicks[s.id] || []).length > 0);
        if (!hasAnyPick) return [];
        const finalSlotPicks: Record<string, string[]> = {};
        for (const slot of recipe.slots || []) {
          const picks = entry.slotPicks[slot.id] || [];
          if (picks.length === 0) continue;
          if (picks.length === 1) {
            finalSlotPicks[slot.id] = picks;
          } else {
            const raw = chosen[`${entry.id}::${slot.id}`] || '';
            const name = raw.replace(/\s*\([^)]+\)$/, '').trim() || picks[0];
            finalSlotPicks[slot.id] = [name];
          }
        }
        return [{ id: uid(), recipeId: entry.recipeId, recipeName: recipe.name, servings: entry.servings, slotPicks: finalSlotPicks }];
      } else {
        const selected = recipe.variants.filter((v) => entry.selectedVariantIds.includes(v.id));
        if (selected.length === 0 && recipe.variants.length > 0) return [];
        if (selected.length === 1) {
          return [{ id: uid(), recipeId: entry.recipeId, recipeName: recipe.name, servings: entry.servings, variantId: selected[0].id, variantName: selected[0].name }];
        } else if (selected.length > 1) {
          return [{ id: uid(), recipeId: entry.recipeId, recipeName: recipe.name, servings: entry.servings, pendingVariants: selected.map((v) => ({ id: v.id, name: v.name })) }];
        }
        return [{ id: uid(), recipeId: entry.recipeId, recipeName: recipe.name, servings: entry.servings }];
      }
    });
    addPendingPreps(preps);
    clearPlan();
    resetShoppingState();
  }

  if (sections.length === 0) {
    return (
      <div className="text-center py-16">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/20 mx-auto mb-4">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <p className="font-medium text-brand-muted/60">No items yet</p>
        <p className="text-sm mt-1.5 text-brand-muted/40">Add meals in the Plan tab first.</p>
      </div>
    );
  }

  const grabCount = [...grabbed].length + Object.values(chosen).filter(Boolean).length;

  return (
    <div className="pb-20">
      {/* Sort toggle + status */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-brand-muted/50">{grabCount} of {totalItems} checked</p>
        <div className="flex items-center gap-3">
          <div className="flex bg-brand-surface rounded-md border border-brand-muted/15 p-0.5">
            <button onClick={() => setSortMode('recipe')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${sortMode === 'recipe' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/40 hover:text-brand-muted/70'}`}>
              By Recipe
            </button>
            <button onClick={() => setSortMode('category')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${sortMode === 'category' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/40 hover:text-brand-muted/70'}`}>
              By Category
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {displaySections.map((section) => {
          const isCollapsed = !!collapsedSections[section.title];
          const checkable = section.items.filter(i => i.kind !== 'header');
          const sectionDone = checkable.length > 0 && checkable.every((item) => {
            if (item.kind === 'single') return grabbed.has(item.key);
            return !!(chosen as Record<string, string>)[(item as { groupKey: string }).groupKey];
          });
          return (
          <div key={section.title}>
            {/* Section header — always visible, clickable */}
            <button
              onClick={() => toggleSection(section.title)}
              className="w-full flex items-center justify-between mb-2 group"
            >
              <p className={`text-xs font-semibold uppercase tracking-wide transition-colors ${sectionDone ? 'text-brand-accent/60' : 'text-brand-muted/50'}`}>
                {section.title}{sectionDone ? ' ✓' : ''}
              </p>
              <span className="text-brand-muted/25 text-xs group-hover:text-brand-muted/50 transition-colors">
                {isCollapsed ? '▼' : '▲'}
              </span>
            </button>

            {!isCollapsed && (
            <div className="bg-brand-surface rounded-lg border border-brand-muted/15 overflow-hidden divide-y divide-brand-muted/10">
              {section.items.map((item) => {
                const recipeLabel = sortMode === 'category' ? (item as { recipeLabel?: string }).recipeLabel : undefined;
                // Variant section header — non-interactive label
                if (item.kind === 'header') {
                  return (
                    <div key={item.key} className="px-4 pt-3 pb-1 bg-brand-raised/30">
                      <p className="text-[11px] font-semibold text-brand-muted/50 uppercase tracking-wide">{item.label}</p>
                    </div>
                  );
                }

                if (item.kind === 'single') {
                  const isGrabbed = grabbed.has(item.key);
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleGrabbed(item.key)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-muted/5 transition-colors"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isGrabbed ? 'bg-brand-accent border-brand-accent' : 'border-brand-muted/30'
                      }`}>
                        {isGrabbed && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm transition-colors ${isGrabbed ? 'text-brand-muted/30 line-through' : 'text-brand-muted'}`}>
                          {item.name}
                        </span>
                        {recipeLabel && (
                          <span className="ml-2 text-xs text-brand-muted/35">{recipeLabel}</span>
                        )}
                      </div>
                      {item.quantity && (
                        <span className={`text-xs shrink-0 ${isGrabbed ? 'text-brand-muted/20' : 'text-brand-muted/50'}`}>
                          {item.quantity}
                        </span>
                      )}
                    </button>
                  );
                }

                // Flexible group
                const pickedOption = chosen[item.groupKey] || '';

                // Collapsed: selection made — show as a single regular row
                if (pickedOption) {
                  return (
                    <button
                      key={item.groupKey}
                      onClick={() => chooseOption(item.groupKey, pickedOption)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-muted/5 transition-colors"
                    >
                      <div className="w-5 h-5 rounded border bg-brand-accent border-brand-accent flex items-center justify-center shrink-0">
                        <span className="text-brand-muted text-xs font-bold">✓</span>
                      </div>
                      <span className="flex-1 text-sm text-brand-muted">{pickedOption}</span>
                    </button>
                  );
                }

                // Expanded: no selection yet — show all options with indent
                return (
                  <div key={item.groupKey} className="px-4 py-3">
                    <p className="text-xs text-brand-muted/40 mb-2">Select a {item.label}</p>
                    <div className="space-y-1.5 pl-3 border-l border-brand-muted/15">
                      {item.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => chooseOption(item.groupKey, opt)}
                          className="w-full flex items-center gap-3 py-2 text-left hover:bg-brand-muted/5 transition-colors rounded-md px-2"
                        >
                          <div className="w-5 h-5 rounded border border-brand-muted/30 flex items-center justify-center shrink-0" />
                          <span className="text-sm text-brand-muted">{opt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Floating CTA — positioned above tab bar with iOS safe area clearance */}
      <div
        className="fixed left-0 right-0 px-6 pointer-events-none"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <button
            disabled={!canSend}
            onClick={handleSendToLogPrep}
            className={`w-full py-3 rounded-xl text-sm font-semibold shadow-lg transition-all ${
              canSend
                ? 'bg-brand-accent text-white shadow-brand-accent/20'
                : 'bg-brand-surface/80 text-brand-muted/25 border border-brand-muted/10 cursor-not-allowed'
            }`}
          >
            Queue Prep
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function PlanScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const subTab = useAppStore((s) => s.planSubTab);
  const setSubTab = useAppStore((s) => s.setPlanSubTab);
  const [showPicker, setShowPicker] = useState(false);
  const planEntries = useAppStore((s) => s.planEntries);
  const addPlanEntry = useAppStore((s) => s.addPlanEntry);
  const recipes = useAppStore((s) => s.recipes);

  const totalShoppingItems = planEntries.reduce((total, entry) => {
    const recipe = recipes.find((r) => r.id === entry.recipeId);
    if (!recipe) return total;
    if (recipe.type === 'composed') {
      return total + (recipe.slots || []).filter((s) => (entry.slotPicks[s.id] || []).length > 0).length;
    }
    return total + recipe.coreIngredients.length +
      recipe.variants.filter((v) => entry.selectedVariantIds.includes(v.id))
        .reduce((n, v) => n + v.additionalIngredients.length, 0);
  }, 0);

  const entryNumbers: Record<string, number> = {};
  const entryNumberMap: Record<string, number> = {};
  for (const entry of planEntries) {
    entryNumbers[entry.recipeId] = (entryNumbers[entry.recipeId] || 0) + 1;
    entryNumberMap[entry.id] = entryNumbers[entry.recipeId];
  }

  const planContent = (
    <div>
      {/* Total meals counter */}
      {planEntries.length > 0 && (() => {
        const totalMeals = planEntries.reduce((sum, e) => sum + e.servings, 0);
        return (
          <div className="flex items-center justify-between mb-4 px-3 py-2.5 bg-brand-surface rounded-lg border border-brand-muted/15">
            <p className="text-sm font-medium text-brand-muted">{totalMeals} meals planned</p>
            <p className="text-xs text-brand-muted/40">{planEntries.length} recipe{planEntries.length !== 1 ? 's' : ''}</p>
          </div>
        );
      })()}

      <button
        onClick={() => setShowPicker(true)}
        className="w-full mb-4 py-2.5 rounded-lg border border-dashed border-brand-muted/25 text-sm text-brand-muted/50 hover:border-brand-accent/50 hover:text-brand-accent transition-colors"
      >
        + Add a meal to this week's plan
      </button>

      {planEntries.length === 0 && (
        <div className="text-center py-12">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/20 mx-auto mb-4">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="12" y2="16" />
          </svg>
          {recipes.length === 0 ? (
            <>
              <p className="font-medium text-brand-muted/60">No recipes yet</p>
              <p className="text-sm mt-1.5 text-brand-muted/40 max-w-xs mx-auto">
                Build your first recipe before planning your week.
              </p>
              <button
                onClick={() => onNavigate('recipes')}
                className="mt-4 text-sm font-medium text-brand-accent hover:text-brand-accent/80 transition-colors"
              >
                Go to Recipes →
              </button>
            </>
          ) : (
            <>
              <p className="font-medium text-brand-muted/60">Nothing planned yet</p>
              <p className="text-sm mt-1.5 text-brand-muted/40">
                Tap "+ Add a meal" above to build this week's prep list.
              </p>
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        {planEntries.map((entry) => {
          const recipe = recipes.find((r) => r.id === entry.recipeId);
          if (!recipe) return null;
          return (
            <EntryCard
              key={entry.id}
              entry={entry}
              recipe={recipe}
              entryNumber={entryNumberMap[entry.id]}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-8 lg:items-start">
      {/* Left column: plan entries */}
      <div>
        {/* Mobile toggle — hidden on desktop */}
        <div className="lg:hidden flex bg-brand-surface rounded-lg border border-brand-muted/15 p-1 mb-5">
          <button
            onClick={() => setSubTab('picks')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              subTab === 'picks' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/50 hover:text-brand-muted/70'
            }`}
          >
            What to Prep
          </button>
          <button
            onClick={() => setSubTab('shopping')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              subTab === 'shopping' ? 'bg-brand-raised text-brand-muted' : 'text-brand-muted/50 hover:text-brand-muted/70'
            }`}
          >
            Shopping List
            {totalShoppingItems > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-brand-warm text-brand-bg rounded-full font-semibold">
                {totalShoppingItems}
              </span>
            )}
          </button>
        </div>

        {/* On mobile: show picks or shopping per subTab. On desktop: always show plan entries */}
        <div className="lg:block">
          {/* Desktop always shows plan; mobile shows plan only when subTab === 'picks' */}
          <div className={subTab === 'picks' ? 'block' : 'hidden lg:block'}>
            {planContent}
          </div>
          {/* Mobile-only shopping tab */}
          <div className={subTab === 'shopping' ? 'block lg:hidden' : 'hidden'}>
            <ShoppingTab />
          </div>
        </div>
      </div>

      {/* Right column: desktop always-visible shopping list */}
      <div className="hidden lg:block sticky top-6">
        <div className="bg-brand-surface rounded-xl border border-brand-muted/15 overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-muted/10 flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-muted">Shopping List</p>
            {totalShoppingItems > 0 && (
              <span className="text-xs font-semibold text-brand-warm">{totalShoppingItems} items</span>
            )}
          </div>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
            <ShoppingTab />
          </div>
        </div>
      </div>

      {showPicker && (
        <RecipePicker
          onSelect={(id) => addPlanEntry(id)}
          onClose={() => setShowPicker(false)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
