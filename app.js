import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://nsnjgfcuuesqibmpbiuv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbmpnZmN1dWVzcWlibXBiaXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcwMTEsImV4cCI6MjA5ODcxMzAxMX0.FdsZBJUeSh1b5BmxrxXdkkQbVfKevRToO90YFl7PsnY";
const AVATAR_BUCKET = "avatars";

let supabase;
const state = { session: null, profile: null, trades: [], biases: [], passwordRecoveryReady: false };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {};
const trade = {};
const bias = {};
const profile = {};

function refreshElements() {
  Object.assign(els, {
    authView: $("#auth-view"), dashboardView: $("#dashboard-view"), loginForm: $("#login-form"), loginError: $("#login-error"), loginButton: $("#login-button"),
    email: $("#email"), password: $("#password"), togglePassword: $("#toggle-password"), forgotPassword: $("#forgot-password"), logoutButton: $("#logout-button"),
    userRole: $("#user-role"), welcomeTitle: $("#welcome-title"), navToggle: $("#nav-dropdown-toggle"), activeNavLabel: $("#active-nav-label"), activeNavIcon: $("#active-nav-icon"),
    userDisplayName: $("#user-display-name"), userDisplayMeta: $("#user-display-meta"), userAvatar: $("#user-avatar"),
    refreshAnalytics: $("#refresh-analytics"), analyticsPairFilter: $("#analytics-pair-filter"), analyticsSetupFilter: $("#analytics-setup-filter"), analyticsResultFilter: $("#analytics-result-filter"),
    statTotalTrades: $("#stat-total-trades"), statClosedTrades: $("#stat-closed-trades"), statWinRate: $("#stat-win-rate"), statWinLoss: $("#stat-win-loss"),
    statNetR: $("#stat-net-r"), statAvgR: $("#stat-avg-r"), statProfitFactor: $("#stat-profit-factor"), statBestWorst: $("#stat-best-worst"),
    equityChart: $("#equity-chart"), monthlyChart: $("#monthly-chart"), pairBreakdown: $("#pair-breakdown"), quickInsights: $("#quick-insights"),
    tradeForm: $("#trade-form"), tradeError: $("#trade-error"), tradeList: $("#trade-list"), refreshTrades: $("#refresh-trades"), cancelEditTrade: $("#cancel-edit-trade"), tradeFormTitle: $("#trade-form-title"),
    biasForm: $("#bias-form"), biasError: $("#bias-error"), biasList: $("#bias-list"), refreshBiases: $("#refresh-biases"), cancelEditBias: $("#cancel-edit-bias"), biasFormTitle: $("#bias-form-title"),
    profileForm: $("#profile-form"), profileMsg: $("#profile-message"), profileError: $("#profile-error"), avatarInput: $("#profile-avatar-input"), avatarPreview: $("#profile-avatar-preview"),
    profileHeroName: $("#profile-hero-name"), profileHeroEmail: $("#profile-hero-email"), requestPasswordReset: $("#request-password-reset"), passwordForm: $("#password-form"), passwordMsg: $("#password-message"), passwordError: $("#password-error"),
  });
  Object.assign(trade, { id: $("#trade-id"), date: $("#trade-date"), pair: $("#trade-pair"), setup: $("#trade-setup"), direction: $("#trade-direction"), entry: $("#trade-entry"), stop: $("#trade-stop"), target: $("#trade-target"), risk: $("#trade-risk"), result: $("#trade-result"), notes: $("#trade-notes") });
  Object.assign(bias, { id: $("#bias-id"), title: $("#bias-title"), market: $("#bias-market"), direction: $("#bias-direction"), content: $("#bias-content") });
  Object.assign(profile, { name: $("#profile-name"), email: $("#profile-email"), role: $("#profile-role"), newPassword: $("#new-password"), confirmPassword: $("#confirm-password") });
}

