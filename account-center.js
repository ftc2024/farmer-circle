const $a = (selector, root = document) => root.querySelector(selector);

let supabasePromise;

async function sb() {
  if (supabasePromise) return supabasePromise;

  supabasePromise = Promise.all([
    import("https://esm.sh/@supabase/supabase-js@2"),
    fetch(`./app.js?v=${Date.now()}`, { cache: "no-store" }).then((response) => response.text()),
  ]).then(([module, source]) => {
    const url = source.match(/const\s+SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
    const key = source.match(/const\s+SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/)?.[1];

    if (!url || !key) throw new Error("Konfigurasi Supabase tidak ditemukan.");

    return module.createClient(url, key, {
      auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    });
  });

  return supabasePromise;
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
  const element = $a(selector);
  if (element) element.textContent = value;
}

function setValue(selector, value = "") {
  const element = $a(selector);
  if (element) element.value = value ?? "";
}

function getValue(selector) {
  return $a(selector)?.value.trim() || "";
}

function paintAvatar(selector, name, avatarUrl) {
  const element = $a(selector);
  if (!element) return;

  element.textContent = avatarUrl ? "" : initials(name);
  element.style.setProperty(
    "background-image",
    avatarUrl ? `url("${avatarUrl}")` : "linear-gradient(135deg, var(--purple), var(--cyan))",
    "important"
  );
  element.style.setProperty("background-size", "cover", "important");
  element.style.setProperty("background-position", "center", "important");
}

function css() {
  if ($a("#acct-css")) return;

  const style = document.createElement("style");
  style.id = "acct-css";
  style.textContent = `
    #profile-section { width: 100%; }
    .acct-wrap {
      width: min(100%, 980px);
      display: grid;
      gap: 22px;
    }
    .acct-card {
      position: relative;
      display: grid;
      gap: 18px;
      padding: 26px;
      border: 1px solid rgba(198, 255, 0, .34);
      border-radius: 14px;
      background:
        radial-gradient(circle at top right, rgba(198, 255, 0, .13), transparent 32%),
        linear-gradient(135deg, rgba(198, 255, 0, .10), rgba(16, 22, 42, .78) 42%, rgba(7, 10, 18, .92));
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .acct-card::before,
    .acct-card::after {
      content: "";
      position: absolute;
      width: 12px;
      height: 12px;
      pointer-events: none;
    }
    .acct-card::before {
      top: 8px;
      right: 8px;
      border-top: 2px solid #c6ff00;
      border-right: 2px solid #c6ff00;
    }
    .acct-card::after {
      left: 8px;
      bottom: 8px;
      border-left: 2px solid #c6ff00;
      border-bottom: 2px solid #c6ff00;
    }
    .acct-head {
      display: flex;
      align-items: center;
      gap: 18px;
      min-width: 0;
    }
    .acct-avatar {
      width: 64px;
      height: 64px;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      border: 1px solid rgba(198, 255, 0, .22);
      border-radius: 10px;
      background: rgba(12, 14, 20, .92);
      cursor: pointer;
      overflow: hidden;
    }
    .acct-avatar span {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      color: #07101a;
      background-size: cover;
      background-position: center;
      background-image: linear-gradient(135deg, var(--purple), var(--cyan));
      font-weight: 1000;
      letter-spacing: .04em;
    }
    .acct-head h3 {
      margin: 0 0 4px;
      color: var(--text);
      font-size: 1rem;
      line-height: 1.2;
    }
    .acct-head p {
      margin: 0 0 6px;
      color: var(--muted);
      font-size: .84rem;
    }
    .acct-role,
    .acct-label,
    .acct-card label > span {
      font-family: "JetBrains Mono", monospace;
      text-transform: uppercase;
      letter-spacing: .12em;
      font-size: .68rem;
      font-weight: 900;
    }
    .acct-role { color: #c6ff00; }
    .acct-label { color: var(--muted); }
    .acct-line {
      height: 1px;
      background: rgba(150, 165, 210, .10);
      margin: 2px 0 0;
    }
    .acct-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .acct-card label {
      display: grid;
      gap: 8px;
      min-width: 0;
    }
    .acct-card label > span { color: #b7c2dc; }
    .acct-card input,
    .acct-card textarea {
      width: 100%;
      border-radius: 5px;
      background: rgba(8, 10, 14, .82);
      border: 1px solid rgba(150, 165, 210, .14);
      color: var(--text);
    }
    .acct-card input:focus,
    .acct-card textarea:focus {
      border-color: rgba(198, 255, 0, .44);
      box-shadow: 0 0 0 3px rgba(198, 255, 0, .08);
    }
    .acct-card input[readonly] {
      color: var(--text);
      background: rgba(8, 10, 14, .72);
      cursor: not-allowed;
    }
    .acct-upload {
      min-height: 114px;
      display: grid;
      place-items: center;
      gap: 5px;
      padding: 18px;
      border: 1px dashed rgba(150, 165, 210, .22);
      border-radius: 10px;
      background: rgba(255, 255, 255, .035);
      text-align: center;
      color: var(--muted);
      cursor: pointer;
    }
    .acct-upload:hover {
      border-color: rgba(198, 255, 0, .42);
      background: rgba(198, 255, 0, .055);
    }
    .acct-upload i { color: #c6ff00; }
    .acct-upload b {
      color: var(--text);
      text-transform: uppercase;
      font-weight: 1000;
    }
    .acct-upload small {
      color: var(--muted);
      font-size: .68rem;
      line-height: 1.4;
    }
    .acct-file-native {
      margin-top: -10px;
      padding: 0;
      min-height: 30px;
      border-radius: 0;
      color: var(--text);
      background: rgba(8, 10, 14, .84);
    }
    .acct-file-native::file-selector-button {
      min-height: 30px;
      margin-right: 12px;
      padding: 0 14px;
      border: 0;
      border-right: 1px solid rgba(150, 165, 210, .18);
      color: var(--text);
      background: rgba(255, 255, 255, .04);
      cursor: pointer;
    }
    .acct-message,
    .acct-error {
      min-height: 20px;
      margin: 0;
      font-size: .84rem;
      font-weight: 800;
    }
    .acct-message { color: var(--cyan); }
    .acct-error { color: var(--danger); }
    .acct-action {
      display: flex;
      justify-content: flex-end;
      padding-top: 8px;
      border-top: 1px solid rgba(150, 165, 210, .08);
    }
    .acct-action .primary-button {
      width: auto;
      min-width: 170px;
      color: #07101a;
      background: #c6ff00;
      box-shadow: 0 16px 34px rgba(198, 255, 0, .12);
    }
    .acct-action .primary-button:hover { transform: translateY(-1px); }
    @media (max-width: 760px) {
      .acct-card { padding: 22px 18px; }
      .acct-grid { grid-template-columns: 1fr; }
      .acct-head { align-items: flex-start; }
      .acct-action .primary-button { width: 100%; }
    }
  `;
  document.head.appendChild(style);
}

function html() {
  return `
    <div class="acct-wrap">
      <form id="account-profile-form" class="acct-card" novalidate>
        <div class="acct-head">
          <label class="acct-avatar" for="profile-avatar-input" aria-label="Upload avatar">
            <span id="profile-avatar-preview">FC</span>
          </label>
          <div>
            <h3 id="profile-hero-name">Profile Trader</h3>
            <p id="profile-hero-email">-</p>
            <strong class="acct-role">ROLE: <span id="profile-role-label">USER</span></strong>
          </div>
        </div>

        <div class="acct-line"></div>
        <div class="acct-label">Informasi Pribadi</div>

        <div class="acct-grid">
          <label>
            <span>Nama Tampilan</span>
            <input id="profile-name" required maxlength="80" />
          </label>
          <label>
            <span>Nomor Telepon</span>
            <input id="profile-phone" type="tel" placeholder="+628..." maxlength="32" />
          </label>
        </div>

        <div class="acct-grid">
          <label>
            <span>Nama Depan</span>
            <input id="profile-first-name" maxlength="60" />
          </label>
          <label>
            <span>Nama Belakang</span>
            <input id="profile-last-name" maxlength="60" />
          </label>
        </div>

        <label>
          <span>Alamat Email</span>
          <input id="profile-email" type="email" readonly />
        </label>
        <input id="profile-role" type="hidden" />

        <div class="acct-label">Avatar</div>
        <label class="acct-upload" for="profile-avatar-input">
          <i data-lucide="image-plus"></i>
          <b>Upload Avatar</b>
          <small>JPG, PNG, atau WebP maksimal 3MB.</small>
        </label>
        <input id="profile-avatar-input" class="acct-file-native" type="file" accept="image/png,image/jpeg,image/webp" />

        <label>
          <span>Bio</span>
          <textarea id="profile-bio" rows="4" placeholder="Ceritakan singkat profil trading kamu..."></textarea>
        </label>

        <label>
          <span>Alamat</span>
          <input id="profile-address" maxlength="180" />
        </label>

        <div class="acct-grid">
          <label>
            <span>Kota</span>
            <input id="profile-city" maxlength="80" />
          </label>
          <label>
            <span>Negara</span>
            <input id="profile-country" maxlength="80" />
          </label>
        </div>

        <p id="profile-message" class="acct-message" role="status"></p>
        <p id="profile-error" class="acct-error" role="alert"></p>

        <div class="acct-action">
          <button class="primary-button" type="submit">
            <i data-lucide="save"></i>
            <span>Simpan Profil</span>
          </button>
        </div>
      </form>
    </div>
  `;
}

async function loadProfile() {
  try {
    const client = await sb();
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    if (!user) return;

    const meta = user.user_metadata || {};
    let name = meta.full_name || user.email?.split("@")[0] || "Trader";
    let role = meta.role || "user";

    const profileResult = await client
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.data) {
      name = profileResult.data.full_name || name;
      role = profileResult.data.role || role;
    }

    const values = {
      "#profile-name": name,
      "#profile-phone": meta.phone || "",
      "#profile-first-name": meta.first_name || "",
      "#profile-last-name": meta.last_name || "",
      "#profile-email": user.email || "",
      "#profile-role": role,
      "#profile-bio": meta.bio || "",
      "#profile-address": meta.address || "",
      "#profile-city": meta.city || "",
      "#profile-country": meta.country || "",
    };

    Object.entries(values).forEach(([selector, value]) => setValue(selector, value));
    setText("#profile-hero-name", name);
    setText("#profile-hero-email", user.email || "-");
    setText("#profile-role-label", String(role || "user").toUpperCase());
    setText("#user-role", role);
    setText("#user-display-name", name);
    setText("#user-display-meta", role);
    paintAvatar("#profile-avatar-preview", name, meta.avatar_url || "");
    paintAvatar("#user-avatar", name, meta.avatar_url || "");
  } catch (error) {
    console.warn("Account center load skipped:", error.message);
  }
}

