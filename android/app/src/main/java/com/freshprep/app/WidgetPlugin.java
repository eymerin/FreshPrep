package com.freshprep.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "FreshPrepWidget")
public class WidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        Context ctx = getContext();
        prefs(ctx).edit()
                .putString("today_meals_json", call.getString("todayMealsJson", "[]"))
                .putInt("inventory_count", call.getInt("inventoryCount", 0))
                .putInt("streak", call.getInt("streak", 0))
                .apply();
        refreshAll(ctx);
        call.resolve();
    }

    @PluginMethod
    public void updateShoppingList(PluginCall call) {
        Context ctx = getContext();
        prefs(ctx).edit()
                .putString("shopping_items_json", call.getString("itemsJson", "[]"))
                .apply();
        refreshShopping(ctx);
        call.resolve();
    }

    @PluginMethod
    public void syncFromWidget(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences p = prefs(ctx);

        // Read and clear pending eaten IDs
        String eatenJson = p.getString("widget_pending_eaten", "[]");
        Set<String> grabbedSet = p.getStringSet("widget_grabbed_keys", new HashSet<>());

        p.edit()
                .putString("widget_pending_eaten", "[]")
                .putStringSet("widget_grabbed_keys", new HashSet<>())
                .apply();

        // Build arrays manually — JSArray.from(String[]) is unreliable in Capacitor
        JSArray eatenArray = new JSArray();
        JSArray grabbedArray = new JSArray();
        try {
            org.json.JSONArray parsed = new org.json.JSONArray(eatenJson);
            for (int i = 0; i < parsed.length(); i++) eatenArray.put(parsed.getString(i));
        } catch (Exception ignored) {}
        for (String key : grabbedSet) grabbedArray.put(key);

        JSObject result = new JSObject();
        result.put("pendingEatenIds", eatenArray);
        result.put("grabbedKeys", grabbedArray);
        call.resolve(result);
    }

    static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(TodayWidgetProvider.PREFS, Context.MODE_PRIVATE);
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] todayIds = mgr.getAppWidgetIds(new ComponentName(ctx, TodayWidgetProvider.class));
        for (int id : todayIds) TodayWidgetProvider.updateWidget(ctx, mgr, id);
        int[] glanceIds = mgr.getAppWidgetIds(new ComponentName(ctx, GlanceWidgetProvider.class));
        for (int id : glanceIds) GlanceWidgetProvider.updateWidget(ctx, mgr, id);
        refreshShopping(ctx);
    }

    static void refreshShopping(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, ShoppingWidgetProvider.class));
        if (ids.length > 0) {
            mgr.notifyAppWidgetViewDataChanged(ids, R.id.shopping_list);
            for (int id : ids) ShoppingWidgetProvider.updateWidget(ctx, mgr, id);
        }
    }
}
