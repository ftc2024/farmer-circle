const $live = (selector) => document.querySelector(selector);
const $$live = (selector) => Array.from(document.querySelectorAll(selector));

let liveCalendarEvents = [];
let liveCalendarRange = "today";
let liveCalendarApiUrl = "";

async function deriveCalendarApiUrl() {
  if (liveCalendarApiUrl) return liveCalendarApiUrl;

  const configured = window.FARMER_CIRCLE_CONFIG?.calendarApiUrl;
  if (configured) {
    liveCalendarApiUrl = configured;
    return liveCalendarApiUrl;
  }

  const source = await fetch(`./app.js?v=${Date.now()}`, { cache: "no-store" }).then((response) => response.text());
  const supabaseUrl = source.match(/const\s+SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];

  if (!supabaseUrl) throw new Error("SUPABASE_URL tidak ditemukan di app.js.");

  const parsed = new URL(supabaseUrl);
  const projectRef = parsed.hostname.split(".")[0];
  liveCalendarApiUrl = `https://${projectRef}.functions.supabase.co/economic-calendar`;
  return liveCalendarApiUrl;
}

function liveStatus(mode, note) {
  const modeEl = $live("#calendar-mode-label");
  const noteEl = $live("#calendar-source-note");
  if (modeEl) modeEl.textContent = mode;
  if (noteEl) noteEl.textContent = note;
}

function normalizeImpact(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("high") || text.includes("3")) return "high";
  if (text.includes("medium") || text.includes("2")) return "medium";
  return "low";
}

function normalizeEvent(item) {
  return {
    date: item.date || "",
    time: item.time || item.event_time || item.date_time?.slice(11, 16) || "--:--",
    currency: String(item.currency || item.country_code || item.currency_code || "USD").toUpperCase(),
    impact: normalizeImpact(item.impact || item.importance || item.volatility),
    event: item.event || item.title || item.name || "Economic Event",
    actual: item.actual ?? item.actual_value ?? "-",
    forecast: item.forecast ?? item.forecast_value ?? item.estimate ?? "-",
    previous: item.previous ?? item.previous_value ?? item.prev ?? "-",
    country: item.country || item.zone || item.region || "Global",
  };
}

function getSessionFromTime(time) {
  const hour = Number(String(time).split(":")[0]);
  if (Number.isNaN(hour)) return "all-day";
  if (hour >= 6 && hour < 14) return "asia";
  if (hour >= 14 && hour < 20) return "london";
  return "new-york";
}

function renderLiveCalendar() {
  const list = $live("#calendar-list");
  if (!list) return;

  const search = $live("#calendar-search")?.value.trim().toLowerCase() || "";
  const currency = $live("#calendar-currency")?.value || "all";
  const impact = $live("#calendar-impact")?.value || "all";
  const session = $live("#calendar-session")?.value || "all";

  const filtered = liveCalendarEvents.filter((item) => {
    const matchSearch = !search || `${item.event} ${item.currency} ${item.country}`.toLowerCase().includes(search);
    const matchCurrency = currency === "all" || item.currency === currency;
    const matchImpact = impact === "all" || item.impact === impact;
    const itemSession = getSessionFromTime(item.time);
    const matchSession = session === "all" || itemSession === "all-day" || itemSession === session;
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
    <span class="calendar-event"><strong>${item.event}</strong><small>${item.date ? `${item.date} · ` : ""}${item.country}</small></span>
    <span class="calendar-number">${item.actual}</span>
    <span class="calendar-number">${item.forecast}</span>
    <span class="calendar-number">${item.previous}</span>
  </div>`).join("");
}

async function fetchLiveCalendar() {
  try {
    const list = $live("#calendar-list");
    if (list) list.innerHTML = `<div class="empty-state">Mengambil live economic calendar...</div>`;
    liveStatus("Loading Live Data", "Menghubungkan ke Farmer Circle backend...");

    const apiUrl = await deriveCalendarApiUrl();
    const url = new URL(apiUrl);
    url.searchParams.set("range", liveCalendarRange);
    url.searchParams.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta");

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload.events || payload.data || [];
    liveCalendarEvents = rows.map(normalizeEvent);

    const updated = payload.updated_at ? new Date(payload.updated_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "baru saja";
    if (payload.mode === "live") {
      liveStatus("Live Data", `${payload.source || "Economic calendar backend aktif."} · Update ${updated}`);
    } else if (payload.mode === "fallback") {
      liveStatus("Fallback Data", `${payload.errors?.join(" | ") || "Source utama gagal."} · Update ${updated}`);
    } else {
      liveStatus("Backend Sample", payload.error ? `Backend aktif, source error: ${payload.error}` : "Backend aktif, source belum mengirim data live.");
    }

    renderLiveCalendar();
  } catch (error) {
    liveStatus("Backend Offline", error.message || "Gagal mengambil data backend.");
  }
}

function bindLiveCalendar() {
  document.addEventListener("click", async (event) => {
    const range = event.target.closest(".calendar-range");
    if (!range) return;
    liveCalendarRange = range.dataset.range || "today";
    setTimeout(fetchLiveCalendar, 50);
  }, true);

  document.addEventListener("click", async (event) => {
    if (event.target.closest("#calendar-refresh")) {
      event.preventDefault();
      event.stopPropagation();
      await fetchLiveCalendar();
    }
  }, true);

  ["#calendar-search", "#calendar-currency", "#calendar-impact", "#calendar-session"].forEach((selector) => {
    document.addEventListener("input", (event) => {
      if (event.target.matches(selector)) renderLiveCalendar();
    }, true);
    document.addEventListener("change", (event) => {
      if (event.target.matches(selector)) renderLiveCalendar();
    }, true);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  bindLiveCalendar();
  setTimeout(fetchLiveCalendar, 1600);
});