function injectUpgradeUI() {
  const nav = $(".side-nav");
  if (nav && !$("#nav-dropdown-toggle")) {
    nav.classList.add("compact-nav");
    nav.innerHTML = `
      <button id="nav-dropdown-toggle" class="nav-dropdown-toggle" type="button" aria-expanded="false">
        <span class="nav-current-icon"><i id="active-nav-icon" data-lucide="chart-no-axes-combined"></i></span>
        <span class="nav-current-copy"><small>Workspace</small><strong id="active-nav-label">Performance</strong></span>
        <i class="nav-chevron" data-lucide="chevrons-up-down"></i>
      </button>
      <div class="nav-dropdown-menu">
        ${navButton("performance-section", "Performance", "chart-no-axes-combined", true)}
        ${navButton("journal-section", "Jurnal Trade", "notebook-pen")}
        ${navButton("bias-section", "Daily Bias", "radar")}
        ${navButton("profile-section", "Profile", "user-cog")}
      </div>`;
  }

  const userChip = $(".user-chip");
  if (userChip && !$("#user-display-name")) {
    userChip.classList.add("profile-shortcut");
    userChip.setAttribute("role", "button");
    userChip.setAttribute("tabindex", "0");
    userChip.innerHTML = `<span id="user-avatar" class="avatar-chip">FC</span><span class="user-chip-copy"><strong id="user-display-name">Trader</strong><small id="user-display-meta">member</small></span>`;
  }

  const content = $(".content-area");
  if (content && !$("#profile-section")) {
    content.insertAdjacentHTML("beforeend", `
      <section id="profile-section" class="workspace-section hidden">
        <div class="profile-grid">
          <article class="profile-card identity-card">
            <div class="profile-hero">
              <label class="avatar-uploader" for="profile-avatar-input">
                <span id="profile-avatar-preview" class="profile-avatar-preview">FC</span>
                <span class="avatar-overlay"><i data-lucide="camera"></i></span>
              </label>
              <input id="profile-avatar-input" type="file" accept="image/png,image/jpeg,image/webp" hidden />
              <div><p class="eyebrow small-eyebrow">Account Center</p><h3 id="profile-hero-name">Profile Trader</h3><p id="profile-hero-email">-</p></div>
            </div>
            <div class="profile-note"><i data-lucide="shield-check"></i><span>Email login dikunci dan tidak bisa diganti dari aplikasi ini.</span></div>
          </article>

          <form id="profile-form" class="editor-panel profile-form" novalidate>
            <div class="section-heading"><h3>Informasi Profile</h3><span class="mini-label">Nama tampil</span></div>
            <label><span>Nama</span><input id="profile-name" type="text" placeholder="Nama trader" required maxlength="80" /></label>
            <div class="grid-2">
              <label><span>Email Login</span><input id="profile-email" type="email" readonly /></label>
              <label><span>Role</span><input id="profile-role" type="text" readonly /></label>
            </div>
            <p id="profile-message" class="form-message" role="status"></p><p id="profile-error" class="form-error" role="alert"></p>
            <button class="primary-button" type="submit"><i data-lucide="save"></i><span>Simpan Profile</span></button>
          </form>

          <article class="editor-panel password-panel">
            <div class="section-heading"><h3>Ubah Password</h3><span class="mini-label">Verifikasi email</span></div>
            <p class="panel-copy">Untuk keamanan, ubah password dilakukan lewat email aktif yang tertera. Klik kirim verifikasi, lalu buka link dari email Supabase.</p>
            <button id="request-password-reset" class="ghost-button" type="button"><i data-lucide="mail-check"></i><span>Kirim Verifikasi ke Email</span></button>
            <form id="password-form" class="password-form" novalidate>
              <label><span>Password Baru</span><input id="new-password" type="password" autocomplete="new-password" placeholder="Minimal 6 karakter" minlength="6" /></label>
              <label><span>Konfirmasi Password Baru</span><input id="confirm-password" type="password" autocomplete="new-password" placeholder="Ulangi password baru" minlength="6" /></label>
              <p id="password-message" class="form-message" role="status"></p><p id="password-error" class="form-error" role="alert"></p>
              <button class="primary-button" type="submit"><i data-lucide="key-round"></i><span>Simpan Password Baru</span></button>
            </form>
          </article>
        </div>
      </section>`);
  }

  if (!$("#profile-upgrade-style")) {
    const style = document.createElement("style");
    style.id = "profile-upgrade-style";
    style.textContent = upgradeCSS;
    document.head.appendChild(style);
  }
}

function navButton(section, label, icon, active = false) {
  return `<button class="nav-item ${active ? "active" : ""}" type="button" data-section="${section}" data-label="${label}" data-icon="${icon}"><i data-lucide="${icon}"></i><span>${label}</span></button>`;
}

