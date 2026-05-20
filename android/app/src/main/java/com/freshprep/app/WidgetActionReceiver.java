package com.freshprep.app;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;

import java.util.HashSet;
import java.util.Set;

public class WidgetActionReceiver extends BroadcastReceiver {

    static final String ACTION_MARK_EATEN   = "com.freshprep.app.ACTION_MARK_EATEN";
    static final String ACTION_TOGGLE_SHOP  = "com.freshprep.app.ACTION_TOGGLE_SHOPPING";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        SharedPreferences prefs = WidgetPlugin.prefs(ctx);

        if (ACTION_MARK_EATEN.equals(action)) {
            String scheduledId = intent.getStringExtra("scheduled_id");
            if (scheduledId == null) return;

            // Append to pending eaten IDs (read by app on next open)
            String existing = prefs.getString("widget_pending_eaten", "[]");
            try {
                JSONArray arr = new JSONArray(existing);
                // Avoid duplicates
                boolean found = false;
                for (int i = 0; i < arr.length(); i++) {
                    if (scheduledId.equals(arr.getString(i))) { found = true; break; }
                }
                if (!found) arr.put(scheduledId);
                prefs.edit().putString("widget_pending_eaten", arr.toString()).apply();
            } catch (JSONException ignored) {}

            // Also mark as eaten in the today_meals_json so widget reflects it immediately
            markEatenInWidgetData(prefs, scheduledId);

            // Refresh today widget
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, TodayWidgetProvider.class));
            for (int id : ids) TodayWidgetProvider.updateWidget(ctx, mgr, id);

        } else if (ACTION_TOGGLE_SHOP.equals(action)) {
            String itemKey = intent.getStringExtra("item_key");
            if (itemKey == null) return;

            Set<String> grabbed = new HashSet<>(
                    prefs.getStringSet("widget_grabbed_keys", new HashSet<>()));
            if (grabbed.contains(itemKey)) grabbed.remove(itemKey);
            else grabbed.add(itemKey);
            prefs.edit().putStringSet("widget_grabbed_keys", grabbed).apply();

            // Also update the shopping_items_json grabbed field so widget reflects immediately
            toggleShoppingItem(prefs, itemKey, grabbed.contains(itemKey));

            // Refresh shopping widget
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, ShoppingWidgetProvider.class));
            if (ids.length > 0) {
                mgr.notifyAppWidgetViewDataChanged(ids, R.id.shopping_list);
                for (int id : ids) ShoppingWidgetProvider.updateWidget(ctx, mgr, id);
            }
        }
    }

    private void markEatenInWidgetData(SharedPreferences prefs, String scheduledId) {
        try {
            String json = prefs.getString("today_meals_json", "[]");
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                org.json.JSONObject obj = arr.getJSONObject(i);
                if (scheduledId.equals(obj.optString("scheduledId"))) {
                    obj.put("eaten", true);
                    break;
                }
            }
            prefs.edit().putString("today_meals_json", arr.toString()).apply();
        } catch (JSONException ignored) {}
    }

    private void toggleShoppingItem(SharedPreferences prefs, String itemKey, boolean grabbed) {
        try {
            String json = prefs.getString("shopping_items_json", "[]");
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                org.json.JSONObject obj = arr.getJSONObject(i);
                if (itemKey.equals(obj.optString("key"))) {
                    obj.put("grabbed", grabbed);
                    break;
                }
            }
            prefs.edit().putString("shopping_items_json", arr.toString()).apply();
        } catch (JSONException ignored) {}
    }
}
