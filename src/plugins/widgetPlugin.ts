import { registerPlugin } from '@capacitor/core';

export interface WidgetPayload {
  todayMealsJson: string;    // [{mealTime, name, eaten, scheduledId}]
  inventoryCount: number;
  streak: number;
}

export interface ShoppingItem {
  key: string;
  name: string;
  quantity: string;
  grabbed: boolean;
}

export interface WidgetSyncResult {
  pendingEatenIds: string[];    // scheduled meal IDs marked eaten from widget
  grabbedKeys: string[];        // shopping item keys checked from widget
}

export interface FreshPrepWidgetPlugin {
  updateWidgetData(data: WidgetPayload): Promise<void>;
  updateShoppingList(data: { itemsJson: string }): Promise<void>;
  syncFromWidget(): Promise<WidgetSyncResult>;
}

const FreshPrepWidget = registerPlugin<FreshPrepWidgetPlugin>('FreshPrepWidget');
export { FreshPrepWidget };
