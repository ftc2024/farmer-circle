import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://nsnjgfcuuesqibmpbiuv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbmpnZmN1dWVzcWlibXBiaXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcwMTEsImV4cCI6MjA5ODcxMzAxMX0.FdsZBJUeSh1b5BmxrxXdkkQbVfKevRToO90YFl7PsnY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

const $ = (selector) => document.querySelector(selector);

function setText(selector, value = "") {
  const element = $(selector);
  if (element) element.textContent = value;
}

function setValue(selector, value = "") {
  const element = $(selector);
  if (element) element.value = value;
}

function getInitials(name) {
  const words = String(name || "FC").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "FC";
}

function paintAvatar(selector, name, avatarUrl) {
  const element = $(selector);
  if (!element) return;
  element.textContent = avatarUrl ? "" : getInitials(name);
  element.style.backgroundImage = avatarUrl ? `url("${avatarUrl}")` : "linear-gradient(135deg, var(--purple), var(--cyan))";
}

async function syncProfileFields() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return;

  const user = session.user;
  const metadata = user.user_metadata || {};
  let fullName = metadata.full_name || user.email?.split("@")[0] || "Trader";
  let role = metadata.role || "member";

  const profileResult = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.data) {
    fullName = profileResult.data.full_name || fullName;
    role = profileResult.data.role || role;
  }

  setValue("#profile-name", fullName === "Trader" ? "" : fullName);
  setValue("#profile-email", user.email || "");
  setValue("#profile-role", role);
  setText("#profile-hero-name", fullName);
  setText("#profile-hero-email", user.email || "-");
  setText("#user-display-name", fullName);
  setText("#user-display-meta", role);
  setText("#user-role", role);
  paintAvatar("#user-avatar", fullName, metadata.avatar_url || "");
  paintAvatar("#profile-avatar-preview", fullName, metadata.avatar_url || "");
}

async function saveProfileSafely(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "profile-form") return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const nameInput = $("#profile-name");
  const message = $("#profile-message");
  const errorBox = $("#profile-error");
  const button = form.querySelector("button[type='submit']");
  const buttonText = button?.querySelector("span");
  const fullName = nameInput?.value.trim();

  if (message) message.textContent = "";
  if (errorBox) errorBox.textContent = "";

  if (!fullName) {
    if (errorBox) errorBox.textContent = "Nama wajib diisi.";
    return;
  }

  if (button) button.disabled = true;
  if (buttonText) buttonText.textContent = "Menyimpan...";

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) throw new Error("Session login tidak ditemukan. Coba login ulang.");

    const authUpdate = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (authUpdate.error) throw authUpdate.error;

    // Jangan bikin tombol stuck gara-gara RLS profiles. Update tabel dicoba, tapi tidak memblok UI.
    supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) console.warn("profiles update skipped by policy:", error.message);
      });

    setText("#user-display-name", fullName);
    setText("#profile-hero-name", fullName);
    paintAvatar("#user-avatar", fullName, authUpdate.data.user?.user_metadata?.avatar_url || "");
    paintAvatar("#profile-avatar-preview", fullName, authUpdate.data.user?.user_metadata?.avatar_url || "");

    if (message) message.textContent = "Profile berhasil disimpan.";
  } catch (error) {
    if (errorBox) errorBox.textContent = error.message || "Gagal menyimpan profile.";
  } finally {
    if (button) button.disabled = false;
    if (buttonText) buttonText.textContent = "Simpan Profile";
  }
}

document.addEventListener("submit", saveProfileSafely, true);

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(syncProfileFields, 600);
});

supabase.auth.onAuthStateChange(() => {
  setTimeout(syncProfileFields, 300);
});