const upgradeCSS = `
.compact-nav{position:relative;display:grid;gap:10px}.nav-dropdown-toggle{width:100%;min-height:64px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:11px 12px;border:1px solid var(--line-strong);border-radius:14px;color:var(--text);background:linear-gradient(135deg,rgba(117,92,246,.18),rgba(37,212,206,.1));box-shadow:0 16px 42px rgba(0,0,0,.24);text-align:left}.nav-current-icon,.avatar-chip,.profile-avatar-preview{display:grid;place-items:center;background-size:cover;background-position:center;color:#07101a;background-color:var(--cyan);background-image:linear-gradient(135deg,var(--purple),var(--cyan));font-weight:900}.nav-current-icon{width:38px;height:38px;border-radius:12px}.nav-current-copy{display:grid;gap:3px}.nav-current-copy small,.user-chip-copy small,.mini-label{color:var(--muted);font-family:"JetBrains Mono",monospace;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em}.nav-current-copy strong{color:var(--text);font-size:.95rem}.nav-chevron{color:var(--muted)}.nav-dropdown-menu{display:none;padding:8px;border:1px solid var(--line);border-radius:14px;background:rgba(10,14,28,.96);box-shadow:var(--shadow)}.compact-nav.open .nav-dropdown-menu{display:grid;gap:6px}.compact-nav .nav-item{min-height:42px;border-radius:10px}.profile-shortcut{cursor:pointer;border:1px solid var(--line)}.profile-shortcut:hover{border-color:var(--cyan);background:rgba(37,212,206,.08)}.avatar-chip{width:34px;height:34px;border-radius:10px;flex:0 0 auto;font-size:.78rem}.user-chip-copy{display:grid;gap:2px;min-width:0}.user-chip-copy strong,.user-chip-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.profile-grid{display:grid;grid-template-columns:minmax(280px,.85fr) minmax(340px,1.15fr);gap:22px;align-items:start}.profile-card,.password-panel{padding:20px;border:1px solid var(--line);border-radius:14px;background:rgba(16,22,42,.72);box-shadow:var(--shadow)}.identity-card{min-height:260px}.profile-hero{display:flex;align-items:center;gap:18px}.avatar-uploader{position:relative;width:96px;height:96px;cursor:pointer}.profile-avatar-preview{width:96px;height:96px;border-radius:24px;font-size:1.3rem;box-shadow:0 20px 40px rgba(37,212,206,.18)}.avatar-overlay{position:absolute;right:-6px;bottom:-6px;width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--line-strong);border-radius:11px;color:var(--text);background:#10162a}.profile-hero h3{margin-bottom:6px;font-size:1.2rem}.profile-hero p:last-child,.panel-copy{margin:0;color:var(--muted);line-height:1.6}.profile-note{display:flex;align-items:flex-start;gap:10px;margin-top:26px;padding:14px;border:1px solid rgba(37,212,206,.18);border-radius:12px;color:var(--muted);background:rgba(37,212,206,.07);line-height:1.55}.profile-form,.password-form{display:grid;gap:16px}.password-panel{grid-column:2;display:grid;gap:16px}.form-message{min-height:20px;margin:0;color:var(--cyan);font-size:.84rem;font-weight:700}input[readonly]{color:var(--muted);cursor:not-allowed;background:rgba(255,255,255,.035)}@media(max-width:980px){.profile-grid,.password-panel{grid-template-columns:1fr;grid-column:auto}}@media(max-width:640px){.profile-hero{align-items:flex-start;flex-direction:column}}
`;

const text = (el, value = "") => { if (el) el.textContent = value; };
const setErr = text;
const msg = text;
const busy = (button, on, label) => { if (!button) return; button.disabled = on; const span = button.querySelector("span"); if (span && label) span.textContent = label; };
const escapeHTML = (value) => { const div = document.createElement("div"); div.textContent = value ?? ""; return div.innerHTML; };
const num = (value) => value === "" || value == null ? null : Number(value);
const isClosed = (trade) => trade.result_r !== null && trade.result_r !== undefined && !Number.isNaN(Number(trade.result_r));
const result = (trade) => Number(trade.result_r);
const canBias = () => ["admin", "mentor"].includes(state.profile?.role);
const fmtDate = (value) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
const fmtMonth = (value) => new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit" }).format(new Date(`${value}-01T00:00:00`));
const fmtR = (value) => value == null || Number.isNaN(Number(value)) ? "-" : `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2).replace(/\.00$/, "")}R`;
const fmtPct = (value) => !Number.isFinite(value) ? "0%" : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;

function displayName() {
  const meta = state.session?.user?.user_metadata ?? {};
  return state.profile?.full_name?.trim() || meta.full_name?.trim() || state.session?.user?.email?.split("@")[0] || "Trader";
}

function avatarUrl() {
  return state.session?.user?.user_metadata?.avatar_url || "";
}

function initials(name) {
  return String(name || "FC").trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "FC";
}

function paintAvatar(el, name, url) {
  if (!el) return;
  el.textContent = url ? "" : initials(name);
  el.style.backgroundImage = url ? `url("${url}")` : "linear-gradient(135deg,var(--purple),var(--cyan))";
}

