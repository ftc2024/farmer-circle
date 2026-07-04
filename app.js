import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://nsnjgfcuuesqibmpbiuv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbmpnZmN1dWVzcWlibXBiaXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcwMTEsImV4cCI6MjA5ODcxMzAxMX0.FdsZBJUeSh1b5BmxrxXdkkQbVfKevRToO90YFl7PsnY";

let supabase;

const state = {
  session: null,
  profile: null,
  trades: [],
  biases: [],
};

const $ = (selector) => document.querySelector(selector);

const elements = {
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
  userEmail: $("#user-email"),
  userRole: $("#user-role"),
  welcomeTitle: $("#welcome-title"),
  navItems: document.querySelectorAll(".nav-item"),
  sections: document.querySelectorAll(".workspace-section"),
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
};

const tradeFields = {
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
};

const biasFields = {
  id: $("#bias-id"),
  title: $("#bias-title"),
  market: $("#bias-market"),
  direction: $("#bias-direction"),
  content: $("#bias-content"),
};

function isSupabaseConfigured() {
  return !SUPABASE_URL.startsWith("GANTI_") && !SUPABASE_ANON_KEY.startsWith("GANTI_");
}

function setError(element, message = "") {
  element.textContent = message;
}

function setBusy(button, busy, label) {
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

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value);
}

function escapeText(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

async function bootstrap() {
  if (!isSupabaseConfigured()) {
    setError(elements.loginError, "Isi SUPABASE_URL dan SUPABASE_ANON_KEY di app.js dulu.");
    elements.loginButton.disabled = true;
    return;
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  if (state.session) {
    await showDashboard();
  } else {
    showAuth();
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (session) {
      await showDashboard();
    } else {
      showAuth();
    }
  });
}

function showAuth() {
  state.profile = null;
  elements.authView.classList.remove("hidden");
  elements.dashboardView.classList.add("hidden");
  elements.loginButton.disabled = false;
}

async function showDashboard() {
  elements.authView.classList.add("hidden");
  elements.dashboardView.classList.remove("hidden");
  elements.userEmail.textContent = state.session.user.email;
  await loadProfile();
  elements.userRole.textContent = state.profile?.role ?? "member";
  elements.biasForm.classList.toggle("hidden", !canManageBias());
  await Promise.all([loadTrades(), loadBiases()]);
  if (window.lucide) window.lucide.createIcons();
}

async function loadProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", state.session.user.id)
    .single();

  if (error) {
    state.profile = { id: state.session.user.id, role: "member" };
    return;
  }

  state.profile = data;
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
    elements.tradeList.innerHTML = `<div class="empty-state">Gagal memuat jurnal: ${escapeText(error.message)}</div>`;
    return;
  }

  state.trades = data ?? [];
  renderTrades();
}

function renderTrades() {
  if (!state.trades.length) {
    elements.tradeList.innerHTML = '<div class="empty-state">Belum ada jurnal trade.</div>';
    return;
  }

  elements.tradeList.innerHTML = state.trades
    .map((trade) => {
      const resultClass = Number(trade.result_r) >= 0 ? "result-positive" : "result-negative";
      const resultLabel = trade.result_r === null || trade.result_r === undefined ? "Belum close" : `${trade.result_r}R`;
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
}

function editTrade(id) {
  const trade = state.trades.find((item) => item.id === id);
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
  elements.tradeFormTitle.textContent = "Edit Jurnal";
  elements.cancelEditTrade.classList.remove("hidden");
}

function resetTradeForm() {
  elements.tradeForm.reset();
  tradeFields.id.value = "";
  tradeFields.date.valueAsDate = new Date();
  elements.tradeFormTitle.textContent = "Tambah Jurnal";
  elements.cancelEditTrade.classList.add("hidden");
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
    elements.biasList.innerHTML = `<div class="empty-state">Gagal memuat daily bias: ${escapeText(error.message)}</div>`;
    return;
  }

  state.biases = data ?? [];
  renderBiases();
}

function renderBiases() {
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
  const bias = state.biases.find((item) => item.id === id);
  if (!bias) return;

  biasFields.id.value = bias.id;
  biasFields.title.value = bias.title;
  biasFields.market.value = bias.market;
  biasFields.direction.value = bias.direction;
  biasFields.content.value = bias.content;
  elements.biasFormTitle.textContent = "Edit Daily Bias";
  elements.cancelEditBias.classList.remove("hidden");
}

function resetBiasForm() {
  elements.biasForm.reset();
  biasFields.id.value = "";
  elements.biasFormTitle.textContent = "Upload Daily Bias";
  elements.cancelEditBias.classList.add("hidden");
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

function bindEvents() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.logoutButton.addEventListener("click", () => supabase.auth.signOut());
  elements.refreshTrades.addEventListener("click", loadTrades);
  elements.refreshBiases.addEventListener("click", loadBiases);
  elements.tradeForm.addEventListener("submit", saveTrade);
  elements.biasForm.addEventListener("submit", saveBias);
  elements.cancelEditTrade.addEventListener("click", resetTradeForm);
  elements.cancelEditBias.addEventListener("click", resetBiasForm);

  elements.togglePassword.addEventListener("click", () => {
    const isPassword = elements.password.type === "password";
    elements.password.type = isPassword ? "text" : "password";
    elements.togglePassword.setAttribute("aria-label", isPassword ? "Sembunyikan password" : "Tampilkan password");
    elements.togglePassword.querySelector("span").textContent = isPassword ? "HIDE" : "SHOW";
  });

  elements.forgotPassword.addEventListener("click", async () => {
    setError(elements.loginError);

    if (!supabase) {
      setError(elements.loginError, "Supabase belum siap. Coba refresh halaman.");
      return;
    }

    const email = elements.email.value.trim();
    if (!email || !elements.email.validity.valid) {
      setError(elements.loginError, "Isi email yang valid dulu untuk reset password.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    setError(
      elements.loginError,
      error ? "Gagal kirim link reset password." : "Link reset password sudah dikirim ke email."
    );
  });

  elements.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const sectionId = item.dataset.section;
      elements.navItems.forEach((navItem) => navItem.classList.toggle("active", navItem === item));
      elements.sections.forEach((section) => section.classList.toggle("hidden", section.id !== sectionId));
      elements.welcomeTitle.textContent = sectionId === "bias-section" ? "Daily Bias" : "Trade Journal";
    });
  });

  elements.tradeList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-trade]");
    const deleteButton = event.target.closest("[data-delete-trade]");
    if (editButton) editTrade(editButton.dataset.editTrade);
    if (deleteButton) deleteTrade(deleteButton.dataset.deleteTrade);
  });

  elements.biasList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-bias]");
    const deleteButton = event.target.closest("[data-delete-bias]");
    if (editButton) editBias(editButton.dataset.editBias);
    if (deleteButton) deleteBias(deleteButton.dataset.deleteBias);
  });
}

bindEvents();
resetTradeForm();
bootstrap();

window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
});
