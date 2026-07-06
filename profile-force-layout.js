import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROFILE_VERSION = "profile-force-v1";
const AVATAR_BUCKET = "profile-photos";
const AVATAR_SIZE = 512;
const AVATAR_QUALITY = 0.9;
const MAX_AVATAR_SOURCE = 8 * 1024 * 1024;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
let supabaseClientPromise;

async function getSupabase() {
  if (supabaseClientPromise) return supabaseClientPromise;
  supabaseClientPromise = fetch(`./app.js?v=${Date.now()}`, { cache: "no-store" })
    .then((response) => response.text())
    .then((source) => {
      const url = source.match(/const\s+SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
      const key = source.match(/const\s+SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/)?.[1];
      if (!url || !key) throw new Error("Konfigurasi Supabase tidak ditemukan.");
      return createClient(url, key, {
        auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
      });
    });
  return supabaseClientPromise;
}

function escapeHTML(value = "") {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function initials(name) {
  return String(name || "FC")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "FC";
}

function setText(selector, value = "") {
  const el = $(selector);
  if (el) el.textContent = value;
}

function setValue(selector, value = "") {
  const el = $(selector);
  if (el) el.value = value ?? "";
}

function getValue(selector) {
  return $(selector)?.value.trim() || "";
}

function paintAvatar(selector, name, url) {
  const el = $(selector);
  if (!el) return;
  el.textContent = url ? "" : initials(name);
  el.style.setProperty("background-image", url ? `url("${url}")` : "linear-gradient(135deg, var(--purple), var(--cyan))", "important");
  el.style.setProperty("background-size", "cover", "important");
  el.style.setProperty("background-position", "center", "important");
  el.style.setProperty("background-repeat", "no-repeat", "important");
}

function injectStyles() {
  if ($("#profile-force-style")) return;
  const style = document.createElement("style");
  style.id = "profile-force-style";
  style.textContent = `
    #profile-section.force-profile-v1 { width: 100%; }
    #profile-section.force-profile-v1 .pf-wrap { width: min(100%, 980px); display: grid; gap: 22px; }
    #profile-section.force-profile-v1 .pf-card {
      position: relative; display: grid; gap: 18px; padding: 28px; overflow: hidden;
      border: 1px solid rgba(198,255,0,.42); border-radius: 18px;
      background: radial-gradient(circle at 96% 4%, rgba(198,255,0,.22), transparent 25%), radial-gradient(circle at 6% 0%, rgba(37,212,206,.16), transparent 30%), linear-gradient(135deg, rgba(198,255,0,.11), rgba(20,28,26,.88) 38%, rgba(7,10,18,.95));
      box-shadow: 0 30px 92px rgba(0,0,0,.58), 0 0 0 1px rgba(198,255,0,.08), 0 0 58px rgba(198,255,0,.14), inset 0 1px 0 rgba(255,255,255,.06);
      backdrop-filter: blur(18px);
    }
    #profile-section.force-profile-v1 .pf-card::before { content:""; position:absolute; inset:0; pointer-events:none; background: linear-gradient(90deg, transparent, rgba(198,255,0,.22), transparent) top left / 100% 1px no-repeat, linear-gradient(180deg, rgba(198,255,0,.20), transparent 44%) top right / 1px 100% no-repeat; filter: drop-shadow(0 0 12px rgba(198,255,0,.24)); }
    #profile-section.force-profile-v1 .pf-card::after { content:""; position:absolute; inset:8px; border-radius:12px; pointer-events:none; background: linear-gradient(#c6ff00,#c6ff00) right top / 12px 2px no-repeat, linear-gradient(#c6ff00,#c6ff00) right top / 2px 12px no-repeat, linear-gradient(#c6ff00,#c6ff00) left bottom / 12px 2px no-repeat, linear-gradient(#c6ff00,#c6ff00) left bottom / 2px 12px no-repeat; filter: drop-shadow(0 0 10px rgba(198,255,0,.36)); }
    #profile-section.force-profile-v1 .pf-card > * { position: relative; z-index: 1; }
    #profile-section.force-profile-v1 .pf-head { display: flex; align-items: center; gap: 18px; min-width: 0; padding: 2px 0; }
    #profile-section.force-profile-v1 .pf-avatar { width: 72px; height: 72px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid rgba(198,255,0,.28); border-radius: 14px; background: rgba(12,14,20,.92); cursor: pointer; overflow: hidden; box-shadow: 0 16px 34px rgba(0,0,0,.38), 0 0 0 4px rgba(198,255,0,.04), 0 0 34px rgba(198,255,0,.13); }
    #profile-section.force-profile-v1 .pf-avatar:hover { border-color: rgba(198,255,0,.58); box-shadow: 0 20px 42px rgba(0,0,0,.44), 0 0 0 4px rgba(198,255,0,.07), 0 0 40px rgba(198,255,0,.24); }
    #profile-section.force-profile-v1 .pf-avatar span { width:100%; height:100%; display:grid; place-items:center; color:#07101a; background-size:cover; background-position:center; background-image:linear-gradient(135deg,var(--purple),var(--cyan)); font-weight:1000; letter-spacing:.04em; }
    #profile-section.force-profile-v1 .pf-head h3 { margin:0 0 4px; color:var(--text); font-size:1rem; line-height:1.2; text-shadow:0 0 24px rgba(255,255,255,.10); }
    #profile-section.force-profile-v1 .pf-head p { margin:0 0 6px; color:var(--muted); font-size:.84rem; }
    #profile-section.force-profile-v1 .pf-role, #profile-section.force-profile-v1 .pf-label, #profile-section.force-profile-v1 label > span { font-family:"JetBrains Mono",monospace; text-transform:uppercase; letter-spacing:.12em; font-size:.68rem; font-weight:900; }
    #profile-section.force-profile-v1 .pf-role { color:#c6ff00; text-shadow:0 0 18px rgba(198,255,0,.36); }
    #profile-section.force-profile-v1 .pf-label { color:#b7c2dc; margin-top:2px; }
    #profile-section.force-profile-v1 .pf-line { height:1px; background:linear-gradient(90deg, rgba(198,255,0,.06), rgba(198,255,0,.20), rgba(37,212,206,.08)); margin:2px 0 0; }
    #profile-section.force-profile-v1 .pf-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
    #profile-section.force-profile-v1 label { display:grid; gap:8px; min-width:0; }
    #profile-section.force-profile-v1 label > span { color:#b7c2dc; }
    #profile-section.force-profile-v1 input, #profile-section.force-profile-v1 textarea { width:100%; border-radius:8px; background:rgba(8,10,14,.88); border:1px solid rgba(150,165,210,.15); color:var(--text); box-shadow:inset 0 1px 0 rgba(255,255,255,.035), 0 10px 24px rgba(0,0,0,.14); transition:border-color .18s ease, box-shadow .18s ease, background .18s ease; }
    #profile-section.force-profile-v1 input:hover, #profile-section.force-profile-v1 textarea:hover { border-color:rgba(198,255,0,.26); background:rgba(9,12,16,.94); }
    #profile-section.force-profile-v1 input:focus, #profile-section.force-profile-v1 textarea:focus { border-color:rgba(198,255,0,.60); box-shadow:0 0 0 3px rgba(198,255,0,.09), 0 0 28px rgba(198,255,0,.09), inset 0 1px 0 rgba(255,255,255,.045); }
    #profile-section.force-profile-v1 input[readonly] { color:var(--text); background:rgba(8,10,14,.72); cursor:not-allowed; }
    #profile-section.force-profile-v1 .pf-upload { min-height:118px; display:grid; place-items:center; gap:5px; padding:18px; border:1px dashed rgba(198,255,0,.24); border-radius:12px; background:radial-gradient(circle at 50% 0%, rgba(198,255,0,.10), transparent 48%), rgba(255,255,255,.035); text-align:center; color:var(--muted); cursor:pointer; box-shadow:inset 0 0 30px rgba(198,255,0,.03); }
    #profile-section.force-profile-v1 .pf-upload:hover { border-color:rgba(198,255,0,.54); background:radial-gradient(circle at 50% 0%, rgba(198,255,0,.17), transparent 48%), rgba(198,255,0,.055); box-shadow:inset 0 0 36px rgba(198,255,0,.05), 0 0 30px rgba(198,255,0,.09); }
    #profile-section.force-profile-v1 .pf-upload i { color:#c6ff00; filter:drop-shadow(0 0 12px rgba(198,255,0,.46)); }
    #profile-section.force-profile-v1 .pf-upload b { color:var(--text); text-transform:uppercase; font-weight:1000; }
    #profile-section.force-profile-v1 .pf-upload small { color:var(--muted); font-size:.68rem; line-height:1.4; }
    #profile-section.force-profile-v1 .pf-file { margin-top:-10px; padding:0; min-height:31px; border-radius:0; color:var(--text); background:rgba(8,10,14,.84); }
    #profile-section.force-profile-v1 .pf-file::file-selector-button { min-height:31px; margin-right:12px; padding:0 14px; border:0; border-right:1px solid rgba(150,165,210,.18); color:var(--text); background:rgba(255,255,255,.04); cursor:pointer; }
    #profile-section.force-profile-v1 .pf-file::file-selector-button:hover { color:#07101a; background:#c6ff00; }
    #profile-section.force-profile-v1 .pf-message, #profile-section.force-profile-v1 .pf-error { min-height:20px; margin:0; font-size:.84rem; font-weight:800; }
    #profile-section.force-profile-v1 .pf-message { color:var(--cyan); }
    #profile-section.force-profile-v1 .pf-error { color:var(--danger); }
    #profile-section.force-profile-v1 .pf-action { display:flex; justify-content:flex-end; padding-top:10px; border-top:1px solid rgba(198,255,0,.09); }
    #profile-section.force-profile-v1 .pf-action .primary-button { width:auto; min-width:170px; color:#07101a; background:#c6ff00; box-shadow:0 16px 34px rgba(198,255,0,.16), 0 0 30px rgba(198,255,0,.12); }
    #profile-section.force-profile-v1 .pf-action .primary-button:hover { transform:translateY(-1px); box-shadow:0 20px 42px rgba(198,255,0,.20), 0 0 38px rgba(198,255,0,.18); }
    @media(max-width:760px){ #profile-section.force-profile-v1 .pf-card{padding:22px 18px;} #profile-section.force-profile-v1 .pf-grid{grid-template-columns:1fr;} #profile-section.force-profile-v1 .pf-head{align-items:flex-start;} #profile-section.force-profile-v1 .pf-action .primary-button{width:100%;} }
  `;
  document.head.appendChild(style);
}

function profileHTML() {
  return `
    <div class="pf-wrap">
      <form id="profile-force-form" class="pf-card" novalidate>
        <div class="pf-head">
          <label class="pf-avatar" for="profile-avatar-input" aria-label="Upload avatar"><span id="profile-avatar-preview">FC</span></label>
          <div><p class="eyebrow small-eyebrow">Account Center</p><h3 id="profile-hero-name">Profile Trader</h3><p id="profile-hero-email">-</p><strong class="pf-role">ROLE: <span id="profile-role-label">USER</span></strong></div>
        </div>
        <div class="pf-line"></div>
        <div class="pf-label">Informasi Pribadi</div>
        <div class="pf-grid"><label><span>Nama Tampilan</span><input id="profile-name" required maxlength="80" /></label><label><span>Nomor Telepon</span><input id="profile-phone" type="tel" placeholder="+628..." maxlength="32" /></label></div>
        <div class="pf-grid"><label><span>Nama Depan</span><input id="profile-first-name" maxlength="60" /></label><label><span>Nama Belakang</span><input id="profile-last-name" maxlength="60" /></label></div>
        <label><span>Alamat Email</span><input id="profile-email" type="email" readonly /></label><input id="profile-role" type="hidden" />
        <div class="pf-label">Avatar</div>
        <label class="pf-upload" for="profile-avatar-input"><i data-lucide="scan-face"></i><b>Upload Avatar</b><small>Otomatis crop square 1:1 dan kompres agar avatar tidak gepeng.</small></label>
        <input id="profile-avatar-input" class="pf-file" type="file" accept="image/png,image/jpeg,image/webp" />
        <label><span>Bio</span><textarea id="profile-bio" rows="4" placeholder="Ceritakan singkat profil trading kamu..."></textarea></label>
        <label><span>Alamat</span><input id="profile-address" maxlength="180" /></label>
        <div class="pf-grid"><label><span>Kota</span><input id="profile-city" maxlength="80" /></label><label><span>Negara</span><input id="profile-country" maxlength="80" /></label></div>
        <p id="profile-message" class="pf-message" role="status"></p><p id="profile-error" class="pf-error" role="alert"></p>
        <div class="pf-action"><button class="primary-button" type="submit"><i data-lucide="save"></i><span>Simpan Profil</span></button></div>
      </form>
    </div>
  `;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gambar avatar gagal dibaca.")); };
    image.src = url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Crop avatar gagal diproses.")), "image/webp", AVATAR_QUALITY);
  });
}

