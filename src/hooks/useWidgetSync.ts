import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useAppStore } from '../store';
import { FreshPrepWidget, ShoppingItem } from '../plugins/widgetPlugin';
import { format } from '../utils/dates';
import { computeWeekStreak } from '../utils/dates';
import { scaleQuantity } from '../utils/scale';

// On mount, read back any interactions that happened in the widget while app was closed
async function applyWidgetInteractions() {
  try {
    const result = await FreshPrepWidget.syncFromWidget();
    const state = useAppStore.getState();

    // Apply eaten marks from widget
    for (const scheduledId of result.pendingEatenIds) {
      const scheduled = state.scheduledMeals.find(s => s.id === scheduledId);
      if (scheduled && !state.eatenScheduledIds.includes(scheduledId)) {
        state.consumeServing(scheduled.preparedMealId);
        state.markScheduledEaten(scheduledId);
      }
    }

    // Apply grabbed (checked-off) shopping items from widget
    if (result.grabbedKeys.length > 0) {
      const merged = [...new Set([...state.shoppingGrabbed, ...result.grabbedKeys])];
      state.setShoppingGrabbed(merged);
    }
  } catch (_) {
    // Non-critical — silently ignore if plugin not available
  }
}

// Compute a flat shopping item list from current plan entries
function computeShoppingItems(): ShoppingItem[] {
  const state = useAppStore.getState();
  const items: ShoppingItem[] = [];
  const grabbed = new Set(state.shoppingGrabbed);

  for (const entry of state.planEntries) {
    const recipe = state.recipes.find(r => r.id === entry.recipeId);
    if (!recipe) continue;
    const scale = (q: string) => scaleQuantity(q, entry.servings / Math.max(1, recipe.serves ?? 1));

    if (recipe.type === 'composed' && recipe.slots) {
      for (const slot of recipe.slots) {
        const picks = entry.slotPicks[slot.id] || [];
        for (const pick of picks) {
          const opt = slot.options.find(o => o.name === pick);
          const key = `${entry.id}-${slot.id}-${pick}`;
          items.push({ key, name: pick, quantity: opt ? scale(opt.quantity) : '', grabbed: grabbed.has(key) });
        }
      }
    } else {
      for (const ing of recipe.coreIngredients) {
        const key = `${entry.id}-core-${ing.id}`;
        items.push({ key, name: ing.name, quantity: scale(ing.quantity), grabbed: grabbed.has(key) });
      }
      const selectedVariants = recipe.variants.filter(v => entry.selectedVariantIds.includes(v.id));
      for (const variant of selectedVariants) {
        for (const ing of variant.additionalIngredients) {
          const key = `${entry.id}-${variant.id}-${ing.id}`;
          items.push({ key, name: ing.name, quantity: scale(ing.quantity), grabbed: grabbed.has(key) });
        }
      }
    }
  }
  return items;
}

export function useWidgetSync() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Apply interactions that happened while app was closed/backgrounded
    applyWidgetInteractions();

    // Re-sync every time the app comes back to the foreground (widget interactions while backgrounded)
    const listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) applyWidgetInteractions();
    });

    const syncAll = () => {
      const state = useAppStore.getState();
      const today = format(new Date());

      // Today's meals — include scheduledId so widget can send it back on "mark eaten"
      const todayScheduled = state.scheduledMeals.filter(s => s.date === today);
      const todayMeals = todayScheduled.map(s => {
        const meal = state.preparedMeals.find(m => m.id === s.preparedMealId);
        return {
          mealTime: s.mealTime,
          name: meal?.recipeName ?? '',
          eaten: state.eatenScheduledIds.includes(s.id),
          scheduledId: s.id,
        };
      });

      const inventoryCount = state.preparedMeals.filter(m => m.servingsRemaining > 0).length;
      const streak = computeWeekStreak(state.mealEatenDates);

      FreshPrepWidget.updateWidgetData({
        todayMealsJson: JSON.stringify(todayMeals),
        inventoryCount,
        streak,
      }).catch(() => {});

      // Shopping list
      const items = computeShoppingItems();
      FreshPrepWidget.updateShoppingList({
        itemsJson: JSON.stringify(items),
      }).catch(() => {});
    };

    syncAll();
    const unsubscribe = useAppStore.subscribe(syncAll);
    return () => {
      listenerPromise.then(l => l.remove());
      unsubscribe();
    };
  }, []);
}
