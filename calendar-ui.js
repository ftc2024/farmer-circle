const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let calendarEvents = [];
let calendarMode = "Demo Mode";
let calendarRange = "today";

const fallbackEvents = [
  { time: "19:30", currency: "USD", impact: "high", event: "Nonfarm Payrolls", actual: "-", forecast: "190K", previous: "175K", country: "United States" },
  { time: "19:30", currency: "USD", impact: "high", event: "Unemployment Rate", actual: "-", forecast: "4.0%", previous: "4.0%", country: "United States" },
  { time: "21:00", currency: "USD", impact: "medium", event: "ISM Services PMI", actual: "-", forecast: "52.6", previous: "53.8", country: "United States" },
  { time: "15:30", currency: "GBP", impact: "medium", event: "Manufacturing PMI", actual: "-", forecast: "51.4", previous: "51.2", country: "United Kingdom" },
  { time: "16:00", currency: "EUR", impact: "medium", event: "CPI Flash Estimate YoY", actual: "-", forecast: "2.4%", previous: "2.6%", country: "Eurozone" },
  { time: "08:30", currency: "AUD", impact: "low", event: "Retail Sales MoM", actual: "-", forecast: "0.3%", previous: "0.1%", country: "Australia" },
];

async function loadCalendarConfig() {
  try {
    await import(`./calendar-config.js?v=${Date.now()}`);
  } catch (error) {
    console.warn("calendar-config.js tidak ditemukan atau gagal dimuat:", error.message);
  }

  return window.FARMER_CIRCLE_CONFIG || {};
}

function injectCalendarUI() {
  const navMenu = $(".nav-dropdown-menu");
  const content = $(".content-area");

  if (navMenu && !$('[data-section="calendar-section"]')) {
    navMenu.insertAdjacentHTML(
      "beforeend",
      `<button class="nav-item" type="button" data-section="calendar-section" data-label="Economic Calendar" data-icon="calendar-days">
        <i data-lucide="calendar-days"></i>
        <span>Economic Calendar</span>
      </button>`
    );
  }

  if (content && !$("#calendar-section")) {
    content.insertAdjacentHTML(
      "beforeend",
      `<section id="calendar-section" class="workspace-section hidden">
        <div class="calendar-shell">
          <div class="calendar-hero">
            <div>
              <p class="eyebrow small-eyebrow">Market News</p>
              <h3>Economic Calendar</h3>
              <p>Kalender ekonomi versi Farmer Circle. Tampilan dibuat sendiri, data bisa masuk lewat backend/proxy.</p>
            </div>
            <div class="calendar-source-card">
              <span>DATA MODE</span>
              <strong id="calendar-mode-label">Loading...</strong>
              <small id="calendar-source-note">Mengecek backend calendar...</small>
            </div>
          </div>

          <div class="calendar-filters">
            <label>
              <span>Search News</span>
              <input id="calendar-search" type="search" placeholder="Cari NFP, CPI, FOMC..." />
            </label>
            <label>
              <span>Currency</span>
              <select id="calendar-currency">
                <option value="all">Semua currency</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="AUD">AUD</option>
                <option value="CAD">CAD</option>
                <option value="CHF">CHF</option>
                <option value="NZD">NZD</option>
              </select>
            </label>
            <label>
              <span>Impact</span>
              <select id="calendar-impact">
                <option value="all">Semua impact</option>
                <option value="high">High impact</option>
                <option value="medium">Medium impact</option>
                <option value="low">Low impact</option>
              </select>
            </label>
            <label>
              <span>Session</span>
              <select id="calendar-session">
                <option value="all">Semua sesi</option>
                <option value="asia">Asia</option>
                <option value="london">London</option>
                <option value="new-york">New York</option>
              </select>
            </label>
          </div>

          <div class="calendar-toolbar">
            <div class="calendar-tabs" aria-label="Calendar range">
              <button class="calendar-range active" type="button" data-range="today">Today</button>
              <button class="calendar-range" type="button" data-range="tomorrow">Tomorrow</button>
              <button class="calendar-range" type="button" data-range="week">This Week</button>
            </div>
            <button id="calendar-refresh" class="ghost-button compact" type="button">
              <i data-lucide="refresh-cw"></i>
              <span>Refresh</span>
            </button>
          </div>

          <div class="calendar-table-card">
            <div class="calendar-table-head">
              <span>Time</span>
              <span>Currency</span>
              <span>Impact</span>
              <span>Event</span>
              <span>Actual</span>
              <span>Forecast</span>
              <span>Previous</span>
            </div>
            <div id="calendar-list" class="calendar-list"></div>
          </div>
        </div>
      </section>`
    );
  }
}