async function cropAvatar(file) {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar JPG, PNG, atau WebP.");
  if (file.size > MAX_AVATAR_SOURCE) throw new Error("Ukuran gambar maksimal 8MB sebelum crop.");
  const image = await loadImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const side = Math.min(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  const blob = await canvasToBlob(canvas);
  return new File([blob], "avatar-cropped.webp", { type: "image/webp", lastModified: Date.now() });
}

async function loadProfileData() {
  try {
    const client = await getSupabase();
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    const meta = user.user_metadata || {};
    let name = meta.full_name || user.email?.split("@")[0] || "Trader";
    let role = meta.role || "user";
    let avatarUrl = meta.avatar_url || "";
    const profile = await client.from("profiles").select("full_name, role, avatar_url").eq("id", user.id).maybeSingle();
    if (profile.data) {
      name = profile.data.full_name || name;
      role = profile.data.role || role;
      avatarUrl = profile.data.avatar_url || avatarUrl;
    }
    setValue("#profile-name", name === "Trader" ? "" : name);
    setValue("#profile-phone", meta.phone || "");
    setValue("#profile-first-name", meta.first_name || "");
    setValue("#profile-last-name", meta.last_name || "");
    setValue("#profile-email", user.email || "");
    setValue("#profile-role", role);
    setValue("#profile-bio", meta.bio || "");
    setValue("#profile-address", meta.address || "");
    setValue("#profile-city", meta.city || "");
    setValue("#profile-country", meta.country || "");
    setText("#profile-hero-name", name);
    setText("#profile-hero-email", user.email || "-");
    setText("#profile-role-label", String(role || "user").toUpperCase());
    setText("#user-role", role);
    setText("#user-display-name", name);
    setText("#user-display-meta", role);
    paintAvatar("#profile-avatar-preview", name, avatarUrl);
    paintAvatar("#user-avatar", name, avatarUrl);
  } catch (error) {
    console.warn("profile force load skipped:", error.message);
  }
}

async function uploadAvatar(file) {
  const client = await getSupabase();
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  if (!user) throw new Error("Session login tidak ditemukan. Coba login ulang.");
  const name = getValue("#profile-name") || user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader";
  setText("#profile-message", "Menyiapkan avatar square 1:1...");
  const cropped = await cropAvatar(file);
  const previewUrl = URL.createObjectURL(cropped);
  paintAvatar("#profile-avatar-preview", name, previewUrl);
  paintAvatar("#user-avatar", name, previewUrl);
  setTimeout(() => URL.revokeObjectURL(previewUrl), 4000);
  setText("#profile-message", "Mengupload avatar...");
  const path = `${user.id}/avatar.webp`;
  const upload = await client.storage.from(AVATAR_BUCKET).upload(path, cropped, { cacheControl: "3600", upsert: true, contentType: "image/webp" });
  if (upload.error) throw new Error(`Upload gagal: ${upload.error.message}. Pastikan bucket '${AVATAR_BUCKET}' dan policy storage sudah benar.`);
  const { data: publicData } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
  const authUpdate = await client.auth.updateUser({ data: { full_name: name, avatar_url: avatarUrl, avatar_path: path } });
  if (authUpdate.error) throw authUpdate.error;
  client.from("profiles").update({ full_name: name, avatar_url: avatarUrl, avatar_path: path }).eq("id", user.id).then(({ error }) => {
    if (error) console.warn("profiles avatar update skipped by policy:", error.message);
  });
  paintAvatar("#profile-avatar-preview", name, avatarUrl);
  paintAvatar("#user-avatar", name, avatarUrl);
  setText("#profile-message", "Avatar berhasil diperbarui.");
}

async function saveProfile(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  setText("#profile-message", "");
  setText("#profile-error", "");
  const name = getValue("#profile-name");
  if (!name) return setText("#profile-error", "Nama tampilan wajib diisi.");
  const button = event.currentTarget.querySelector("button[type='submit']");
  const span = button?.querySelector("span");
  if (button) button.disabled = true;
  if (span) span.textContent = "Menyimpan...";
  try {
    const client = await getSupabase();
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    if (!user) throw new Error("Session login tidak ditemukan. Coba login ulang.");
    const payload = {
      full_name: name,
      phone: getValue("#profile-phone"),
      first_name: getValue("#profile-first-name"),
      last_name: getValue("#profile-last-name"),
      bio: getValue("#profile-bio"),
      address: getValue("#profile-address"),
      city: getValue("#profile-city"),
      country: getValue("#profile-country"),
      avatar_url: user.user_metadata?.avatar_url || "",
      avatar_path: user.user_metadata?.avatar_path || "",
    };
    const authUpdate = await client.auth.updateUser({ data: payload });
    if (authUpdate.error) throw authUpdate.error;
    client.from("profiles").update({ full_name: name }).eq("id", user.id).then(({ error }) => {
      if (error) console.warn("profiles update skipped by policy:", error.message);
    });
    setText("#profile-message", "Profil berhasil disimpan.");
    await loadProfileData();
  } catch (error) {
    setText("#profile-error", error.message || "Gagal menyimpan profil.");
  } finally {
    if (button) button.disabled = false;
    if (span) span.textContent = "Simpan Profil";
  }
}

function bindEvents() {
  const form = $("#profile-force-form");
  if (form && form.dataset.bound !== "1") {
    form.dataset.bound = "1";
    form.addEventListener("submit", saveProfile, true);
  }
  const input = $("#profile-avatar-input");
  if (input && input.dataset.bound !== "1") {
    input.dataset.bound = "1";
    input.addEventListener("change", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      try {
        setText("#profile-error", "");
        await uploadAvatar(file);
      } catch (error) {
        setText("#profile-error", error.message || "Gagal upload avatar.");
      } finally {
        event.currentTarget.value = "";
      }
    }, true);
  }
}

function applyForcedProfile() {
  injectStyles();
  const section = $("#profile-section");
  if (!section) return;
  const shouldReplace = section.dataset.profileVersion !== PROFILE_VERSION || $(".profile-grid", section) || $("#profile-form", section) || $("#password-form", section);
  if (shouldReplace) {
    section.classList.add("force-profile-v1");
    section.dataset.profileVersion = PROFILE_VERSION;
    section.innerHTML = profileHTML();
  }
  bindEvents();
  window.lucide?.createIcons();
  loadProfileData();
}

function boot() {
  applyForcedProfile();
  setTimeout(applyForcedProfile, 300);
  setTimeout(applyForcedProfile, 900);
  setTimeout(applyForcedProfile, 1800);
  setTimeout(applyForcedProfile, 3200);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

window.addEventListener("focus", loadProfileData);
setInterval(() => {
  const section = $("#profile-section");
  if (section && (section.dataset.profileVersion !== PROFILE_VERSION || $(".profile-grid", section) || $("#password-form", section))) applyForcedProfile();
}, 1200);
