package com.coachnaz.gbese;

import android.graphics.Rect;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;

/**
 * Gbese!'s own small screen plugin (ST1a, docs/design.md ST0 parts 3 to 5), called from
 * src/native/app.ts:
 * - setPlayMode({ awake, blockEdges }): keep the screen awake (runs and the intro only), and ask
 *   Android not to treat an edge swipe over the play buttons as back (runs only);
 * - getInsets() and the "insets" event: the real safe edges (camera hole, notch, round corners)
 *   in CSS pixels, because Android web views do not always give them to the page.
 */
@CapacitorPlugin(name = "GbeseScreen")
public class GbeseScreenPlugin extends Plugin {

    /** Android lets an app block back swipes over at most 200 dp of each edge. */
    private static final int EDGE_BLOCK_DP = 200;

    private boolean blockEdges = false;
    private JSObject lastInsets = zero();

    private static JSObject zero() {
        JSObject o = new JSObject();
        o.put("top", 0);
        o.put("right", 0);
        o.put("bottom", 0);
        o.put("left", 0);
        return o;
    }

    @Override
    public void load() {
        View root = getActivity().getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            readInsets(insets);
            return ViewCompat.onApplyWindowInsets(v, insets);
        });
        root.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> {
            if (r - l != or - ol || b - t != ob - ot) applyEdgeBlock();
        });
    }

    private void readInsets(WindowInsetsCompat insets) {
        // The bars are hidden in the whole app (they only slide over for a moment), so the
        // cutout is what stays in the way. Round corners are covered by the cutout on most
        // phones; ST5 checks it on a phone with a camera hole.
        Insets cut = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
        float d = getActivity().getResources().getDisplayMetrics().density;
        JSObject o = new JSObject();
        o.put("top", cut.top / d);
        o.put("right", cut.right / d);
        o.put("bottom", cut.bottom / d);
        o.put("left", cut.left / d);
        if (!o.toString().equals(lastInsets.toString())) {
            lastInsets = o;
            notifyListeners("insets", o);
        }
    }

    @PluginMethod
    public void getInsets(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(getActivity().getWindow().getDecorView());
            if (insets != null) readInsets(insets);
            call.resolve(lastInsets);
        });
    }

    @PluginMethod
    public void setPlayMode(PluginCall call) {
        boolean awake = Boolean.TRUE.equals(call.getBoolean("awake", false));
        blockEdges = Boolean.TRUE.equals(call.getBoolean("blockEdges", false));
        getActivity().runOnUiThread(() -> {
            if (awake) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            applyEdgeBlock();
            call.resolve();
        });
    }

    /** In a run: the bottom 200 dp of the left half (walk buttons) and the right half (Jump, Throw). */
    private void applyEdgeBlock() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        View root = getActivity().getWindow().getDecorView();
        List<Rect> rects = new ArrayList<>();
        if (blockEdges) {
            int w = root.getWidth();
            int h = root.getHeight();
            int tall = Math.round(EDGE_BLOCK_DP * getActivity().getResources().getDisplayMetrics().density);
            rects.add(new Rect(0, Math.max(0, h - tall), w / 2, h));
            rects.add(new Rect(w / 2, Math.max(0, h - tall), w, h));
        }
        root.setSystemGestureExclusionRects(rects);
    }
}
