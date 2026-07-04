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
    renderAnalytics();
    return;
  }

  state.trades = data ?? [];
  renderTrades();
  renderAnalytics();
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
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    best: results.length ? Math.max(...results) : 0,
    worst: results.length ? Math.min(...results) : 0,
  };
}

function renderAnalytics() {
  fillFilterOptions(elements.analyticsPairFilter, state.trades.map((trade) => trade.pair), "Semua pair");
  fillFilterOptions(elements.analyticsSetupFilter, state.trades.map((trade) => trade.setup), "Semua setup");

  const filteredTrades = getFilteredTrades();
  const stats = calculateStats(filteredTrades);

  elements.statTotalTrades.textContent = stats.total;
  elements.statClosedTrades.textContent = `${stats.closed} closed · ${stats.open} open`;
  elements.statWinRate.textContent = formatPercent(stats.winRate);
  elements.statWinLoss.textContent = `${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`;
  elements.statNetR.textContent = formatR(stats.netR);
  elements.statAvgR.textContent = `Avg ${formatR(stats.avgR)} / trade`;
  elements.statProfitFactor.textContent = stats.profitFactor === null ? "∞" : stats.profitFactor.toFixed(2);
  elements.statBestWorst.textContent = `Best ${formatR(stats.best)} · Worst ${formatR(stats.worst)}`;

  renderEquityChart(filteredTrades);
  renderMonthlyChart(filteredTrades);
  renderPairBreakdown(filteredTrades);
  renderQuickInsights(filteredTrades, stats);
}

function renderEquityChart(trades) {
  const closedTrades = [...trades]
    .filter(isClosedTrade)
    .sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date));

  if (!closedTrades.length) {
    elements.equityChart.innerHTML = '<div class="empty-state compact-empty">Belum ada closed trade untuk equity curve.</div>';
    return;
  }

  const values = closedTrades.reduce(
    (acc, trade) => {
      acc.push(acc[acc.length - 1] + getTradeResult(trade));
      return acc;
    },
    [0]
  );

  const width = 720;
  const height = 260;
  const padding = 28;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const points = values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const zeroY = height - padding - ((0 - minValue) / range) * (height - padding * 2);

  elements.equityChart.innerHTML = `
    <svg class="equity-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Equity curve">
      <line x1="${padding}" x2="${width - padding}" y1="${zeroY}" y2="${zeroY}" class="zero-line" />
      <polyline points="${points}" />
      <circle cx="${width - padding}" cy="${points.split(" ").at(-1).split(",")[1]}" r="5" />
      <text x="${padding}" y="22">Start 0R</text>
      <text x="${width - 170}" y="22">Now ${formatR(values.at(-1))}</text>
    </svg>
  `;
}

function renderMonthlyChart(trades) {
  const closedTrades = trades.filter(isClosedTrade);

  if (!closedTrades.length) {
    elements.monthlyChart.innerHTML = '<div class="empty-state compact-empty">Belum ada data bulanan.</div>';
    return;
  }

  const monthly = new Map();
  closedTrades.forEach((trade) => {
    const key = trade.trade_date.slice(0, 7);
    monthly.set(key, (monthly.get(key) ?? 0) + getTradeResult(trade));
  });

  const rows = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);

  const maxAbs = Math.max(...rows.map(([, value]) => Math.abs(value)), 1);

  elements.monthlyChart.innerHTML = rows
    .map(([month, value]) => {
      const height = Math.max(8, (Math.abs(value) / maxAbs) * 112);
      const type = value >= 0 ? "positive" : "negative";
      return `
        <div class="bar-item">
          <div class="bar-track">
            <span class="bar ${type}" style="height: ${height}px"></span>
          </div>
          <strong>${formatR(value)}</strong>
          <small>${formatMonth(month)}</small>
        </div>
      `;
    })
    .join("");
}

function groupTradesByPair(trades) {
  const groups = new Map();

  trades.filter(isClosedTrade).forEach((trade) => {
    const pair = trade.pair || "Unknown";
    const result = getTradeResult(trade);
    const item = groups.get(pair) ?? { pair, total: 0, wins: 0, netR: 0 };
    item.total += 1;
    item.wins += result > 0 ? 1 : 0;
    item.netR += result;
    groups.set(pair, item);
  });

  return [...groups.values()]
    .map((item) => ({
      ...item,
      winRate: item.total ? (item.wins / item.total) * 100 : 0,
    }))
    .sort((a, b) => b.netR - a.netR);
}