function syncProfileUI() {
  const name = displayName();
  const role = state.profile?.role || "member";
  const email = state.session?.user?.email || "-";
  const url = avatarUrl();

  text(els.userRole, role); text(els.userDisplayName, name); text(els.userDisplayMeta, role); text(els.profileHeroName, name); text(els.profileHeroEmail, email);
  if (profile.name) profile.name.value = name === "Trader" ? "" : name;
  if (profile.email) profile.email.value = email;
  if (profile.role) profile.role.value = role;
  paintAvatar(els.userAvatar, name, url); paintAvatar(els.avatarPreview, name, url);
}

async function boot() {
  injectUpgradeUI(); refreshElements();
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
  bindEvents(); resetTradeForm();

  supabase.auth.onAuthStateChange(async (event, session) => {
    state.session = session;
    if (event === "PASSWORD_RECOVERY") { state.passwordRecoveryReady = true; switchSection("profile-section"); msg(els.passwordMsg, "Verifikasi email berhasil. Silakan isi password baru."); }
    session ? await showDashboard() : showAuth();
  });

  const { data } = await supabase.auth.getSession();
  state.session = data.session;
  state.session ? await showDashboard() : showAuth();
  window.lucide?.createIcons();
}

function showAuth() { state.profile = null; els.authView?.classList.remove("hidden"); els.dashboardView?.classList.add("hidden"); if (els.loginButton) els.loginButton.disabled = false; }

async function showDashboard() {
  els.authView?.classList.add("hidden"); els.dashboardView?.classList.remove("hidden");
  await loadProfile(); syncProfileUI(); els.biasForm?.classList.toggle("hidden", !canBias());
  await Promise.all([loadTrades(), loadBiases()]); window.lucide?.createIcons();
}

async function loadProfile() {
  const meta = state.session?.user?.user_metadata ?? {};
  const { data, error } = await supabase.from("profiles").select("id, full_name, role").eq("id", state.session.user.id).maybeSingle();
  state.profile = error ? { id: state.session.user.id, full_name: meta.full_name || "", role: meta.role || "member" } : { id: state.session.user.id, full_name: data?.full_name || meta.full_name || "", role: data?.role || meta.role || "member" };
}

async function login(event) {
  event.preventDefault(); setErr(els.loginError);
  const email = els.email.value.trim(), password = els.password.value;
  if (!email || !password) return setErr(els.loginError, "Email dan password wajib diisi.");
  if (!els.email.validity.valid) return setErr(els.loginError, "Format email belum benar.");
  if (password.length < 6) return setErr(els.loginError, "Password minimal 6 karakter.");
  busy(els.loginButton, true, "Memproses...");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) setErr(els.loginError, "Email atau password salah.");
  busy(els.loginButton, false, "Masuk");
}

