import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const $ = (selector) => document.querySelector(selector);
let supabasePromise;

async function createSupabaseFromAppConfig() {
  if (supabasePromise) return supabasePromise;

  supabasePromise = fetch(`./app.js?v=${Date.now()}`, { cache: "no-store" })
    .then((response) => response.text())
    .then((source) => {
      const url = source.match(/const\s+SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
      const key = source.match(/const\s+SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/)?.[1];

      if (!url || !key) {
        throw new Error("Konfigurasi Supabase tidak ditemukan di app.js.");
      }

      return createClient(url, key, {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    });

  return supabasePromise;
}

function setText(selector, value = "") {
  const element = $(selector);
  if (element) element.textContent = value;
}

function getInitials(name) {
  const words = String(name || "FC").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "FC";
}

function paintAvatar(selector, name, avatarUrl) {
  const element = $(selector);
  if (!element) return;

  element.textContent = avatarUrl ? "" : getInitials(name);

  if (avatarUrl) {
    element.style.setProperty("background-image", `url("${avatarUrl}")`, "important");
    element.style.setProperty("background-size", "cover", "important");
    element.style.setProperty("background-position", "center", "important");
    element.style.setProperty("background-repeat", "no-repeat", "important");
  } else {
    element.style.setProperty("background-image", "linear-gradient(135deg, var(--purple), var(--cyan))", "important");
    element.style.setProperty("background-size", "cover", "important");
    element.style.setProperty("background-position", "center", "important");
    element.style.setProperty("background-repeat", "no-repeat", "important");
  }
}

async function getCurrentUser(client) {
  const { data } = await client.auth.getSession();
  return data.session?.user || null;
}

async function syncAvatarFromProfile() {
  try {
    const client = await createSupabaseFromAppConfig();
    const user = await getCurrentUser(client);
    if (!user) return;

    const meta = user.user_metadata || {};
    let name = meta.full_name || user.email?.split("@")[0] || "Trader";
    let avatarUrl = meta.avatar_url || "";

    const profileResult = await client
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.data) {
      name = profileResult.data.full_name || name;
      avatarUrl = profileResult.data.avatar_url || avatarUrl;
    }

    paintAvatar("#user-avatar", name, avatarUrl);
    paintAvatar("#profile-avatar-preview", name, avatarUrl);
    setText("#user-display-name", name);
    setText("#profile-hero-name", name);
  } catch (error) {
    console.warn("Avatar sync skipped:", error.message);
  }
}

async function uploadAvatar(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.id !== "profile-avatar-input") return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const file = input.files?.[0];
  if (!file) return;

  setText("#profile-message", "");
  setText("#profile-error", "");

  try {
    const client = await createSupabaseFromAppConfig();
    const user = await getCurrentUser(client);
    if (!user) throw new Error("Session login tidak ditemukan. Coba login ulang.");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("File harus berupa gambar JPG, PNG, atau WEBP.");
    }

    if (file.size > MAX_AVATAR_SIZE) {
      throw new Error("Ukuran foto maksimal 5MB. Pilih gambar yang lebih kecil.");
    }

    const name = $("#profile-name")?.value.trim() || user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader";
    const temporaryUrl = URL.createObjectURL(file);
    paintAvatar("#profile-avatar-preview", name, temporaryUrl);
    paintAvatar("#user-avatar", name, temporaryUrl);
    setText("#profile-message", "Mengupload foto profile...");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
    const avatarPath = `${user.id}/avatar.${safeExtension}`;

    const { error: uploadError } = await client.storage
      .from(AVATAR_BUCKET)
      .upload(avatarPath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`Upload gagal: ${uploadError.message}. Pastikan bucket '${AVATAR_BUCKET}' dan policy storage sudah benar.`);
    }

    const { data: publicData } = client.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
    const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;

    const authUpdate = await client.auth.updateUser({
      data: {
        full_name: name,
        avatar_url: avatarUrl,
        avatar_path: avatarPath,
      },
    });

    if (authUpdate.error) throw authUpdate.error;

    client
      .from("profiles")
      .update({ full_name: name, avatar_url: avatarUrl, avatar_path: avatarPath })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) console.warn("profiles avatar update skipped by policy:", error.message);
      });

    paintAvatar("#profile-avatar-preview", name, avatarUrl);
    paintAvatar("#user-avatar", name, avatarUrl);
    setText("#profile-message", "Foto profile berhasil diperbarui.");
  } catch (error) {
    setText("#profile-error", error.message || "Gagal upload foto profile.");
    await syncAvatarFromProfile();
  } finally {
    input.value = "";
  }
}

document.addEventListener("change", uploadAvatar, true);
window.addEventListener("DOMContentLoaded", () => setTimeout(syncAvatarFromProfile, 900));
window.addEventListener("focus", () => syncAvatarFromProfile());