async function saveProfile(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const message = $a("#profile-message");
  const errorBox = $a("#profile-error");
  const button = event.currentTarget.querySelector("button[type='submit']");
  const buttonText = button?.querySelector("span");
  const name = getValue("#profile-name");

  if (message) message.textContent = "";
  if (errorBox) errorBox.textContent = "";

  if (!name) {
    if (errorBox) errorBox.textContent = "Nama tampilan wajib diisi.";
    return;
  }

  if (button) button.disabled = true;
  if (buttonText) buttonText.textContent = "Menyimpan...";

  try {
    const client = await sb();
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

    client
      .from("profiles")
      .update({ full_name: name })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) console.warn("profiles update skipped by policy:", error.message);
      });

    if (message) message.textContent = "Profil berhasil disimpan.";
    await loadProfile();
  } catch (error) {
    if (errorBox) errorBox.textContent = error.message || "Gagal menyimpan profil.";
  } finally {
    if (button) button.disabled = false;
    if (buttonText) buttonText.textContent = "Simpan Profil";
  }
}

function bindProfileForm() {
  const form = $a("#account-profile-form");
  if (!form || form.dataset.bound === "1") return;
  form.dataset.bound = "1";
  form.addEventListener("submit", saveProfile, true);
}

function inject() {
  const section = $a("#profile-section");
  if (!section) return;

  if (!$a("#account-profile-form", section)) {
    section.dataset.acct = "profile-card-v2";
    section.innerHTML = html();
  }

  bindProfileForm();
  window.lucide?.createIcons();
  loadProfile();
}

function boot() {
  css();
  inject();
  setTimeout(inject, 500);
  setTimeout(inject, 1200);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

window.addEventListener("focus", loadProfile);
setInterval(() => {
  if ($a("#profile-section") && !$a("#account-profile-form")) inject();
}, 1500);