function addCalendarStyles() {
  if ($("#calendar-ui-style")) return;
  const style = document.createElement("style");
  style.id = "calendar-ui-style";
  style.textContent = `
    @media (min-width: 781px) {
      .compact-nav { display: grid !important; gap: 9px !important; }
      .nav-dropdown-toggle { display: none !important; }
      .nav-dropdown-menu { position: static !important; display: grid !important; padding: 0 !important; border: 0 !important; background: transparent !important; box-shadow: none !important; backdrop-filter: none !important; gap: 9px !important; }
      .compact-nav .nav-item { min-height: 46px !important; padding: 11px 12px !important; border: 1px solid transparent !important; border-radius: 12px !important; background: transparent !important; }
      .compact-nav .nav-item.active { border-color: rgba(37,212,206,.22) !important; background: linear-gradient(135deg, rgba(117,92,246,.22), rgba(37,212,206,.12)) !important; }
    }
    @media (max-width: 780px) { .nav-dropdown-toggle { display: grid !important; } .nav-dropdown-menu { position: absolute !important; } }
    .calendar-shell { display: grid; gap: 16px; }
    .calendar-hero, .calendar-filters, .calendar-toolbar, .calendar-table-card { border: 1px solid var(--line); border-radius: 14px; background: rgba(16,22,42,.72); box-shadow: var(--shadow); }
    .calendar-hero { display: flex; justify-content: space-between; gap: 20px; padding: 20px; background: linear-gradient(115deg, rgba(16,22,42,.92), rgba(12,55,70,.72)); }
    .calendar-hero p:last-child { margin: 8px 0 0; color: var(--muted); line-height: 1.6; }
    .calendar-source-card { min-width: 250px; padding: 14px; border: 1px solid rgba(37,212,206,.2); border-radius: 12px; background: rgba(5,8,18,.42); display: grid; gap: 5px; }
    .calendar-source-card span, .calendar-table-head, .calendar-impact, .calendar-range { font-family: "JetBrains Mono", monospace; text-transform: uppercase; letter-spacing: .1em; }
    .calendar-source-card span { color: var(--cyan); font-size: .66rem; font-weight: 900; }
    .calendar-source-card small { color: var(--muted); line-height: 1.45; }
    .calendar-filters { display: grid; grid-template-columns: 1.4fr repeat(3, minmax(150px, .7fr)); gap: 14px; padding: 16px; }
    .calendar-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px; }
    .calendar-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
    .calendar-range { min-height: 36px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; color: var(--muted); background: rgba(255,255,255,.035); font-size: .68rem; font-weight: 900; }
    .calendar-range.active, .calendar-range:hover { color: var(--text); border-color: rgba(37,212,206,.35); background: rgba(37,212,206,.1); }
    .calendar-table-card { overflow: hidden; }
    .calendar-table-head, .calendar-row { display: grid; grid-template-columns: 80px 100px 120px minmax(240px,1fr) 100px 110px 110px; gap: 12px; align-items: center; }
    .calendar-table-head { padding: 13px 16px; color: var(--low); border-bottom: 1px solid var(--line); font-size: .66rem; font-weight: 900; }
    .calendar-list { display: grid; }
    .calendar-row { min-height: 58px; padding: 13px 16px; border-bottom: 1px solid rgba(150,165,210,.09); }
    .calendar-row:last-child { border-bottom: 0; }
    .calendar-time { color: var(--text); font-weight: 900; }
    .calendar-currency { width: fit-content; padding: 5px 9px; border-radius: 999px; color: #07101a; background: linear-gradient(135deg, var(--purple), var(--cyan)); font-weight: 900; font-size: .76rem; }
    .calendar-impact { width: fit-content; padding: 5px 8px; border-radius: 999px; font-size: .62rem; font-weight: 900; }
    .calendar-impact.high { color: #ffd3d3; background: rgba(255,112,112,.16); }
    .calendar-impact.medium { color: #ffe7ad; background: rgba(214,167,77,.16); }
    .calendar-impact.low { color: #b9fff7; background: rgba(37,212,206,.12); }
    .calendar-event strong { display: block; margin-bottom: 4px; }
    .calendar-event small { color: var(--muted); }
    .calendar-number { color: var(--muted); font-weight: 800; }
    @media (max-width: 1100px) { .calendar-filters { grid-template-columns: repeat(2,minmax(0,1fr)); } .calendar-table-card { overflow-x: auto; } .calendar-table-head, .calendar-row { min-width: 980px; } }
    @media (max-width: 640px) { .calendar-hero, .calendar-toolbar { flex-direction: column; align-items: stretch; } .calendar-source-card { min-width: 0; } .calendar-filters { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function setCalendarStatus(mode, note) {
  const modeLabel = $("#calendar-mode-label");
  const noteLabel = $("#calendar-source-note");
  if (modeLabel) modeLabel.textContent = mode;
  if (noteLabel) noteLabel.textContent = note;
}

function normalizeImpact(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("3") || text.includes("high") || text.includes("bull")) return "high";
  if (text.includes("2") || text.includes("medium") || text.includes("moderate")) return "medium";
  return "low";
}

function normalizeCalendarEvent(item) {
  return {
    time: item.time || item.event_time || item.date_time?.slice(11, 16) || "--:--",
    currency: String(item.currency || item.country_code || item.currency_code || "USD").toUpperCase(),
    impact: normalizeImpact(item.impact || item.importance || item.volatility),
    event: item.event || item.title || item.name || "Economic Event",
    actual: item.actual ?? item.actual_value ?? "-",
    forecast: item.forecast ?? item.forecast_value ?? "-",
    previous: item.previous ?? item.previous_value ?? "-",
    country: item.country || item.zone || item.region || "Global",
  };
}

async function fetchCalendarEvents() {
  const config = await loadCalendarConfig();
  const apiUrl = config.calendarApiUrl;

  if (!apiUrl) {
    calendarEvents = fallbackEvents;
    calendarMode = "Demo Mode";
    setCalendarStatus("Demo Mode", "Isi calendar-config.js untuk mengaktifkan data real dari proxy.");
    return;
  }

  try {
    setCalendarStatus("Loading Live Data", "Mengambil data dari backend proxy...");
    const url = new URL(apiUrl);
    url.searchParams.set("range", calendarRange);
    url.searchParams.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta");

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload.events || payload.data || [];
    calendarEvents = rows.map(normalizeCalendarEvent);
    calendarMode = "Live Data";
    setCalendarStatus("Live Data", payload.source ? `Source: ${payload.source}` : "Data aktif dari backend proxy.");
  } catch (error) {
    console.warn("Calendar live fetch failed:", error.message);
    calendarEvents = fallbackEvents;
    calendarMode = "Demo Fallback";
    setCalendarStatus("Demo Fallback", `Proxy gagal: ${error.message}. Menampilkan sample data.`);
  }
}

function getSessionFromTime(time) {
  const hour = Number(String(time).split(":")[0]);
  if (hour >= 6 && hour < 14) return "asia";
  if (hour >= 14 && hour < 20) return "london";
  return "new-york";
}

function renderCalendar() {
  const list = $("#calendar-list");
  if (!list) return;

  const search = $("#calendar-search")?.value.trim().toLowerCase() || "";
  const currency = $("#calendar-currency")?.value || "all";
  const impact = $("#calendar-impact")?.value || "all";
  const session = $("#calendar-session")?.value || "all";

  const filtered = calendarEvents.filter((item) => {
    const matchSearch = !search || `${item.event} ${item.currency} ${item.country}`.toLowerCase().includes(search);
    const matchCurrency = currency === "all" || item.currency === currency;
    const matchImpact = impact === "all" || item.impact === impact;
    const matchSession = session === "all" || getSessionFromTime(item.time) === session;
    return matchSearch && matchCurrency && matchImpact && matchSession;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">Tidak ada news sesuai filter.</div>`;
    return;
  }

  list.innerHTML = filtered.map((item) => `<div class="calendar-row">
    <span class="calendar-time">${item.time}</span>
    <span class="calendar-currency">${item.currency}</span>
    <span class="calendar-impact ${item.impact}">${item.impact}</span>
    <span class="calendar-event"><strong>${item.event}</strong><small>${item.country}</small></span>
    <span class="calendar-number">${item.actual}</span>
    <span class="calendar-number">${item.forecast}</span>
    <span class="calendar-number">${item.previous}</span>
  </div>`).join("");
}

