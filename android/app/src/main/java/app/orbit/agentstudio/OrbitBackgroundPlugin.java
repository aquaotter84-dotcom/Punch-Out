package app.orbit.agentstudio;

import android.Manifest;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONException;

@CapacitorPlugin(name = "OrbitBackground", permissions = {
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class OrbitBackgroundPlugin extends Plugin {
    @PluginMethod
    public void configure(PluginCall call) {
        String snapshot = call.getString("workspace");
        String key = call.getString("apiKey");
        try {
            OrbitBackgroundStore.checkSnapshot(snapshot);
            if (key == null || key.trim().isEmpty()) throw new IllegalArgumentException("Add your AI key in Settings before enabling background runs.");
            synchronized (OrbitBackgroundStore.LOCK) {
                OrbitBackgroundStore.saveKey(getContext(), key);
                if (!OrbitBackgroundStore.prefs(getContext()).edit()
                    .putString(OrbitBackgroundStore.KEY_WORKSPACE, snapshot)
                    .putString(OrbitBackgroundStore.KEY_LAST_ERROR, "")
                    .putLong(OrbitBackgroundStore.KEY_GENERATION, OrbitBackgroundStore.prefs(getContext()).getLong(OrbitBackgroundStore.KEY_GENERATION, 0) + 1)
                    .putBoolean(OrbitBackgroundStore.KEY_ENABLED, true).commit()) {
                    throw new IllegalStateException("Could not save the background schedule.");
                }
            }
            OrbitBackgroundStore.schedule(getContext());
            call.resolve(statusObject());
        } catch (Exception error) {
            // Never leave a partially configured schedule or credential behind.
            try { OrbitBackgroundStore.disable(getContext()); } catch (Exception ignored) { /* Report the original failure. */ }
            call.reject(error.getMessage() == null ? "Could not enable background runs." : error.getMessage());
        }
    }

    @PluginMethod
    public void syncWorkspace(PluginCall call) {
        String snapshot = call.getString("workspace");
        try {
            OrbitBackgroundStore.checkSnapshot(snapshot);
            synchronized (OrbitBackgroundStore.LOCK) {
                boolean enabled = OrbitBackgroundStore.prefs(getContext()).getBoolean(OrbitBackgroundStore.KEY_ENABLED, false);
                if (!enabled) { call.resolve(statusObject()); return; }
                String previous = OrbitBackgroundStore.prefs(getContext()).getString(OrbitBackgroundStore.KEY_WORKSPACE, "");
                if (!OrbitBackgroundStore.sameProvider(previous, snapshot)) {
                    OrbitBackgroundStore.disable(getContext());
                    call.resolve(statusObject().put("reason", "provider_changed"));
                    return;
                }
                if (!OrbitBackgroundStore.prefs(getContext()).edit().putString(OrbitBackgroundStore.KEY_WORKSPACE, snapshot).commit()) {
                    throw new IllegalStateException("Could not update background agents.");
                }
            }
            call.resolve(statusObject());
        } catch (Exception error) {
            call.reject(error.getMessage() == null ? "Could not update background agents." : error.getMessage());
        }
    }

    @PluginMethod
    public void updateKey(PluginCall call) {
        try {
            synchronized (OrbitBackgroundStore.LOCK) {
                if (!OrbitBackgroundStore.prefs(getContext()).getBoolean(OrbitBackgroundStore.KEY_ENABLED, false)) {
                    call.reject("Background runs are not enabled.");
                    return;
                }
                String key = call.getString("apiKey");
                if (key == null || key.trim().isEmpty()) {
                    OrbitBackgroundStore.disable(getContext());
                    call.resolve(statusObject());
                    return;
                }
                OrbitBackgroundStore.saveKey(getContext(), key);
            }
            call.resolve(statusObject());
        } catch (Exception error) {
            call.reject("Could not securely update the background key. Disable and re-enable background runs.");
        }
    }

    @PluginMethod
    public void disable(PluginCall call) {
        try { OrbitBackgroundStore.disable(getContext()); call.resolve(statusObject()); }
        catch (Exception error) { call.reject("Could not disable background runs. Check device storage."); }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            OrbitBackgroundStore.disable(getContext());
            OrbitBackgroundStore.clearResults(getContext());
            call.resolve(statusObject());
        } catch (Exception error) { call.reject("Could not clear background runs. Check device storage."); }
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(statusObject());
    }

    @PluginMethod
    public void restoreKey(PluginCall call) {
        try {
            if (!OrbitBackgroundStore.prefs(getContext()).getBoolean(OrbitBackgroundStore.KEY_ENABLED, false)) {
                call.reject("Background runs are not enabled."); return;
            }
            call.resolve(new JSObject().put("apiKey", OrbitBackgroundStore.readKey(getContext())));
        } catch (Exception error) {
            call.reject("The encrypted AI key is unavailable. Disable and re-enable background runs.");
        }
    }

    @PluginMethod
    public void pending(PluginCall call) {
        try {
            synchronized (OrbitBackgroundStore.LOCK) {
                JSArray runs = new JSArray(OrbitBackgroundStore.pending(getContext()).toString());
                call.resolve(new JSObject().put("runs", runs));
            }
        } catch (JSONException error) {
            call.reject("Could not read background results.");
        }
    }

    @PluginMethod
    public void acknowledge(PluginCall call) {
        JSArray ids = call.getArray("ids");
        if (ids == null) { call.reject("Missing result IDs."); return; }
        try {
            OrbitBackgroundStore.acknowledge(getContext(), ids);
            call.resolve(statusObject());
        } catch (Exception error) {
            call.reject("Could not mark background results as received.");
        }
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(new JSObject().put("granted", true));
        } else {
            requestPermissionForAlias("notifications", call, "notificationsCallback");
        }
    }

    @PermissionCallback
    private void notificationsCallback(PluginCall call) {
        call.resolve(new JSObject().put("granted", getPermissionState("notifications") == PermissionState.GRANTED));
    }

    private JSObject statusObject() {
        JSObject data = new JSObject();
        try {
            data.put("pendingCount", OrbitBackgroundStore.pending(getContext()).length());
        } catch (JSONException error) {
            data.put("pendingCount", 0);
        }
        data.put("enabled", OrbitBackgroundStore.prefs(getContext()).getBoolean(OrbitBackgroundStore.KEY_ENABLED, false));
        data.put("lastRunAt", OrbitBackgroundStore.prefs(getContext()).getString(OrbitBackgroundStore.KEY_LAST_RUN, ""));
        data.put("lastError", OrbitBackgroundStore.prefs(getContext()).getString(OrbitBackgroundStore.KEY_LAST_ERROR, ""));
        data.put("notificationsGranted", Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED);
        return data;
    }
}