async function loadTrades() {
  const { data, error } = await supabase.from("trade_journals").select("*").order("trade_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) { if (els.tradeList) els.tradeList.innerHTML = `<div class="empty-state">Gagal memuat jurnal: ${escapeHTML(error.message)}</div>`; return renderAnalytics(); }
  state.trades = data ?? []; renderTrades(); renderAnalytics();
}

function renderTrades() {
  if (!els.tradeList) return;
  if (!state.trades.length) { els.tradeList.innerHTML = '<div class="empty-state">Belum ada jurnal trade.</div>'; return; }
  els.tradeList.innerHTML = state.trades.map((t) => {
    const closed = isClosed(t), r = closed ? result(t) : null;
    return `<article class="data-card"><div class="card-topline"><div class="card-title"><strong>${escapeHTML(t.pair)} - ${escapeHTML(t.setup)}</strong><span>${fmtDate(t.trade_date)}</span></div><div class="card-actions"><button class="icon-button" type="button" data-edit-trade="${t.id}" aria-label="Edit jurnal"><i data-lucide="pencil"></i></button><button class="icon-button" type="button" data-delete-trade="${t.id}" aria-label="Hapus jurnal"><i data-lucide="trash-2"></i></button></div></div><div class="badge-row"><span class="badge ${t.direction}">${escapeHTML(t.direction)}</span><span class="badge ${!closed ? "neutral" : r >= 0 ? "result-positive" : "result-negative"}">${closed ? fmtR(r) : "Belum close"}</span><span class="badge">Risk ${t.risk_percent ?? 0}%</span></div><div class="meta-row"><span>Entry: ${t.entry_price ?? "-"}</span><span>SL: ${t.stop_loss ?? "-"}</span><span>TP: ${t.take_profit ?? "-"}</span></div>${t.notes ? `<p class="card-body">${escapeHTML(t.notes)}</p>` : ""}</article>`;
  }).join("");
  window.lucide?.createIcons();
}

function fillOptions(select, values, label) {
  if (!select) return;
  const current = select.value || "all";
  const unique = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  select.innerHTML = `<option value="all">${label}</option>${unique.map((v) => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("")}`;
  select.value = unique.includes(current) ? current : "all";
}

function filteredTrades() {
  const pair = els.analyticsPairFilter?.value ?? "all", setup = els.analyticsSetupFilter?.value ?? "all", out = els.analyticsResultFilter?.value ?? "all";
  return state.trades.filter((t) => {
    const r = isClosed(t) ? result(t) : null;
    return (pair === "all" || t.pair === pair) && (setup === "all" || t.setup === setup) && (out === "all" || (out === "open" && r === null) || (out === "win" && r > 0) || (out === "loss" && r < 0) || (out === "breakeven" && r === 0));
  });
}

function stats(rows) {
  const closed = rows.filter(isClosed), results = closed.map(result), wins = results.filter((v) => v > 0), losses = results.filter((v) => v < 0), be = results.filter((v) => v === 0);
  const gp = wins.reduce((s, v) => s + v, 0), gl = Math.abs(losses.reduce((s, v) => s + v, 0)), net = results.reduce((s, v) => s + v, 0);
  return { total: rows.length, closed: closed.length, open: rows.length - closed.length, wins: wins.length, losses: losses.length, be: be.length, winRate: closed.length ? wins.length / closed.length * 100 : 0, net, avg: closed.length ? net / closed.length : 0, pf: gl === 0 ? gp > 0 ? Infinity : 0 : gp / gl, best: results.length ? Math.max(...results) : 0, worst: results.length ? Math.min(...results) : 0 };
}

function renderAnalytics() {
  fillOptions(els.analyticsPairFilter, state.trades.map((t) => t.pair), "Semua pair"); fillOptions(els.analyticsSetupFilter, state.trades.map((t) => t.setup), "Semua setup");
  const rows = filteredTrades(), s = stats(rows);
  text(els.statTotalTrades, s.total); text(els.statClosedTrades, `${s.closed} closed · ${s.open} open`); text(els.statWinRate, fmtPct(s.winRate)); text(els.statWinLoss, `${s.wins}W / ${s.losses}L / ${s.be}BE`); text(els.statNetR, fmtR(s.net)); text(els.statAvgR, `Avg ${fmtR(s.avg)}/trade`); text(els.statProfitFactor, s.pf === Infinity ? "∞" : s.pf.toFixed(2)); text(els.statBestWorst, `Best ${fmtR(s.best)} · Worst ${fmtR(s.worst)}`);
  renderEquity(rows); renderMonthly(rows); renderPairs(rows); renderInsights(rows, s);
}

function renderEquity(rows) {
  if (!els.equityChart) return;
  const closed = [...rows].filter(isClosed).sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date) || new Date(a.created_at) - new Date(b.created_at));
  if (!closed.length) { els.equityChart.innerHTML = '<div class="empty-state">Belum ada closed trade untuk equity curve.</div>'; return; }
  let cum = 0; const points = closed.map((t) => (cum += result(t))); const min = Math.min(0, ...points), max = Math.max(0, ...points), range = max - min || 1, w = 720, h = 260, p = 26;
  const coords = points.map((v, i) => `${points.length === 1 ? w / 2 : p + i / (points.length - 1) * (w - p * 2)},${h - p - (v - min) / range * (h - p * 2)}`);
  els.equityChart.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="equity-svg"><line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}"/><line x1="${p}" y1="${p}" x2="${p}" y2="${h-p}"/><polyline points="${coords.join(" ")}"/>${coords.map((c) => { const [x,y] = c.split(","); return `<circle cx="${x}" cy="${y}" r="4"/>`; }).join("")}</svg>`;
}

function renderMonthly(rows) {
  if (!els.monthlyChart) return;
  const map = new Map(); rows.filter(isClosed).forEach((t) => { const k = String(t.trade_date).slice(0, 7); map.set(k, (map.get(k) ?? 0) + result(t)); });
  const data = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6); if (!data.length) { els.monthlyChart.innerHTML = '<div class="empty-state">Belum ada data bulanan.</div>'; return; }
  const max = Math.max(...data.map(([, v]) => Math.abs(v)), 1);
  els.monthlyChart.innerHTML = data.map(([m, v]) => `<div class="bar-item"><span class="bar-value ${v >= 0 ? "positive" : "negative"}">${fmtR(v)}</span><div class="bar-track"><span class="bar-fill ${v >= 0 ? "positive" : "negative"}" style="height:${Math.max(12, Math.abs(v / max) * 100)}%"></span></div><small>${fmtMonth(m)}</small></div>`).join("");
}

