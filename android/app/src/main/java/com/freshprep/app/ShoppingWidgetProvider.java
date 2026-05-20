package com.freshprep.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class ShoppingWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateWidget(ctx, mgr, id);
    }

    static void updateWidget(Context ctx, AppWidgetManager mgr, int id) {
        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_shopping);

        // Connect the ListView to the RemoteViewsService
        Intent serviceIntent = new Intent(ctx, ShoppingWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
        views.setRemoteAdapter(R.id.shopping_list, serviceIntent);
        views.setEmptyView(R.id.shopping_list, R.id.shopping_empty);

        // Template PendingIntent for item clicks (merged with fillInIntent per item)
        Intent toggleIntent = new Intent(ctx, WidgetActionReceiver.class);
        toggleIntent.setAction(WidgetActionReceiver.ACTION_TOGGLE_SHOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent templatePi = PendingIntent.getBroadcast(ctx, id, toggleIntent, flags);
        views.setPendingIntentTemplate(R.id.shopping_list, templatePi);

        // Open app on header tap
        Intent openIntent = new Intent(ctx, MainActivity.class);
        PendingIntent openPi = PendingIntent.getActivity(ctx, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.shopping_header, openPi);

        mgr.updateAppWidget(id, views);
    }
}