function renderPairBreakdown(trades) {
  const pairs = groupTradesByPair(trades).slice(0, 6);

  if (!pairs.length) {
    elements.pairBreakdown.innerHTML = '<div class="empty-state compact-empty">Belum ada closed trade per pair.</div>';
    return;
  }

  elements.pairBreakdown.innerHTML = pairs
    .map((item) => `
      <div class="breakdown-row">
        <div>
          <strong>${escapeText(item.pair)}</strong>
          <small>${item.total} trade · WR ${formatPercent(item.winRate)}</small>
        </div>
        <span class="${item.netR >= 0 ? "positive-text" : "negative-text"}">${formatR(item.netR)}</span>
      </div>
    `)
    .join("");
}

function getCurrentStreak(trades) {
  const closedTrades = [...trades]
    .filter(isClosedTrade)
    .sort((a, b) => new Date(b.trade_date) - new Date(a.trade_date));

  if (!closedTrades.length) return "Belum ada streak.";

  const firstResult = getTradeResult(closedTrades[0]);
  if (firstResult === 0) return "Trade terakhir breakeven.";

  const isWin = firstResult > 0;
  let count = 0;

  for (const trade of closedTrades) {
    const result = getTradeResult(trade);
    if ((isWin && result > 0) || (!isWin && result < 0)) {
      count += 1;
    } else {
      break;
    }
  }

  return `${count} ${isWin ? "win" : "loss"} beruntun`;
}

function getMostFrequentSetup(trades) {
  const counts = new Map();
  trades.forEach((trade) => {
    if (!trade.setup) return;
    counts.set(trade.setup, (counts.get(trade.setup) ?? 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
}

function renderQuickInsights(trades, stats) {
  const closedTrades = trades.filter(isClosedTrade);
  const pairRows = groupTradesByPair(trades);
  const bestPair = pairRows[0];
  const worstPair = [...pairRows].sort((a, b) => a.netR - b.netR)[0];
  const setup = getMostFrequentSetup(trades);
  const streak = getCurrentStreak(trades);

  const insights = [
    {
      label: "Bias performa",
      value: stats.netR > 0 ? "Sistem lagi positif." : stats.netR < 0 ? "Sistem lagi drawdown." : "Masih netral.",
    },
    {
      label: "Best pair",
      value: bestPair ? `${bestPair.pair} (${formatR(bestPair.netR)})` : "Belum ada data.",
    },
    {
      label: "Pair perlu review",
      value: worstPair ? `${worstPair.pair} (${formatR(worstPair.netR)})` : "Belum ada data.",
    },
    {
      label: "Setup paling sering",
      value: setup ? `${setup[0]} · ${setup[1]}x` : "Belum ada setup.",
    },
    {
      label: "Current streak",
      value: closedTrades.length ? streak : "Belum ada closed trade.",
    },
  ];

  elements.quickInsights.innerHTML = insights
    .map((item) => `
      <div class="insight-row">
        <span>${escapeText(item.label)}</span>
        <strong>${escapeText(item.value)}</strong>
      </div>
    `)
    .join("");
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

  elements.navItems.forEach((navItem) => navItem.classList.toggle("active", navItem.dataset.section === "journal-section"));
  elements.sections.forEach((section) => section.classList.toggle("hidden", section.id !== "journal-section"));
  elements.welcomeTitle.textContent = "Trade Journal";
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
  elements.refreshAnalytics.addEventListener("click", loadTrades);
  elements.refreshTrades.addEventListener("click", loadTrades);
  elements.refreshBiases.addEventListener("click", loadBiases);
  elements.tradeForm.addEventListener("submit", saveTrade);
  elements.biasForm.addEventListener("submit", saveBias);
  elements.cancelEditTrade.addEventListener("click", resetTradeForm);
  elements.cancelEditBias.addEventListener("click", resetBiasForm);
  elements.analyticsPairFilter.addEventListener("change", renderAnalytics);
  elements.analyticsSetupFilter.addEventListener("change", renderAnalytics);
  elements.analyticsResultFilter.addEventListener("change", renderAnalytics);

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
      redirectTo: `${window.location.origin}/farmer-circle/`,
    });

    setError(
      elements.loginError,
      error ? "Gagal kirim link reset password." : "Link reset password sudah dikirim ke email."
    );
  });

  elements.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const sectionId = item.dataset.section;
      const titleMap = {
        "performance-section": "Performance Dashboard",
        "journal-section": "Trade Journal",
        "bias-section": "Daily Bias",
      };

      elements.navItems.forEach((navItem) => navItem.classList.toggle("active", navItem === item));
      elements.sections.forEach((section) => section.classList.toggle("hidden", section.id !== sectionId));
      elements.welcomeTitle.textContent = titleMap[sectionId] ?? "Dashboard";
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