function renderPairs(rows) {
  if (!els.pairBreakdown) return;
  const map = new Map(); rows.filter(isClosed).forEach((t) => { const key = t.pair || "Unknown", x = map.get(key) ?? { total: 0, count: 0, wins: 0 }, r = result(t); x.total += r; x.count += 1; if (r > 0) x.wins += 1; map.set(key, x); });
  const data = [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6); if (!data.length) { els.pairBreakdown.innerHTML = '<div class="empty-state">Belum ada breakdown pair.</div>'; return; }
  els.pairBreakdown.innerHTML = data.map(([pair, x]) => `<div class="breakdown-item"><div><strong>${escapeHTML(pair)}</strong><span>${x.count} trade · ${fmtPct(x.wins / x.count * 100)} WR</span></div><b class="${x.total >= 0 ? "result-positive" : "result-negative"}">${fmtR(x.total)}</b></div>`).join("");
}

function renderInsights(rows, s) {
  if (!els.quickInsights) return;
  if (!rows.filter(isClosed).length) { els.quickInsights.innerHTML = '<div class="empty-state">Isi hasil R dulu biar insight muncul.</div>'; return; }
  const ideas = [s.net >= 0 ? "Sistem lagi positif. Jaga sizing dan jangan overtrade." : "Net R masih negatif. Review setup yang paling sering loss.", s.winRate >= 50 ? "Win rate cukup sehat. Fokus pertahankan kualitas entry." : "Win rate di bawah 50%. Pastikan RR tetap cukup besar.", s.avg > 0 ? `Average trade ${fmtR(s.avg)}. Edge mulai kebaca.` : `Average R ${fmtR(s.avg)}. Kurangi entry impulsif.`];
  els.quickInsights.innerHTML = ideas.map((t) => `<div class="insight-item"><i data-lucide="sparkles"></i><span>${escapeHTML(t)}</span></div>`).join(""); window.lucide?.createIcons();
}

async function saveTrade(event) {
  event.preventDefault(); setErr(els.tradeError); if (!els.tradeForm.reportValidity()) return;
  const payload = { user_id: state.session.user.id, trade_date: trade.date.value, pair: trade.pair.value.trim().toUpperCase(), setup: trade.setup.value.trim(), direction: trade.direction.value, entry_price: num(trade.entry.value), stop_loss: num(trade.stop.value), take_profit: num(trade.target.value), risk_percent: num(trade.risk.value), result_r: num(trade.result.value), notes: trade.notes.value.trim() || null };
  const q = trade.id.value ? supabase.from("trade_journals").update(payload).eq("id", trade.id.value) : supabase.from("trade_journals").insert(payload);
  const { error } = await q; if (error) return setErr(els.tradeError, error.message); resetTradeForm(); await loadTrades(); switchSection("performance-section");
}

function editTrade(id) {
  const t = state.trades.find((x) => String(x.id) === String(id)); if (!t) return;
  trade.id.value = t.id; trade.date.value = t.trade_date; trade.pair.value = t.pair; trade.setup.value = t.setup; trade.direction.value = t.direction; trade.entry.value = t.entry_price ?? ""; trade.stop.value = t.stop_loss ?? ""; trade.target.value = t.take_profit ?? ""; trade.risk.value = t.risk_percent ?? ""; trade.result.value = t.result_r ?? ""; trade.notes.value = t.notes ?? "";
  text(els.tradeFormTitle, "Edit Jurnal"); els.cancelEditTrade?.classList.remove("hidden"); switchSection("journal-section");
}

function resetTradeForm() { if (!els.tradeForm) return; els.tradeForm.reset(); trade.id.value = ""; trade.date.valueAsDate = new Date(); text(els.tradeFormTitle, "Tambah Jurnal"); els.cancelEditTrade?.classList.add("hidden"); setErr(els.tradeError); }
async function deleteTrade(id) { if (!confirm("Hapus jurnal trade ini?")) return; const { error } = await supabase.from("trade_journals").delete().eq("id", id); if (error) return setErr(els.tradeError, error.message); await loadTrades(); }

async function loadBiases() {
  const { data, error } = await supabase.from("daily_biases").select("*, profiles(full_name, role)").order("created_at", { ascending: false }).limit(50);
  if (error) { if (els.biasList) els.biasList.innerHTML = `<div class="empty-state">Gagal memuat daily bias: ${escapeHTML(error.message)}</div>`; return; }
  state.biases = data ?? []; renderBiases();
}

