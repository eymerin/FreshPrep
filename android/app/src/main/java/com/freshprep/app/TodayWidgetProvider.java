package com.freshprep.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

public class TodayWidgetProvider extends AppWidgetProvider {

    static final String PREFS = "freshprep_widget";

    // Meal slots in order
    static final String[] MEAL_TIMES = {"breakfast", "lunch", "snack", "dinner"};
    static final int[] MEAL_VIEWS  = {R.id.meal_breakfast, R.id.meal_lunch, R.id.meal_snack, R.id.meal_dinner};
    static final int[] EATEN_VIEWS = {R.id.btn_eaten_breakfast, R.id.btn_eaten_lunch, R.id.btn_eaten_snack, R.id.btn_eaten_dinner};

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateWidget(ctx, mgr, id);
    }

    static void updateWidget(Context ctx, AppWidgetManager mgr, int id) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int inventory   = prefs.getInt("inventory_count", 0);
        String mealsJson = prefs.getString("today_meals_json", "[]");

        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_today);
        views.setTextViewText(R.id.widget_inventory,
                inventory > 0 ? inventory + " ready" : "");

        // Parse meals
        String[] names       = {"", "", "", ""};
        boolean[] eaten      = {false, false, false, false};
        String[] scheduledIds = {"", "", "", ""};

        try {
            JSONArray arr = new JSONArray(mealsJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String mt = obj.optString("mealTime", "");
                for (int s = 0; s < MEAL_TIMES.length; s++) {
                    if (MEAL_TIMES[s].equals(mt)) {
                        names[s]       = obj.optString("name", "");
                        eaten[s]       = obj.optBoolean("eaten", false);
                        scheduledIds[s] = obj.optString("scheduledId", "");
                        break;
                    }
                }
            }
        } catch (Exception ignored) {}

        // Populate each slot
        String[] placeholders = {"+ Breakfast", "+ Lunch", "+ Snack", "+ Dinner"};
        for (int s = 0; s < MEAL_TIMES.length; s++) {
            views.setTextViewText(MEAL_VIEWS[s],
                    names[s].isEmpty() ? placeholders[s] : names[s]);

            // Eaten button — show ✓ when eaten, circle when not
            views.setTextViewText(EATEN_VIEWS[s], eaten[s] ? "✓" : "○");

            // Click to mark as eaten (only if a meal is scheduled and not yet eaten)
            if (!scheduledIds[s].isEmpty() && !eaten[s]) {
                Intent eatIntent = new Intent(ctx, WidgetActionReceiver.class);
                eatIntent.setAction(WidgetActionReceiver.ACTION_MARK_EATEN);
                eatIntent.putExtra("scheduled_id", scheduledIds[s]);
                // Unique request code per slot to distinguish PendingIntents
                PendingIntent eatPi = PendingIntent.getBroadcast(ctx, s + 100, eatIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(EATEN_VIEWS[s], eatPi);
            }
        }

        // Tap widget body to open app
        Intent openIntent = new Intent(ctx, MainActivity.class);
        PendingIntent openPi = PendingIntent.getActivity(ctx, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, openPi);

        mgr.updateAppWidget(id, views);
    }
}
