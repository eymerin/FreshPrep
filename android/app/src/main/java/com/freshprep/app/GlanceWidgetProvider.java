package com.freshprep.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class GlanceWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateWidget(ctx, mgr, id);
    }

    static void updateWidget(Context ctx, AppWidgetManager mgr, int id) {
        SharedPreferences prefs = ctx.getSharedPreferences(
                TodayWidgetProvider.PREFS, Context.MODE_PRIVATE);
        int inventory = prefs.getInt("inventory_count", 0);
        int streak    = prefs.getInt("streak", 0);

        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_glance);
        views.setTextViewText(R.id.glance_inventory_count, String.valueOf(inventory));
        views.setTextViewText(R.id.glance_streak, String.valueOf(streak));

        Intent intent = new Intent(ctx, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.glance_root, pi);

        mgr.updateAppWidget(id, views);
    }
}