function renderBiases() {
  if (!els.biasList) return;
  if (!state.biases.length) { els.biasList.innerHTML = '<div class="empty-state">Belum ada daily bias.</div>'; return; }
  els.biasList.innerHTML = state.biases.map((b) => `<article class="data-card"><div class="card-topline"><div class="card-title"><strong>${escapeHTML(b.title)}</strong><span>${escapeHTML(b.market)} - ${fmtDate(b.created_at)} - ${escapeHTML(b.profiles?.full_name || b.profiles?.role || "Team")}</span></div>${canBias() ? `<div class="card-actions"><button class="icon-button" type="button" data-edit-bias="${b.id}" aria-label="Edit daily bias"><i data-lucide="pencil"></i></button><button class="icon-button" type="button" data-delete-bias="${b.id}" aria-label="Hapus daily bias"><i data-lucide="trash-2"></i></button></div>` : ""}</div><div class="badge-row"><span class="badge ${b.direction}">${escapeHTML(b.direction)}</span></div><p class="card-body">${escapeHTML(b.content)}</p></article>`).join(""); window.lucide?.createIcons();
}

async function saveBias(event) {
  event.preventDefault(); setErr(els.biasError); if (!canBias()) return setErr(els.biasError, "Hanya admin dan mentor yang boleh upload daily bias."); if (!els.biasForm.reportValidity()) return;
  const payload = { author_id: state.session.user.id, title: bias.title.value.trim(), market: bias.market.value.trim().toUpperCase(), direction: bias.direction.value, content: bias.content.value.trim() };
  const q = bias.id.value ? supabase.from("daily_biases").update(payload).eq("id", bias.id.value) : supabase.from("daily_biases").insert(payload);
  const { error } = await q; if (error) return setErr(els.biasError, error.message); resetBiasForm(); await loadBiases();
}

function editBias(id) { const b = state.biases.find((x) => String(x.id) === String(id)); if (!b) return; bias.id.value = b.id; bias.title.value = b.title; bias.market.value = b.market; bias.direction.value = b.direction; bias.content.value = b.content; text(els.biasFormTitle, "Edit Daily Bias"); els.cancelEditBias?.classList.remove("hidden"); switchSection("bias-section"); }
function resetBiasForm() { if (!els.biasForm) return; els.biasForm.reset(); bias.id.value = ""; text(els.biasFormTitle, "Upload Daily Bias"); els.cancelEditBias?.classList.add("hidden"); setErr(els.biasError); }
async function deleteBias(id) { if (!confirm("Hapus daily bias ini?")) return; const { error } = await supabase.from("daily_biases").delete().eq("id", id); if (error) return setErr(els.biasError, error.message); await loadBiases(); }

async function saveProfile(event) {
  event.preventDefault(); msg(els.profileMsg); setErr(els.profileError); const name = profile.name.value.trim(); if (!name) return setErr(els.profileError, "Nama wajib diisi.");
  const button = els.profileForm.querySelector("button[type='submit']"); busy(button, true, "Menyimpan...");
  const tableUpdate = await supabase.from("profiles").update({ full_name: name }).eq("id", state.session.user.id);
  const authUpdate = await supabase.auth.updateUser({ data: { full_name: name } });
  busy(button, false, "Simpan Profile");
  if (tableUpdate.error && authUpdate.error) return setErr(els.profileError, tableUpdate.error.message || authUpdate.error.message);
  if (authUpdate.data?.user) state.session.user = authUpdate.data.user;
  await loadProfile(); syncProfileUI(); msg(els.profileMsg, tableUpdate.error ? "Nama tersimpan di metadata akun. Update tabel profiles ditolak policy." : "Profile berhasil disimpan.");
}