async function refreshCalendar() {
  await fetchCalendarEvents();
  renderCalendar();
}

function showSection(sectionId) {
  $$(".workspace-section").forEach((section) => section.classList.toggle("hidden", section.id !== sectionId));
  $$(".nav-item").forEach((item) => {
    const active = item.dataset.section === sectionId;
    item.classList.toggle("active", active);
    if (active) {
      const label = item.dataset.label || item.textContent.trim();
      const icon = item.dataset.icon || "circle";
      setHeader(label, icon);
    }
  });
  $(".compact-nav")?.classList.remove("open");
  $("#nav-dropdown-toggle")?.setAttribute("aria-expanded", "false");
  window.lucide?.createIcons();
}

function setHeader(label, icon) {
  const title = $("#welcome-title");
  const activeLabel = $("#active-nav-label");
  const activeIcon = $("#active-nav-icon");
  if (title) title.textContent = label === "Performance" ? "Performance Dashboard" : label;
  if (activeLabel) activeLabel.textContent = label;
  if (activeIcon) activeIcon.setAttribute("data-lucide", icon);
}

function bindCalendarUI() {
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".nav-item[data-section]");
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    showSection(item.dataset.section);
  }, true);

  ["#calendar-search", "#calendar-currency", "#calendar-impact", "#calendar-session"].forEach((selector) => {
    document.addEventListener("input", (event) => { if (event.target.matches(selector)) renderCalendar(); });
    document.addEventListener("change", (event) => { if (event.target.matches(selector)) renderCalendar(); });
  });

  document.addEventListener("click", async (event) => {
    const range = event.target.closest(".calendar-range");
    if (!range) return;
    $$(".calendar-range").forEach((button) => button.classList.remove("active"));
    range.classList.add("active");
    calendarRange = range.dataset.range || "today";
    await refreshCalendar();
  });

  document.addEventListener("click", async (event) => {
    if (event.target.closest("#calendar-refresh")) await refreshCalendar();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(async () => {
    injectCalendarUI();
    addCalendarStyles();
    bindCalendarUI();
    await refreshCalendar();
    window.lucide?.createIcons();
  }, 800);
});
