import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://nsnjgfcuuesqibmpbiuv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJuc25qZ2ZjdXVlc3FpYm1wYml1diIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzMTM3MDExLCJleHAiOjIwOTg3MTMwMTF9.FdsZBJUeSh1b5BmxrxXdkkQbVfKevRToO90YFl7PsnY";
const AVATAR_BUCKET = "avatars";

let supabase;

const state = {
  session: null,
  profile: null,
  trades: [],
  biases: [],
  passwordRecoveryReady: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {};

const tradeFields = {};
const biasFields = {};
const profileFields = {};

function refreshElements() {
  Object.assign(elements, {
    authView: $("#auth-view"),
    dashboardView: $("#dashboard-view"),
    loginForm: $("#login-form"),
    loginError: $("#login-error"),
    loginButton: $("#login-button"),
    email: $("#email"),
    password: $("#password"),
    togglePassword: $("#toggle-password"),
    forgotPassword: $("#forgot-password"),
    logoutButton: $("#logout-button"),
    userRole: $("#user-role"),
    welcomeTitle: $("#welcome-title"),
    navToggle: $("#nav-dropdown-toggle"),
    navMenu: $("#nav-dropdown-menu"),
    activeNavLabel: $("#active-nav-label"),
    activeNavIcon: $("#active-nav-icon"),
    userDisplayName: $("#user-display-name"),
    userDisplayMeta: $("#user-display-meta"),
    userAvatar: $("#user-avatar"),
    refreshAnalytics: $("#refresh-analytics"),
    analyticsPairFilter: $("#analytics-pair-filter"),
    analyticsSetupFilter: $("#analytics-setup-filter"),
    analyticsResultFilter: $("#analytics-result-filter"),
    statTotalTrades: $("#stat-total-trades"),
    statClosedTrades: $("#stat-closed-trades"),
    statWinRate: $("#stat-win-rate"),
    statWinLoss: $("#stat-win-loss"),
    statNetR: $("#stat-net-r"),
    statAvgR: $("#stat-avg-r"),
    statProfitFactor: $("#stat-profit-factor"),
    statBestWorst: $("#stat-best-worst"),
    equityChart: $("#equity-chart"),
    monthlyChart: $("#monthly-chart"),
    pairBreakdown: $("#pair-breakdown"),
    quickInsights: $("#quick-insights"),
    tradeForm: $("#trade-form"),
    tradeError: $("#trade-error"),
    tradeList: $("#trade-list"),
    refreshTrades: $("#refresh-trades"),
    cancelEditTrade: $("#cancel-edit-trade"),
    tradeFormTitle: $("#trade-form-title"),
    biasForm: $("#bias-form"),
    biasError: $("#bias-error"),
    biasList: $("#bias-list"),
    refreshBiases: $("#refresh-biases"),
    cancelEditBias: $("#cancel-edit-bias"),
    biasFormTitle: $("#bias-form-title"),
    profileForm: $("#profile-form"),
    profileMessage: $("#profile-message"),
    profileError: $("#profile-error"),
    profileAvatarInput: $("#profile-avatar-input"),
    profileAvatarPreview: $("#profile-avatar-preview"),
    profileHeroName: $("#profile-hero-name"),
    profileHeroEmail: $("#profile-hero-email"),
    requestPasswordReset: $("#request-password-reset"),
    passwordForm: $("#password-form"),
    passwordMessage: $("#password-message"),
    passwordError: $("#password-error"),
  });

  Object.assign(tradeFields, {
    id: $("#trade-id"),
    date: $("#trade-date"),
    pair: $("#trade-pair"),
    setup: $("#trade-setup"),
    direction: $("#trade-direction"),
    entry: $("#trade-entry"),
    stop: $("#trade-stop"),
    target: $("#trade-target"),
    risk: $("#trade-risk"),
    result: $("#trade-result"),
    notes: $("#trade-notes"),
  });

  Object.assign(biasFields, {
    id: $("#bias-id"),
    title: $("#bias-title"),
    market: $("#bias-market"),
    direction: $("#bias-direction"),
    content: $("#bias-content"),
  });

  Object.assign(profileFields, {
    name: $("#profile-name"),
    email: $("#profile-email"),
    role: $("#profile-role"),
    newPassword: $("#new-password"),
    confirmPassword: $("#confirm-password"),
  });
}

function injectProfileUpgrade() {
  const contentArea = $(".content-area");
  const sidebarNav = $(".side-nav");
  const topbarUser = $(".user-chip");

  if (sidebarNav && !$("#nav-dropdown-toggle")) {
    sidebarNav.classList.add("compact-nav");
    sidebarNav.innerHTML = `
      <button id="nav-dropdown-toggle" class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-controls="nav-dropdown-menu">
        <span class="nav-current-icon"><i id="active-nav-icon" data-lucide="chart-no-axes-combined"></i></span>
        <span class="nav-current-copy">
          <small>Workspace</small>
          <strong id="active-nav-label">Performance</strong>
        </span>
        <i data-lucide="chevrons-up-down" class="nav-chevron"></i>
      </button>
      <div id="nav-dropdown-menu" class="nav-dropdown-menu">
        <button class="nav-item active" type="button" data-section="performance-section" data-label="Performance" data-icon="chart-no-axes-combined">
          <i data-lucide="chart-no-axes-combined"></i>
          <span>Performance</span>
        </button>
        <button class="nav-item" type="button" data-section="journal-section" data-label="Jurnal Trade" data-icon="notebook-pen">
          <i data-lucide="notebook-pen"></i>
          <span>Jurnal Trade</span>
        </button>
        <button class="nav-item" type="button" data-section="bias-section" data-label="Daily Bias" data-icon="radar">
          <i data-lucide="radar"></i>
          <span>Daily Bias</span>
        </button>
        <button class="nav-item" type="button" data-section="profile-section" data-label="Profile" data-icon="user-cog">
          <i data-lucide="user-cog"></i>
          <span>Profile</span>
        </button>
      </div>
    `;
  }

  if (topbarUser && !$("#user-display-name")) {
    topbarUser.classList.add("profile-shortcut");
    topbarUser.setAttribute("role", "button");
    topbarUser.setAttribute("tabindex", "0");
    topbarUser.setAttribute("data-section-shortcut", "profile-section");
    topbarUser.setAttribute("aria-label", "Buka profile");
    topbarUser.innerHTML = `
      <span id="user-avatar" class="avatar-chip">FC</span>
      <span class="user-chip-copy">
        <strong id="user-display-name">Trader</strong>
        <small id="user-display-meta">member</small>
      </span>
    `;
  }

  if (contentArea && !$("#profile-section")) {
    contentArea.insertAdjacentHTML(
      "beforeend",
      `
      <section id="profile-section" class="workspace-section hidden">
        <div class="profile-grid">
          <article class="profile-card identity-card">
            <div class="profile-hero">
              <label class="avatar-uploader" for="profile-avatar-input" aria-label="Upload foto profile">
                <span id="profile-avatar-preview" class="profile-avatar-preview">FC</span>
                <span class="avatar-overlay"><i data-lucide="camera"></i></span>
              </label>
              <input id="profile-avatar-input" type="file" accept="image/png,image/jpeg,image/webp" hidden />
              <div>
                <p class="eyebrow small-eyebrow">Account Center</p>
                <h3 id="profile-hero-name">Profile Trader</h3>
                <p id="profile-hero-email">-</p>
              </div>
            </div>
            <div class="profile-note">
              <i data-lucide="shield-check"></i>
              <span>Email login dikunci dan tidak bisa diganti dari aplikasi ini.</span>
            </div>
          </article>

          <form id="profile-form" class="editor-panel profile-form" novalidate>
            <div class="section-heading">
              <h3>Informasi Profile</h3>
              <span class="mini-label">Nama tampil</span>
            </div>

            <label>
              <span>Nama</span>
              <input id="profile-name" type="text" placeholder="Nama trader" required maxlength="80" />
            </label>

            <div class="grid-2">
              <label>
                <span>Email Login</span>
                <input id="profile-email" type="email" readonly />
              </label>
              <label>
                <span>Role</span>
                <input id="profile-role" type="text" readonly />
              </label>
            </div>

            <p id="profile-message" class="form-message" role="status"></p>
            <p id="profile-error" class="form-error" role="alert"></p>

            <button id="save-profile-button" class="primary-button" type="submit">
              <i data-lucide="save"></i>
              <span>Simpan Profile</span>
            </button>
          </form>

          <article class="editor-panel password-panel">
            <div class="section-heading">
              <h3>Ubah Password</h3>
              <span class="mini-label">Verifikasi email</span>
            </div>

            <p class="panel-copy">
              Untuk keamanan, ubah password dilakukan lewat email aktif yang tertera di akun ini.
              Klik tombol kirim verifikasi, lalu buka link/kode dari email Supabase.
            </p>

            <button id="request-password-reset" class="ghost-button" type="button">
              <i data-lucide="mail-check"></i>
              <span>Kirim Verifikasi ke Email</span>
            </button>

            <form id="password-form" class="password-form" novalidate>
              <label>
                <span>Password Baru</span>
                <input id="new-password" type="password" autocomplete="new-password" placeholder="Minimal 6 karakter" minlength="6" />
              </label>
              <label>
                <span>Konfirmasi Password Baru</span>
                <input id="confirm-password" type="password" autocomplete="new-password" placeholder="Ulangi password baru" minlength="6" />
              </label>

              <p id="password-message" class="form-message" role="status"></p>
              <p id="password-error" class="form-error" role="alert"></p>

              <button id="save-password-button" class="primary-button" type="submit">
                <i data-lucide="key-round"></i>
                <span>Simpan Password Baru</span>
              </button>
            </form>
          </article>
        </div>
      </section>
      `
    );
  }

  if (!$("#profile-upgrade-style")) {
    const style = document.createElement("style");
    style.id = "profile-upgrade-style";
    style.textContent = `
      .compact-nav {
        position: relative;
        display: grid;
        gap: 10px;
      }

      .nav-dropdown-toggle {
        width: 100%;
        min-height: 64px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 12px;
        padding: 11px 12px;
        border: 1px solid var(--line-strong);
        border-radius: 14px;
        color: var(--text);
        background: linear-gradient(135deg, rgba(117, 92, 246, 0.18), rgba(37, 212, 206, 0.1));
        box-shadow: 0 16px 42px rgba(0, 0, 0, 0.24);
        text-align: left;
      }

      .nav-current-icon,
      .avatar-chip,
      .profile-avatar-preview {
        display: grid;
        place-items: center;
        background-size: cover;
        background-position: center;
        color: #07101a;
        background-color: var(--cyan);
        background-image: linear-gradient(135deg, var(--purple), var(--cyan));
        font-weight: 900;
      }

      .nav-current-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
      }

      .nav-current-copy {
        display: grid;
        gap: 3px;
      }

      .nav-current-copy small,
      .user-chip-copy small,
      .mini-label {
        color: var(--muted);
        font-family: "JetBrains Mono", monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .nav-current-copy strong {
        color: var(--text);
        font-size: 0.95rem;
      }

      .nav-chevron {
        color: var(--muted);
      }

      .nav-dropdown-menu {
        display: none;
        padding: 8px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(10, 14, 28, 0.96);
        box-shadow: var(--shadow);
      }

      .compact-nav.open .nav-dropdown-menu {
        display: grid;
        gap: 6px;
      }

      .compact-nav .nav-item {
        min-height: 42px;
        border-radius: 10px;
      }

      .profile-shortcut {
        cursor: pointer;
        border: 1px solid var(--line);
      }

      .profile-shortcut:hover {
        border-color: var(--cyan);
        background: rgba(37, 212, 206, 0.08);
      }

      .avatar-chip {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        flex: 0 0 auto;
        font-size: 0.78rem;
      }

      .user-chip-copy {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .user-chip-copy strong,
      .user-chip-copy small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .profile-grid {
        display: grid;
        grid-template-columns: minmax(280px, 0.85fr) minmax(340px, 1.15fr);
        gap: 22px;
        align-items: start;
      }

      .profile-card,
      .password-panel {
        padding: 20px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(16, 22, 42, 0.72);
        box-shadow: var(--shadow);
      }

      .identity-card {
        min-height: 260px;
      }

      .profile-hero {
        display: flex;
        align-items: center;
        gap: 18px;
      }

      .avatar-uploader {
        position: relative;
        width: 96px;
        height: 96px;
        cursor: pointer;
      }

      .profile-avatar-preview {
        width: 96px;
        height: 96px;
        border-radius: 24px;
        font-size: 1.3rem;
        box-shadow: 0 20px 40px rgba(37, 212, 206, 0.18);
      }

      .avatar-overlay {
        position: absolute;
        right: -6px;
        bottom: -6px;
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border: 1px solid var(--line-strong);
        border-radius: 11px;
        color: var(--text);
        background: #10162a;
      }

      .profile-hero h3 {
        margin-bottom: 6px;
        font-size: 1.2rem;
      }

      .profile-hero p:last-child,
      .panel-copy {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .profile-note {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-top: 26px;
        padding: 14px;
        border: 1px solid rgba(37, 212, 206, 0.18);
        border-radius: 12px;
        color: var(--muted);
        background: rgba(37, 212, 206, 0.07);
        line-height: 1.55;
      }

      .profile-form,
      .password-form {
        display: grid;
        gap: 16px;
      }

      .password-panel {
        grid-column: 2;
        display: grid;
        gap: 16px;
      }

      .form-message {
        min-height: 20px;
        margin: 0;
        color: var(--cyan);
        font-size: 0.84rem;
        font-weight: 700;
      }

      input[readonly] {
        color: var(--muted);
        cursor: not-allowed;
        background: rgba(255, 255, 255, 0.035);
      }

      @media (max-width: 980px) {
        .profile-grid,
        .password-panel {
          grid-template-columns: 1fr;
          grid-column: auto;
        }
      }

      @media (max-width: 640px) {
        .profile-hero,
        .profile-grid {
          grid-template-columns: 1fr;
        }

        .profile-hero {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function isSupabaseConfigured() {
  return !SUPABASE_URL.startsWith("GANTI_") && !SUPABASE_ANON_KEY.startsWith("GANTI_");
}

function setText(element, text = "") {
  if (element) element.textContent = text;
}

function setError(element, message = "") {
  setText(element, message);
}

function setMessage(element, message = "") {
  setText(element, message);
}

function setBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  const text = button.querySelector("span");
  if (text && label) text.textContent = label;
}

function canManageBias() {
  return ["admin", "mentor"].includes(state.profile?.role);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
}

function formatMonth(value) {
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit" }).format(new Date(`${value}-01T00:00:00`));
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value);
}

function escapeText(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function isClosedTrade(trade) {
  return trade.result_r !== null && trade.result_r !== undefined && !Number.isNaN(Number(trade.result_r));
}

function getTradeResult(trade) {
  return Number(trade.result_r);
}

function formatR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  const number = Number(value);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(2).replace(/\.00$/, "")}R`;
}

function formatPercent(value) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return "0%";
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function getDisplayName() {
  const metadata = state.session?.user?.user_metadata ?? {};
  return (
    state.profile?.full_name?.trim() ||
    metadata.full_name?.trim() ||
    state.session?.user?.email?.split("@")[0] ||
    "Trader"
  );
}

function getAvatarUrl() {
  const metadata = state.session?.user?.user_metadata ?? {};
  return metadata.avatar_url || state.profile?.avatar_url || "";
}

function getInitials(name) {
  const words = String(name || "FC").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "FC";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function paintAvatar(element, name, avatarUrl) {
  if (!element) return;
  element.textContent = avatarUrl ? "" : getInitials(name);
  element.style.backgroundImage = avatarUrl ? `url("${avatarUrl}")` : "linear-gradient(135deg, var(--purple), var(--cyan))";
}

function syncProfileUI() {
  const name = getDisplayName();
  const email = state.session?.user?.email ?? "-";
  const role = state.profile?.role ?? "member";
  const avatarUrl = getAvatarUrl();

  setText(elements.userRole, role);
  setText(elements.userDisplayName, name);
  setText(elements.userDisplayMeta, role);
  setText(elements.profileHeroName, name);
  setText(elements.profileHeroEmail, email);

  if (profileFields.name) profileFields.name.value = name === "Trader" ? "" : name;
  if (profileFields.email) profileFields.email.value = email;
  if (profileFields.role) profileFields.role.value = role;

  paintAvatar(elements.userAvatar, name, avatarUrl);
  paintAvatar(elements.profileAvatarPreview, name, avatarUrl);
}

async function bootstrap() {
  injectProfileUpgrade();
  refreshElements();

  if (!isSupabaseConfigured()) {
    setError(elements.loginError, "Isi SUPABASE_URL dan SUPABASE_ANON_KEY di app.js dulu.");
    if (elements.loginButton) elements.loginButton.disabled = true;
    return;
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  bindEvents();
  resetTradeForm();

  supabase.auth.onAuthStateChange(async (event, session) => {
    state.session = session;
    if (event === "PASSWORD_RECOVERY") {
      state.passwordRecoveryReady = true;
      setMessage(elements.passwordMessage, "Verifikasi email berhasil. Silakan isi password baru.");
      setError(elements.passwordError);
    }

    if (session) {
      await showDashboard();
    } else {
      showAuth();
    }
  });

  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  if (state.session) {
    await showDashboard();
  } else {
    showAuth();
  }

  if (window.lucide) window.lucide.createIcons();
}

function showAuth() {
  state.profile = null;
  elements.authView?.classList.remove("hidden");
  elements.dashboardView?.classList.add("hidden");
  if (elements.loginButton) elements.loginButton.disabled = false;
}

async function showDashboard() {
  elements.authView?.classList.add("hidden");
  elements.dashboardView?.classList.remove("hidden");
  await loadProfile();
  syncProfileUI();
  elements.biasForm?.classList.toggle("hidden", !canManageBias());
  await Promise.all([loadTrades(), loadBiases()]);
  if (window.lucide) window.lucide.createIcons();
}

async function loadProfile() {
  const metadata = state.session?.user?.user_metadata ?? {};

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", state.session.user.id)
    .maybeSingle();

  if (error) {
    state.profile = {
      id: state.session.user.id,
      full_name: metadata.full_name || "",
      role: metadata.role || "member",
    };
    return;
  }

  state.profile = {
    id: state.session.user.id,
    full_name: data?.full_name || metadata.full_name || "",
    role: data?.role || metadata.role || "member",
  };
}

async function handleLogin(event) {
  event.preventDefault();
  setError(elements.loginError);

  const email = elements.email.value.trim();
  const password = elements.password.value;

  if (!email || !password) {
    setError(elements.loginError, "Email dan password wajib diisi.");
    return;
  }

  if (!elements.email.validity.valid) {
    setError(elements.loginError, "Format email belum benar.");
    return;
  }

  if (password.length < 6) {
    setError(elements.loginError, "Password minimal 6 karakter.");
    return;
  }

  setBusy(elements.loginButton, true, "Memproses...");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setError(elements.loginError, "Email atau password salah.");
    setBusy(elements.loginButton, false, "Masuk");
    return;
  }

  setBusy(elements.loginButton, false, "Masuk");
}

async function loadTrades() {
  const { data, error } = await supabase
    .from("trade_journals")
    .select("*")
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (elements.tradeList) elements.tradeList.innerHTML = `<div class="empty-state">Gagal memuat jurnal: ${escapeText(error.message)}</div>`;
    renderAnalytics();
    return;
  }

  state.trades = data ?? [];
  renderTrades();
  renderAnalytics();
}

function renderTrades() {
  if (!elements.tradeList) return;

  if (!state.trades.length) {
    elements.tradeList.innerHTML = '<div class="empty-state">Belum ada jurnal trade.</div>';
    return;
  }

  elements.tradeList.innerHTML = state.trades
    .map((trade) => {
      const isClosed = isClosedTrade(trade);
      const result = isClosed ? getTradeResult(trade) : null;
      const resultClass = !isClosed ? "neutral" : result >= 0 ? "result-positive" : "result-negative";
      const resultLabel = !isClosed ? "Belum close" : formatR(result);

      return `
        <article class="data-card">
          <div class="card-topline">
            <div class="card-title">
              <strong>${escapeText(trade.pair)} - ${escapeText(trade.setup)}</strong>
              <span>${formatDate(trade.trade_date)}</span>
            </div>
            <div class="card-actions">
              <button class="icon-button" type="button" data-edit-trade="${trade.id}" aria-label="Edit jurnal">
                <i data-lucide="pencil"></i>
              </button>
              <button class="icon-button" type="button" data-delete-trade="${trade.id}" aria-label="Hapus jurnal">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
          <div class="badge-row">
            <span class="badge ${trade.direction}">${escapeText(trade.direction)}</span>
            <span class="badge ${resultClass}">${escapeText(resultLabel)}</span>
            <span class="badge">Risk ${trade.risk_percent ?? 0}%</span>
          </div>
          <div class="meta-row">
            <span>Entry: ${trade.entry_price ?? "-"}</span>
            <span>SL: ${trade.stop_loss ?? "-"}</span>
            <span>TP: ${trade.take_profit ?? "-"}</span>
          </div>
          ${trade.notes ? `<p class="card-body">${escapeText(trade.notes)}</p>` : ""}
        </article>
      `;
    })
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

function fillFilterOptions(select, values, defaultLabel) {
  if (!select) return;
  const currentValue = select.value || "all";
  const uniqueValues = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  select.innerHTML = `
    <option value="all">${defaultLabel}</option>
    ${uniqueValues.map((value) => `<option value="${escapeText(value)}">${escapeText(value)}</option>`).join("")}
  `;
  select.value = uniqueValues.includes(currentValue) ? currentValue : "all";
}

function getFilteredTrades() {
  const pair = elements.analyticsPairFilter?.value ?? "all";
  const setup = elements.analyticsSetupFilter?.value ?? "all";
  const result = elements.analyticsResultFilter?.value ?? "all";

  return state.trades.filter((trade) => {
    const resultValue = isClosedTrade(trade) ? getTradeResult(trade) : null;
    const pairMatch = pair === "all" || trade.pair === pair;
    const setupMatch = setup === "all" || trade.setup === setup;
    const resultMatch =
      result === "all" ||
      (result === "open" && resultValue === null) ||
      (result === "win" && resultValue > 0) ||
      (result === "loss" && resultValue < 0) ||
      (result === "breakeven" && resultValue === 0);

    return pairMatch && setupMatch && resultMatch;
  });
}

function calculateStats(trades) {
  const closedTrades = trades.filter(isClosedTrade);
  const results = closedTrades.map(getTradeResult);
  const wins = results.filter((value) => value > 0);
  const losses = results.filter((value) => value < 0);
  const breakeven = results.filter((value) => value === 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const netR = results.reduce((sum, value) => sum + value, 0);
  const avgR = closedTrades.length ? netR / closedTrades.length : 0;

  return {
    total: trades.length,
    closed: closedTrades.length,
    open: trades.length - closedTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate: closedTrades.length ? (wins.length / closedTrades.length) * 100 : 0,
    netR,
    avgR,
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss,
    best: results.length ? Math.max(...results) : 0,
    worst: results.length ? Math.min(...results) : 0,
  };
}

function renderAnalytics() {
  fillFilterOptions(elements.analyticsPairFilter, state.trades.map((trade) => trade.pair), "Semua pair");
  fillFilterOptions(elements.analyticsSetupFilter, state.trades.map((trade) => trade.setup), "Semua setup");

  const trades = getFilteredTrades();
  const stats = calculateStats(trades);

  setText(elements.statTotalTrades, stats.total);
  setText(elements.statClosedTrades, `${stats.closed} closed · ${stats.open} open`);
  setText(elements.statWinRate, formatPercent(stats.winRate));
  setText(elements.statWinLoss, `${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`);
  setText(elements.statNetR, formatR(stats.netR));
  setText(elements.statAvgR, `Avg ${formatR(stats.avgR)}/trade`);
  setText(elements.statProfitFactor, stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2));
  setText(elements.statBestWorst, `Best ${formatR(stats.best)} · Worst ${formatR(stats.worst)}`);

  renderEquityCurve(trades);
  renderMonthlyChart(trades);
  renderPairBreakdown(trades);
  renderQuickInsights(trades, stats);
}

function renderEquityCurve(trades) {
  if (!elements.equityChart) return;
  const closed = [...trades]
    .filter(isClosedTrade)
    .sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date) || new Date(a.created_at) - new Date(b.created_at));

  if (!closed.length) {
    elements.equityChart.innerHTML = '<div class="empty-state">Belum ada closed trade untuk equity curve.</div>';
    return;
  }

  let cumulative = 0;
  const points = closed.map((trade) => {
    cumulative += getTradeResult(trade);
    return cumulative;
  });

  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const width = 720;
  const height = 260;
  const padding = 26;

  const coordinates = points.map((value, index) => {
    const x = points.length === 1 ? width / 2 : padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  elements.equityChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="equity-svg">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      <polyline points="${coordinates.join(" ")}" />
      ${coordinates.map((point) => {
        const [x, y] = point.split(",");
        return `<circle cx="${x}" cy="${y}" r="4" />`;
      }).join("")}
    </svg>
  `;
}

function renderMonthlyChart(trades) {
  if (!elements.monthlyChart) return;
  const monthly = new Map();

  trades.filter(isClosedTrade).forEach((trade) => {
    const key = String(trade.trade_date).slice(0, 7);
    monthly.set(key, (monthly.get(key) ?? 0) + getTradeResult(trade));
  });

  const rows = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  if (!rows.length) {
    elements.monthlyChart.innerHTML = '<div class="empty-state">Belum ada data bulanan.</div>';
    return;
  }

  const maxAbs = Math.max(...rows.map(([, value]) => Math.abs(value)), 1);
  elements.monthlyChart.innerHTML = rows
    .map(([month, value]) => {
      const height = Math.max(12, Math.abs(value / maxAbs) * 100);
      const type = value >= 0 ? "positive" : "negative";
      return `
        <div class="bar-item">
          <span class="bar-value ${type}">${formatR(value)}</span>
          <div class="bar-track"><span class="bar-fill ${type}" style="height:${height}%"></span></div>
          <small>${formatMonth(month)}</small>
        </div>
      `;
    })
    .join("");
}

function renderPairBreakdown(trades) {
  if (!elements.pairBreakdown) return;
  const grouped = new Map();

  trades.filter(isClosedTrade).forEach((trade) => {
    const key = trade.pair || "Unknown";
    const current = grouped.get(key) ?? { total: 0, count: 0, wins: 0 };
    const result = getTradeResult(trade);
    current.total += result;
    current.count += 1;
    if (result > 0) current.wins += 1;
    grouped.set(key, current);
  });

  const rows = [...grouped.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6);
  if (!rows.length) {
    elements.pairBreakdown.innerHTML = '<div class="empty-state">Belum ada breakdown pair.</div>';
    return;
  }

  elements.pairBreakdown.innerHTML = rows
    .map(([pair, item]) => `
      <div class="breakdown-item">
        <div>
          <strong>${escapeText(pair)}</strong>
          <span>${item.count} trade · ${formatPercent((item.wins / item.count) * 100)} WR</span>
        </div>
        <b class="${item.total >= 0 ? "result-positive" : "result-negative"}">${formatR(item.total)}</b>
      </div>
    `)
    .join("");
}

function renderQuickInsights(trades, stats) {
  if (!elements.quickInsights) return;
  const closed = trades.filter(isClosedTrade);
  const insights = [];

  if (!closed.length) {
    elements.quickInsights.innerHTML = '<div class="empty-state">Isi hasil R dulu biar insight muncul.</div>';
    return;
  }

  insights.push(stats.netR >= 0 ? "Sistem lagi positif. Jaga sizing dan jangan overtrade." : "Net R masih negatif. Review setup yang paling sering loss.");
  insights.push(stats.winRate >= 50 ? "Win rate cukup sehat. Fokus pertahankan kualitas entry." : "Win rate di bawah 50%. Pastikan RR tetap cukup besar." );
  insights.push(stats.avgR > 0 ? `Rata-rata trade ${formatR(stats.avgR)}. Ini tanda edge mulai kebaca.` : `Average R ${formatR(stats.avgR)}. Kurangi entry impulsif.`);

  elements.quickInsights.innerHTML = insights
    .map((text) => `<div class="insight-item"><i data-lucide="sparkles"></i><span>${escapeText(text)}</span></div>`)
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

async function saveTrade(event) {
  event.preventDefault();
  setError(elements.tradeError);
  if (!elements.tradeForm.reportValidity()) return;

  const payload = {
    user_id: state.session.user.id,
    trade_date: tradeFields.date.value,
    pair: tradeFields.pair.value.trim().toUpperCase(),
    setup: tradeFields.setup.value.trim(),
    direction: tradeFields.direction.value,
    entry_price: normalizeNumber(tradeFields.entry.value),
    stop_loss: normalizeNumber(tradeFields.stop.value),
    take_profit: normalizeNumber(tradeFields.target.value),
    risk_percent: normalizeNumber(tradeFields.risk.value),
    result_r: normalizeNumber(tradeFields.result.value),
    notes: tradeFields.notes.value.trim() || null,
  };

  const query = tradeFields.id.value
    ? supabase.from("trade_journals").update(payload).eq("id", tradeFields.id.value)
    : supabase.from("trade_journals").insert(payload);

  const { error } = await query;
  if (error) {
    setError(elements.tradeError, error.message);
    return;
  }

  resetTradeForm();
  await loadTrades();
  switchSection("performance-section");
}

function editTrade(id) {
  const trade = state.trades.find((item) => String(item.id) === String(id));
  if (!trade) return;

  tradeFields.id.value = trade.id;
  tradeFields.date.value = trade.trade_date;
  tradeFields.pair.value = trade.pair;
  tradeFields.setup.value = trade.setup;
  tradeFields.direction.value = trade.direction;
  tradeFields.entry.value = trade.entry_price ?? "";
  tradeFields.stop.value = trade.stop_loss ?? "";
  tradeFields.target.value = trade.take_profit ?? "";
  tradeFields.risk.value = trade.risk_percent ?? "";
  tradeFields.result.value = trade.result_r ?? "";
  tradeFields.notes.value = trade.notes ?? "";
  setText(elements.tradeFormTitle, "Edit Jurnal");
  elements.cancelEditTrade?.classList.remove("hidden");
  switchSection("journal-section");
}

function resetTradeForm() {
  if (!elements.tradeForm) return;
  elements.tradeForm.reset();
  tradeFields.id.value = "";
  tradeFields.date.valueAsDate = new Date();
  setText(elements.tradeFormTitle, "Tambah Jurnal");
  elements.cancelEditTrade?.classList.add("hidden");
  setError(elements.tradeError);
}

async function deleteTrade(id) {
  const confirmed = window.confirm("Hapus jurnal trade ini?");
  if (!confirmed) return;

  const { error } = await supabase.from("trade_journals").delete().eq("id", id);
  if (error) {
    setError(elements.tradeError, error.message);
    return;
  }
  await loadTrades();
}

async function loadBiases() {
  const { data, error } = await supabase
    .from("daily_biases")
    .select("*, profiles(full_name, role)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (elements.biasList) elements.biasList.innerHTML = `<div class="empty-state">Gagal memuat daily bias: ${escapeText(error.message)}</div>`;
    return;
  }

  state.biases = data ?? [];
  renderBiases();
}

function renderBiases() {
  if (!elements.biasList) return;

  if (!state.biases.length) {
    elements.biasList.innerHTML = '<div class="empty-state">Belum ada daily bias.</div>';
    return;
  }

  elements.biasList.innerHTML = state.biases
    .map((bias) => {
      const author = bias.profiles?.full_name || bias.profiles?.role || "Team";
      const actions = canManageBias()
        ? `
          <div class="card-actions">
            <button class="icon-button" type="button" data-edit-bias="${bias.id}" aria-label="Edit daily bias">
              <i data-lucide="pencil"></i>
            </button>
            <button class="icon-button" type="button" data-delete-bias="${bias.id}" aria-label="Hapus daily bias">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `
        : "";

      return `
        <article class="data-card">
          <div class="card-topline">
            <div class="card-title">
              <strong>${escapeText(bias.title)}</strong>
              <span>${escapeText(bias.market)} - ${formatDate(bias.created_at)} - ${escapeText(author)}</span>
            </div>
            ${actions}
          </div>
          <div class="badge-row">
            <span class="badge ${bias.direction}">${escapeText(bias.direction)}</span>
          </div>
          <p class="card-body">${escapeText(bias.content)}</p>
        </article>
      `;
    })
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

async function saveBias(event) {
  event.preventDefault();
  setError(elements.biasError);

  if (!canManageBias()) {
    setError(elements.biasError, "Hanya admin dan mentor yang boleh upload daily bias.");
    return;
  }

  if (!elements.biasForm.reportValidity()) return;

  const payload = {
    author_id: state.session.user.id,
    title: biasFields.title.value.trim(),
    market: biasFields.market.value.trim().toUpperCase(),
    direction: biasFields.direction.value,
    content: biasFields.content.value.trim(),
  };

  const query = biasFields.id.value
    ? supabase.from("daily_biases").update(payload).eq("id", biasFields.id.value)
    : supabase.from("daily_biases").insert(payload);

  const { error } = await query;
  if (error) {
    setError(elements.biasError, error.message);
    return;
  }

  resetBiasForm();
  await loadBiases();
}

function editBias(id) {
  const bias = state.biases.find((item) => String(item.id) === String(id));
  if (!bias) return;

  biasFields.id.value = bias.id;
  biasFields.title.value = bias.title;
  biasFields.market.value = bias.market;
  biasFields.direction.value = bias.direction;
  biasFields.content.value = bias.content;
  setText(elements.biasFormTitle, "Edit Daily Bias");
  elements.cancelEditBias?.classList.remove("hidden");
  switchSection("bias-section");
}

function resetBiasForm() {
  if (!elements.biasForm) return;
  elements.biasForm.reset();
  biasFields.id.value = "";
  setText(elements.biasFormTitle, "Upload Daily Bias");
  elements.cancelEditBias?.classList.add("hidden");
  setError(elements.biasError);
}

async function deleteBias(id) {
  const confirmed = window.confirm("Hapus daily bias ini?");
  if (!confirmed) return;

  const { error } = await supabase.from("daily_biases").delete().eq("id", id);
  if (error) {
    setError(elements.biasError, error.message);
    return;
  }
  await loadBiases();
}

async function saveProfile(event) {
  event.preventDefault();
  setMessage(elements.profileMessage);
  setError(elements.profileError);

  const fullName = profileFields.name.value.trim();
  if (!fullName) {
    setError(elements.profileError, "Nama wajib diisi.");
    return;
  }

  setBusy(elements.profileForm.querySelector("button[type='submit']"), true, "Menyimpan...");

  const profileUpdate = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", state.session.user.id);

  const authUpdate = await supabase.auth.updateUser({ data: { full_name: fullName } });

  if (profileUpdate.error && authUpdate.error) {
    setError(elements.profileError, profileUpdate.error.message || authUpdate.error.message);
    setBusy(elements.profileForm.querySelector("button[type='submit']"), false, "Simpan Profile");
    return;
  }

  if (authUpdate.data?.user) state.session.user = authUpdate.data.user;
  await loadProfile();
  syncProfileUI();

  setMessage(elements.profileMessage, profileUpdate.error ? "Nama tersimpan di metadata akun. Update tabel profiles ditolak policy." : "Profile berhasil disimpan.");
  setBusy(elements.profileForm.querySelector("button[type='submit']"), false, "Simpan Profile");
}

async function uploadAvatar(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  setMessage(elements.profileMessage);
  setError(elements.profileError);

  if (!file.type.startsWith("image/")) {
    setError(elements.profileError, "File harus berupa gambar.");
    return;
  }

  if (file.size > 3 * 1024 * 1024) {
    setError(elements.profileError, "Ukuran foto maksimal 3MB.");
    return;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${state.session.user.id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (uploadError) {
    setError(elements.profileError, `Gagal upload foto. Pastikan bucket '${AVATAR_BUCKET}' dan policy storage sudah aktif.`);
    return;
  }

  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = publicData.publicUrl;

  const { data, error } = await supabase.auth.updateUser({
    data: {
      avatar_url: avatarUrl,
      avatar_path: path,
    },
  });

  if (error) {
    setError(elements.profileError, error.message);
    return;
  }

  if (data?.user) state.session.user = data.user;
  syncProfileUI();
  setMessage(elements.profileMessage, "Foto profile berhasil diperbarui.");
}

async function requestPasswordReset() {
  setMessage(elements.passwordMessage);
  setError(elements.passwordError);

  const email = state.session?.user?.email;
  if (!email) {
    setError(elements.passwordError, "Email akun tidak ditemukan.");
    return;
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    setError(elements.passwordError, "Gagal kirim verifikasi password.");
    return;
  }

  setMessage(elements.passwordMessage, `Link verifikasi sudah dikirim ke ${email}. Buka email itu dulu sebelum menyimpan password baru.`);
}

async function savePassword(event) {
  event.preventDefault();
  setMessage(elements.passwordMessage);
  setError(elements.passwordError);

  if (!state.passwordRecoveryReady) {
    setError(elements.passwordError, "Buka link verifikasi dari email dulu sebelum menyimpan password baru.");
    return;
  }

  const newPassword = profileFields.newPassword.value;
  const confirmPassword = profileFields.confirmPassword.value;

  if (!newPassword || newPassword.length < 6) {
    setError(elements.passwordError, "Password baru minimal 6 karakter.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setError(elements.passwordError, "Konfirmasi password belum sama.");
    return;
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    setError(elements.passwordError, error.message);
    return;
  }

  state.passwordRecoveryReady = false;
  elements.passwordForm.reset();
  setMessage(elements.passwordMessage, "Password berhasil diperbarui.");
}

function switchSection(sectionId) {
  $$(".workspace-section").forEach((section) => section.classList.toggle("hidden", section.id !== sectionId));

  $$(".nav-item").forEach((item) => {
    const active = item.dataset.section === sectionId;
    item.classList.toggle("active", active);
    if (active) {
      const label = item.dataset.label || item.textContent.trim();
      const icon = item.dataset.icon || "circle";
      setText(elements.activeNavLabel, label);
      if (elements.activeNavIcon) elements.activeNavIcon.setAttribute("data-lucide", icon);
      setText(elements.welcomeTitle, label === "Profile" ? "Profile Center" : label === "Jurnal Trade" ? "Trade Journal" : label === "Daily Bias" ? "Daily Bias" : "Performance Dashboard");
    }
  });

  elements.navMenu?.closest(".compact-nav")?.classList.remove("open");
  elements.navToggle?.setAttribute("aria-expanded", "false");
  if (window.lucide) window.lucide.createIcons();
}

function bindEvents() {
  elements.loginForm?.addEventListener("submit", handleLogin);
  elements.logoutButton?.addEventListener("click", () => supabase.auth.signOut());
  elements.refreshTrades?.addEventListener("click", loadTrades);
  elements.refreshBiases?.addEventListener("click", loadBiases);
  elements.refreshAnalytics?.addEventListener("click", loadTrades);
  elements.tradeForm?.addEventListener("submit", saveTrade);
  elements.biasForm?.addEventListener("submit", saveBias);
  elements.profileForm?.addEventListener("submit", saveProfile);
  elements.passwordForm?.addEventListener("submit", savePassword);
  elements.requestPasswordReset?.addEventListener("click", requestPasswordReset);
  elements.profileAvatarInput?.addEventListener("change", uploadAvatar);
  elements.cancelEditTrade?.addEventListener("click", resetTradeForm);
  elements.cancelEditBias?.addEventListener("click", resetBiasForm);

  elements.togglePassword?.addEventListener("click", () => {
    const isPassword = elements.password.type === "password";
    elements.password.type = isPassword ? "text" : "password";
    elements.togglePassword.setAttribute("aria-label", isPassword ? "Sembunyikan password" : "Tampilkan password");
    elements.togglePassword.querySelector("span").textContent = isPassword ? "HIDE" : "SHOW";
  });

  elements.forgotPassword?.addEventListener("click", async () => {
    setError(elements.loginError);
    const email = elements.email.value.trim();
    if (!email || !elements.email.validity.valid) {
      setError(elements.loginError, "Isi email yang valid dulu untuk reset password.");
      return;
    }

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setError(elements.loginError, error ? "Gagal kirim link reset password." : "Link reset password sudah dikirim ke email.");
  });

  elements.navToggle?.addEventListener("click", () => {
    const wrapper = elements.navToggle.closest(".compact-nav");
    const open = !wrapper.classList.contains("open");
    wrapper.classList.toggle("open", open);
    elements.navToggle.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".compact-nav")) {
      elements.navMenu?.closest(".compact-nav")?.classList.remove("open");
      elements.navToggle?.setAttribute("aria-expanded", "false");
    }
  });

  $$(".nav-item").forEach((item) => {
    item.addEventListener("click", () => switchSection(item.dataset.section));
  });

  $$('[data-section-shortcut="profile-section"]').forEach((item) => {
    item.addEventListener("click", () => switchSection("profile-section"));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") switchSection("profile-section");
    });
  });

  elements.analyticsPairFilter?.addEventListener("change", renderAnalytics);
  elements.analyticsSetupFilter?.addEventListener("change", renderAnalytics);
  elements.analyticsResultFilter?.addEventListener("change", renderAnalytics);

  elements.tradeList?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-trade]");
    const deleteButton = event.target.closest("[data-delete-trade]");
    if (editButton) editTrade(editButton.dataset.editTrade);
    if (deleteButton) deleteTrade(deleteButton.dataset.deleteTrade);
  });

  elements.biasList?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-bias]");
    const deleteButton = event.target.closest("[data-delete-bias]");
    if (editButton) editBias(editButton.dataset.editBias);
    if (deleteButton) deleteBias(deleteButton.dataset.deleteBias);
  });
}

bootstrap();