async function uploadAvatar(event) {
  const file = event.target.files?.[0]; if (!file) return; msg(els.profileMsg); setErr(els.profileError);
  if (!file.type.startsWith("image/")) return setErr(els.profileError, "File harus berupa gambar.");
  if (file.size > 3 * 1024 * 1024) return setErr(els.profileError, "Ukuran foto maksimal 3MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg", path = `${state.session.user.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { cacheControl: "3600", upsert: true });
  if (uploadError) return setErr(els.profileError, `Gagal upload foto. Pastikan bucket '${AVATAR_BUCKET}' dan policy storage sudah aktif.`);
  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: publicData.publicUrl, avatar_path: path } });
  if (error) return setErr(els.profileError, error.message);
  if (data?.user) state.session.user = data.user; syncProfileUI(); msg(els.profileMsg, "Foto profile berhasil diperbarui.");
}

async function requestPasswordReset() {
  msg(els.passwordMsg); setErr(els.passwordError); const email = state.session?.user?.email; if (!email) return setErr(els.passwordError, "Email akun tidak ditemukan.");
  const redirectTo = `${location.origin}${location.pathname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  error ? setErr(els.passwordError, "Gagal kirim verifikasi password.") : msg(els.passwordMsg, `Link verifikasi sudah dikirim ke ${email}. Buka email itu dulu sebelum menyimpan password baru.`);
}

async function savePassword(event) {
  event.preventDefault(); msg(els.passwordMsg); setErr(els.passwordError);
  if (!state.passwordRecoveryReady) return setErr(els.passwordError, "Buka link verifikasi dari email dulu sebelum menyimpan password baru.");
  if (!profile.newPassword.value || profile.newPassword.value.length < 6) return setErr(els.passwordError, "Password baru minimal 6 karakter.");
  if (profile.newPassword.value !== profile.confirmPassword.value) return setErr(els.passwordError, "Konfirmasi password belum sama.");
  const { error } = await supabase.auth.updateUser({ password: profile.newPassword.value });
  if (error) return setErr(els.passwordError, error.message);
  state.passwordRecoveryReady = false; els.passwordForm.reset(); msg(els.passwordMsg, "Password berhasil diperbarui.");
}

function switchSection(sectionId) {
  $$(".workspace-section").forEach((section) => section.classList.toggle("hidden", section.id !== sectionId));
  $$(".nav-item").forEach((item) => {
    const active = item.dataset.section === sectionId; item.classList.toggle("active", active);
    if (active) { text(els.activeNavLabel, item.dataset.label); els.activeNavIcon?.setAttribute("data-lucide", item.dataset.icon || "circle"); text(els.welcomeTitle, item.dataset.label === "Profile" ? "Profile Center" : item.dataset.label === "Jurnal Trade" ? "Trade Journal" : item.dataset.label === "Daily Bias" ? "Daily Bias" : "Performance Dashboard"); }
  });
  $(".compact-nav")?.classList.remove("open"); els.navToggle?.setAttribute("aria-expanded", "false"); window.lucide?.createIcons();
}

function bindEvents() {
  els.loginForm?.addEventListener("submit", login); els.logoutButton?.addEventListener("click", () => supabase.auth.signOut());
  els.refreshTrades?.addEventListener("click", loadTrades); els.refreshBiases?.addEventListener("click", loadBiases); els.refreshAnalytics?.addEventListener("click", loadTrades);
  els.tradeForm?.addEventListener("submit", saveTrade); els.biasForm?.addEventListener("submit", saveBias); els.profileForm?.addEventListener("submit", saveProfile); els.passwordForm?.addEventListener("submit", savePassword);
  els.requestPasswordReset?.addEventListener("click", requestPasswordReset); els.avatarInput?.addEventListener("change", uploadAvatar); els.cancelEditTrade?.addEventListener("click", resetTradeForm); els.cancelEditBias?.addEventListener("click", resetBiasForm);
  els.togglePassword?.addEventListener("click", () => { const show = els.password.type === "password"; els.password.type = show ? "text" : "password"; els.togglePassword.querySelector("span").textContent = show ? "HIDE" : "SHOW"; });
  els.forgotPassword?.addEventListener("click", async () => { setErr(els.loginError); const email = els.email.value.trim(); if (!email || !els.email.validity.valid) return setErr(els.loginError, "Isi email yang valid dulu untuk reset password."); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` }); setErr(els.loginError, error ? "Gagal kirim link reset password." : "Link reset password sudah dikirim ke email."); });
  els.navToggle?.addEventListener("click", () => { const nav = $(".compact-nav"), open = !nav.classList.contains("open"); nav.classList.toggle("open", open); els.navToggle.setAttribute("aria-expanded", String(open)); });
  document.addEventListener("click", (event) => { if (!event.target.closest(".compact-nav")) $(".compact-nav")?.classList.remove("open"); });
  $$(".nav-item").forEach((item) => item.addEventListener("click", () => switchSection(item.dataset.section)));
  $$(".profile-shortcut").forEach((item) => { item.addEventListener("click", () => switchSection("profile-section")); item.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") switchSection("profile-section"); }); });
  els.analyticsPairFilter?.addEventListener("change", renderAnalytics); els.analyticsSetupFilter?.addEventListener("change", renderAnalytics); els.analyticsResultFilter?.addEventListener("change", renderAnalytics);
  els.tradeList?.addEventListener("click", (event) => { const edit = event.target.closest("[data-edit-trade]"), del = event.target.closest("[data-delete-trade]"); if (edit) editTrade(edit.dataset.editTrade); if (del) deleteTrade(del.dataset.deleteTrade); });
  els.biasList?.addEventListener("click", (event) => { const edit = event.target.closest("[data-edit-bias]"), del = event.target.closest("[data-delete-bias]"); if (edit) editBias(edit.dataset.editBias); if (del) deleteBias(del.dataset.deleteBias); });
}

boot();
