package com.freshprep.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class ShoppingWidgetFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context ctx;
    private final List<ShoppingItemData> items = new ArrayList<>();

    static class ShoppingItemData {
        String key, name, qty;
        boolean grabbed;
        ShoppingItemData(String key, String name, String qty, boolean grabbed) {
            this.key = key; this.name = name; this.qty = qty; this.grabbed = grabbed;
        }
    }

    ShoppingWidgetFactory(Context ctx) {
        this.ctx = ctx;
    }

    @Override
    public void onCreate() { loadItems(); }

    @Override
    public void onDataSetChanged() { loadItems(); }

    @Override
    public void onDestroy() { items.clear(); }

    @Override
    public int getCount() { return items.size(); }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= items.size()) return null;
        ShoppingItemData item = items.get(position);

        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_shopping_item);
        rv.setTextViewText(R.id.item_check, item.grabbed ? "✓" : "○");
        rv.setTextViewText(R.id.item_name, item.name);
        rv.setTextViewText(R.id.item_qty, item.qty);

        int textColor = item.grabbed
                ? ctx.getResources().getColor(R.color.widget_text_sec, null)
                : ctx.getResources().getColor(R.color.widget_text, null);
        int checkColor = item.grabbed
                ? ctx.getResources().getColor(R.color.widget_accent, null)
                : ctx.getResources().getColor(R.color.widget_text_sec, null);

        rv.setTextColor(R.id.item_name, textColor);
        rv.setTextColor(R.id.item_check, checkColor);

        // fillInIntent carries the item key — merged with the template PendingIntent
        Intent fillIntent = new Intent();
        fillIntent.putExtra("item_key", item.key);
        rv.setOnClickFillInIntent(R.id.shopping_item_row, fillIntent);

        return rv;
    }

    @Override
    public RemoteViews getLoadingView() { return null; }

    @Override
    public int getViewTypeCount() { return 1; }

    @Override
    public long getItemId(int position) { return position; }

    @Override
    public boolean hasStableIds() { return false; }

    private void loadItems() {
        items.clear();
        SharedPreferences prefs = ctx.getSharedPreferences(TodayWidgetProvider.PREFS, Context.MODE_PRIVATE);
        String json = prefs.getString("shopping_items_json", "[]");
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                items.add(new ShoppingItemData(
                        obj.optString("key"),
                        obj.optString("name"),
                        obj.optString("quantity"),
                        obj.optBoolean("grabbed", false)
                ));
            }
        } catch (Exception ignored) {}
    }
}
