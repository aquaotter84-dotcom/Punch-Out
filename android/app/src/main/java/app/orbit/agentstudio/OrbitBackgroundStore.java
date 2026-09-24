package app.orbit.agentstudio;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.TimeUnit;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** App-private scheduling state. Only the AI key is encrypted (with a non-exportable Keystore key).
 * Agent settings and approved memories are stored in app-private preferences, like webview data.
 * Android backup is disabled in the manifest so ciphertext is not restored without its Keystore key.
 */
final class OrbitBackgroundStore {
    static final Object LOCK = new Object();
    static final String PREFS = "orbit_background_v1";
    static final String WORK_NAME = "orbit_periodic_agents";
    static final String KEY_ENABLED = "enabled";
    static final String KEY_WORKSPACE = "workspace";
    static final String KEY_SECRET = "encrypted_ai_key";
    static final String KEY_PENDING = "pending_runs";
    static final String KEY_ATTEMPTS = "agent_attempts";
    static final String KEY_LAST_RUN = "last_run_at";
    static final String KEY_LAST_ERROR = "last_error";
    static final String KEY_GENERATION = "schedule_generation";
    private static final String KEY_ALIAS = "orbit_background_ai_key_v1";
    static final int MAX_PENDING = 100;

    private OrbitBackgroundStore() {}

    static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void schedule(Context context) {
        synchronized (LOCK) {
            if (!prefs(context).getBoolean(KEY_ENABLED, false)) return;
            Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
            PeriodicWorkRequest work = new PeriodicWorkRequest.Builder(OrbitBackgroundWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build();
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, work);
        }
    }

    static void disable(Context context) {
        synchronized (LOCK) {
            SharedPreferences state = prefs(context);
            if (!state.edit().putBoolean(KEY_ENABLED, false).remove(KEY_SECRET).remove(KEY_WORKSPACE).remove(KEY_ATTEMPTS)
                .putLong(KEY_GENERATION, state.getLong(KEY_GENERATION, 0) + 1).commit()) {
                throw new IllegalStateException("Could not disable background runs. Check device storage.");
            }
            try {
                KeyStore store = KeyStore.getInstance("AndroidKeyStore");
                store.load(null);
                if (store.containsAlias(KEY_ALIAS)) store.deleteEntry(KEY_ALIAS);
            } catch (Exception ignored) { /* Ciphertext was removed even if the old alias cannot be deleted. */ }
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME);
        }
        // Retain completed results until the user has imported them into their workspace.
    }

    static void clearResults(Context context) {
        synchronized (LOCK) {
            if (!prefs(context).edit().remove(KEY_PENDING).remove(KEY_LAST_RUN).remove(KEY_LAST_ERROR).commit()) {
                throw new IllegalStateException("Could not clear background results. Check device storage.");
            }
        }
    }

    static void saveKey(Context context, String secret) throws Exception {
        if (secret == null || secret.trim().isEmpty()) throw new IllegalArgumentException("Add your AI key in Settings first.");
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        SecretKey key;
        if (store.containsAlias(KEY_ALIAS)) {
            key = (SecretKey) store.getKey(KEY_ALIAS, null);
        } else {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
            key = generator.generateKey();
        }
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] iv = cipher.getIV();
        byte[] ciphertext = cipher.doFinal(secret.trim().getBytes(StandardCharsets.UTF_8));
        byte[] packed = ByteBuffer.allocate(1 + iv.length + ciphertext.length).put((byte) iv.length).put(iv).put(ciphertext).array();
        if (!prefs(context).edit().putString(KEY_SECRET, Base64.encodeToString(packed, Base64.NO_WRAP)).commit()) {
            throw new IllegalStateException("Could not save the encrypted AI key.");
        }
    }

    static String readKey(Context context) throws Exception {
        String encoded = prefs(context).getString(KEY_SECRET, "");
        if (encoded == null || encoded.isEmpty()) throw new IllegalStateException("Background AI key is missing. Enable background runs again.");
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        SecretKey key = (SecretKey) store.getKey(KEY_ALIAS, null);
        if (key == null) throw new IllegalStateException("Background AI key is unavailable. Enable background runs again.");
        byte[] packed = Base64.decode(encoded, Base64.DEFAULT);
        ByteBuffer bytes = ByteBuffer.wrap(packed);
        int ivLength = bytes.get() & 0xff;
        if (ivLength != 12 || bytes.remaining() <= ivLength) throw new IllegalStateException("Stored key is invalid. Enable background runs again.");
        byte[] iv = new byte[ivLength];
        bytes.get(iv);
        byte[] ciphertext = new byte[bytes.remaining()];
        bytes.get(ciphertext);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    }

    static JSONArray pending(Context context) throws JSONException {
        String raw = prefs(context).getString(KEY_PENDING, "[]");
        return new JSONArray(raw == null ? "[]" : raw);
    }

    static void appendResult(Context context, JSONObject run) throws JSONException {
        synchronized (LOCK) {
            JSONArray pending = pending(context);
            if (pending.length() >= MAX_PENDING) return; // Worker stops before this limit to avoid dropping results.
            pending.put(run);
            if (!prefs(context).edit().putString(KEY_PENDING, pending.toString()).commit()) {
                throw new IllegalStateException("Could not save the background result.");
            }
        }
    }

    static void acknowledge(Context context, JSONArray ids) throws JSONException {
        synchronized (LOCK) {
            JSONArray pending = pending(context);
            JSONArray remaining = new JSONArray();
            for (int i = 0; i < pending.length(); i++) {
                JSONObject run = pending.optJSONObject(i);
                if (run == null) continue;
                boolean acknowledged = false;
                for (int j = 0; j < ids.length(); j++) {
                    if (run.optString("id").equals(ids.optString(j))) { acknowledged = true; break; }
                }
                if (!acknowledged) remaining.put(run);
            }
            if (!prefs(context).edit().putString(KEY_PENDING, remaining.toString()).commit()) {
                throw new IllegalStateException("Could not acknowledge background results.");
            }
        }
    }

    static JSONObject json(String raw) throws JSONException {
        return new JSONObject(raw);
    }

    static boolean sameProvider(String original, String updated) {
        try {
            JSONObject oldSettings = json(original).getJSONObject("settings");
            JSONObject newSettings = json(updated).getJSONObject("settings");
            return oldSettings.optString("provider").equals(newSettings.optString("provider"))
                && oldSettings.optString("endpoint").equals(newSettings.optString("endpoint"))
                && oldSettings.optString("model").equals(newSettings.optString("model"));
        } catch (JSONException exception) {
            return false;
        }
    }

    static void checkSnapshot(String raw) throws JSONException {
        if (raw == null || raw.getBytes(StandardCharsets.UTF_8).length > 700_000) throw new IllegalArgumentException("Background workspace is too large. Remove unused agents or memories.");
        JSONObject data = json(raw);
        if (!(data.get("agents") instanceof JSONArray) || !(data.get("memories") instanceof JSONArray)) throw new JSONException("Background workspace is incomplete.");
        JSONObject settings = data.getJSONObject("settings");
        String endpoint = settings.getString("endpoint");
        try {
            java.net.URI url = new java.net.URI(endpoint);
            if (!"https".equalsIgnoreCase(url.getScheme()) || url.getHost() == null || url.getRawUserInfo() != null) throw new IllegalArgumentException();
        } catch (Exception exception) {
            throw new IllegalArgumentException("Set a valid HTTPS AI provider endpoint before enabling background runs.");
        }
        if (settings.optString("model").trim().isEmpty()) throw new IllegalArgumentException("Set an AI model before enabling background runs.");
    }
}
