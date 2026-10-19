package su.treas.cook;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * «Рецепт дня» on the home screen: a photo, the dish and its time; a tap opens the recipe in the app.
 * The dish comes from https://treas.su/cook/api/index.php?r=today (the same for everybody, a new one every day).
 * The last one is kept, so the widget still shows a dish without internet.
 */
public class TodayWidget extends AppWidgetProvider {
    private static final String API = "https://treas.su/cook/api/index.php?r=today";
    private static final String SITE = "https://treas.su/cook/";
    private static final String PREFS = "today_widget";

    /** The layout of this size: 4×2 here, 2×2 in TodayWidgetSmall. */
    protected int layout() { return R.layout.widget_today; }

    @Override
    public void onUpdate(Context context, final AppWidgetManager manager, final int[] ids) {
        // Shown at once from what was saved; then the day's dish is fetched in the background.
        draw(context, manager, ids, layout());
        final PendingResult async = goAsync();
        final Context app = context.getApplicationContext();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    // A new dish: both sizes on the screen show it.
                    if (fetch(app)) drawAll(app, manager);
                } catch (Throwable ignored) {
                    // No internet or the site did not answer: the saved dish stays.
                } finally {
                    async.finish();
                }
            }
        }).start();
    }

    /** Asks for the day's dish and its photo; true when something new was saved. */
    private static boolean fetch(Context context) throws Exception {
        JSONObject j = new JSONObject(new String(get(API, 64 * 1024), "UTF-8"));
        String id = j.optString("id", "");
        if (id.isEmpty()) return false;
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (id.equals(p.getString("id", "")) && photoFile(context).exists()) return false;
        byte[] photo = get(j.optString("photo", ""), 3 * 1024 * 1024);
        Bitmap bmp = decode(photo, 640);
        if (bmp != null) {
            try (FileOutputStream out = new FileOutputStream(photoFile(context))) { bmp.compress(Bitmap.CompressFormat.JPEG, 88, out); }
        } else {
            photoFile(context).delete();
        }
        p.edit()
            .putString("id", id)
            .putString("title", j.optString("title", ""))
            .putInt("minutes", j.optInt("minutes", 0))
            .putString("url", j.optString("url", SITE))
            .apply();
        return true;
    }

    private static byte[] get(String address, int limit) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(address).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(8000);
        c.setRequestProperty("X-Cook-App", "android-widget");
        try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (c.getResponseCode() != 200) throw new IllegalStateException("HTTP " + c.getResponseCode());
            byte[] buf = new byte[16 * 1024];
            int n, total = 0;
            while ((n = in.read(buf)) > 0) {
                total += n;
                if (total > limit) throw new IllegalStateException("too big");
                out.write(buf, 0, n);
            }
            return out.toByteArray();
        } finally {
            c.disconnect();
        }
    }

    /** The photo made no wider than `max` pixels: a widget picture has to stay small. */
    private static Bitmap decode(byte[] data, int max) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(data, 0, data.length, o);
        if (o.outWidth <= 0) return null;
        int sample = 1;
        while (o.outWidth / (sample * 2) >= max) sample *= 2;
        BitmapFactory.Options d = new BitmapFactory.Options();
        d.inSampleSize = sample;
        Bitmap b = BitmapFactory.decodeByteArray(data, 0, data.length, d);
        if (b == null || b.getWidth() <= max) return b;
        return Bitmap.createScaledBitmap(b, max, Math.round(b.getHeight() * (max / (float) b.getWidth())), true);
    }

    private static File photoFile(Context context) { return new File(context.getFilesDir(), "today_widget.jpg"); }

    private static void drawAll(Context context, AppWidgetManager manager) {
        draw(context, manager, manager.getAppWidgetIds(new ComponentName(context, TodayWidget.class)), R.layout.widget_today);
        draw(context, manager, manager.getAppWidgetIds(new ComponentName(context, TodayWidgetSmall.class)), R.layout.widget_today_small);
    }

    private static void draw(Context context, AppWidgetManager manager, int[] ids, int layout) {
        if (ids == null || ids.length == 0) return;
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String title = p.getString("title", "");
        int minutes = p.getInt("minutes", 0);
        String url = p.getString("url", SITE);

        RemoteViews v = new RemoteViews(context.getPackageName(), layout);
        if (title.isEmpty()) {
            v.setTextViewText(R.id.widget_title, "Что приготовить сегодня?");
            v.setTextViewText(R.id.widget_meta, layout == R.layout.widget_today_small ? "Рецепт дня" : "Нажмите — подберу блюдо");
        } else {
            v.setTextViewText(R.id.widget_title, title);
            v.setTextViewText(R.id.widget_meta, "Рецепт дня" + (minutes > 0 ? " · " + time(minutes) : ""));
        }
        File f = photoFile(context);
        Bitmap bmp = f.exists() ? BitmapFactory.decodeFile(f.getAbsolutePath()) : null;
        if (bmp != null) {
            v.setImageViewBitmap(R.id.widget_photo, bmp);
            v.setViewVisibility(R.id.widget_photo, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.widget_photo, View.GONE);
        }

        // Opens the app on the recipe (the same link as from a messenger).
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        open.setClassName(context.getPackageName(), context.getPackageName() + ".MainActivity");
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_root, pi);

        for (int id : ids) manager.updateAppWidget(id, v);
    }

    private static String time(int minutes) {
        if (minutes < 60) return minutes + " мин";
        int h = minutes / 60, m = minutes % 60;
        return h + " ч" + (m > 0 ? " " + m + " мин" : "");
    }
}
