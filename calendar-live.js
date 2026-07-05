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

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
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
    datetime: item.datetime || item.datetime_utc || item.date_time || item.timestamp || "",
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

function selectedValues(className) {
  const checked = $$live(`.${className}:checked`).map((item) => item.value);
  if (!checked.length || checked.includes("all")) return ["all"];
  return checked;
}

function selectedTimezoneOffset() {
  const value = $live("#calendar-timezone")?.value || "auto";
  if (value === "auto") return -new Date().getTimezoneOffset() / 60;
  return Number(value);
}

function timezoneLabel() {
  const value = $live("#calendar-timezone")?.value || "auto";
  const offset = selectedTimezoneOffset();
  const sign = offset >= 0 ? "+" : "";
  return value === "auto" ? `Local GMT${sign}${offset}` : `GMT${sign}${offset}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function monthLabel(monthIndex) {
  return ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][monthIndex];
}

function dayLabel(dayIndex) {
  return ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][dayIndex];
}

function localTodayDate() {
  const offset = selectedTimezoneOffset();
  const shifted = new Date(Date.now() + offset * 60 * 60 * 1000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function shortDate(date) {
  return `${date.getUTCDate()} ${monthLabel(date.getUTCMonth())}`;
}

function longDate(date) {
  return `${dayLabel(date.getUTCDay())}, ${date.getUTCDate()} ${monthLabel(date.getUTCMonth())} ${date.getUTCFullYear()}`;
}

function weekWindow() {
  const today = localTodayDate();
  const day = today.getUTCDay();
  const diffToMonday = day === 0 ? 1 : 1 - day;
  const monday = addDays(today, diffToMonday);
  const saturday = addDays(monday, 5);
  return { monday, saturday };
}

function updateRangeLabels() {
  const today = localTodayDate();
  const tomorrow = addDays(today, 1);
  const { monday, saturday } = weekWindow();
  const todayButton = $live(".calendar-range[data-range='today']");
  const tomorrowButton = $live(".calendar-range[data-range='tomorrow']");
  const weekButton = $live(".calendar-range[data-range='week']");
  if (todayButton) todayButton.textContent = `Today · ${shortDate(today)}`;
  if (tomorrowButton) tomorrowButton.textContent = `Tomorrow · ${shortDate(tomorrow)}`;
  if (weekButton) weekButton.textContent = `This Week · ${shortDate(monday)}–${shortDate(saturday)}`;
}

function parseAmPmTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = match[3].toLowerCase();
  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

function parseHourMinute(value) {
  const text = String(value || "").trim();
  if (!text || /all\s*day|tentative/i.test(text)) return null;

  const ampm = parseAmPmTime(text);
  if (ampm) return ampm;

  const match = text.match(/^(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function parseDateTimeAsUTC(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  if (/Z$|[+-]\d{2}:?\d{2}$/.test(text)) {
    const direct = new Date(text);
    return Number.isNaN(direct.getTime()) ? null : direct;
  }

  const normalized = text.includes("T") ? `${text}Z` : text.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatEventTime(item) {
  const rawTime = String(item.time || "");
  if (/all\s*day|tentative/i.test(rawTime)) return rawTime;

  const offset = selectedTimezoneOffset();
  const date = parseDateTimeAsUTC(item.datetime);
  if (date) {
    const shifted = new Date(date.getTime() + offset * 60 * 60 * 1000);
    return `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
  }

  const parsed = parseHourMinute(item.time);
  if (!parsed) return item.time || "--:--";
  return `${pad2(parsed.hour)}:${pad2(parsed.minute)}`;
}

function displayEventDate(item) {
  if (item.datetime) {
    const offset = selectedTimezoneOffset();
    const date = parseDateTimeAsUTC(item.datetime);
    if (date) {
      const shifted = new Date(date.getTime() + offset * 60 * 60 * 1000);
      return shifted.toISOString().slice(0, 10);
    }
  }
  return item.date || "";
}

function getSessionFromTime(time) {
  const parsed = parseHourMinute(time);
  if (!parsed) return "all-day";
  const hour = parsed.hour;
  if (hour >= 6 && hour < 14) return "asia";
  if (hour >= 14 && hour < 20) return "london";
  return "new-york";
}

function updateFilterSummaries() {
  const currencies = selectedValues("calendar-currency-option");
  const impacts = selectedValues("calendar-impact-option");
  const currencySummary = $live("#calendar-currency-summary");
  const impactSummary = $live("#calendar-impact-summary");
  if (currencySummary) currencySummary.textContent = currencies.includes("all") ? "Semua currency" : currencies.join(", ");
  if (impactSummary) impactSummary.textContent = impacts.includes("all") ? "Semua impact" : impacts.map((x) => x[0].toUpperCase() + x.slice(1)).join(", ");
}

function dateHeading(dateKey) {
  if (!dateKey) return "Tanpa tanggal";
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return longDate(date);
}

function calendarRow(item) {
  const displayTime = formatEventTime(item);
  const displayDate = displayEventDate(item);
  return `<div class="calendar-row">
    <span class="calendar-time">${escapeHTML(displayTime)}</span>
    <span class="calendar-currency">${escapeHTML(item.currency)}</span>
    <span class="calendar-impact ${escapeHTML(item.impact)}">${escapeHTML(item.impact)}</span>
    <span class="calendar-event"><strong>${escapeHTML(item.event)}</strong><small>${displayDate ? `${escapeHTML(displayDate)} · ` : ""}${escapeHTML(item.country)} · ${escapeHTML(timezoneLabel())}</small></span>
    <span class="calendar-number">${escapeHTML(item.actual)}</span>
    <span class="calendar-number">${escapeHTML(item.forecast)}</span>
    <span class="calendar-number">${escapeHTML(item.previous)}</span>
  </div>`;
}

function renderLiveCalendar() {
  const list = $live("#calendar-list");
  if (!list) return;

  updateRangeLabels();
  updateFilterSummaries();

  const search = $live("#calendar-search")?.value.trim().toLowerCase() || "";
  const currencies = selectedValues("calendar-currency-option");
  const impacts = selectedValues("calendar-impact-option");
  const session = $live("#calendar-session")?.value || "all";

  const filtered = liveCalendarEvents
    .filter((item) => {
      const displayTime = formatEventTime(item);
      const matchSearch = !search || `${item.event} ${item.currency} ${item.country}`.toLowerCase().includes(search);
      const matchCurrency = currencies.includes("all") || currencies.includes(item.currency);
      const matchImpact = impacts.includes("all") || impacts.includes(item.impact);
      const itemSession = getSessionFromTime(displayTime);
      const matchSession = session === "all" || itemSession === "all-day" || itemSession === session;
      return matchSearch && matchCurrency && matchImpact && matchSession;
    })
    .sort((a, b) => {
      const dateCompare = displayEventDate(a).localeCompare(displayEventDate(b));
      if (dateCompare !== 0) return dateCompare;
      return formatEventTime(a).localeCompare(formatEventTime(b));
    });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">Tidak ada news sesuai filter/range ini.</div>`;
    return;
  }

  if (liveCalendarRange === "week") {
    let currentDate = "";
    list.innerHTML = filtered.map((item) => {
      const itemDate = displayEventDate(item);
      const divider = itemDate !== currentDate ? `<div class="calendar-date-divider">${escapeHTML(dateHeading(itemDate))}</div>` : "";
      currentDate = itemDate;
      return `${divider}${calendarRow(item)}`;
    }).join("");
    return;
  }

  list.innerHTML = filtered.map(calendarRow).join("");
}

async function fetchLiveCalendar() {
  try {
    updateRangeLabels();
    const list = $live("#calendar-list");
    if (list) list.innerHTML = `<div class="empty-state">Mengambil live economic calendar...</div>`;
    liveStatus("Loading Live Data", "Menghubungkan ke Farmer Circle backend...");

    const apiUrl = await deriveCalendarApiUrl();
    const url = new URL(apiUrl);
    url.searchParams.set("range", liveCalendarRange);
    url.searchParams.set("timezone", timezoneLabel());

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload.events || payload.data || [];
    liveCalendarEvents = rows.map(normalizeEvent);

    const updated = payload.updated_at ? new Date(payload.updated_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", hour12: false }) : "baru saja";
    if (payload.mode === "live") {
      liveStatus("Live Data", `${payload.source || "Economic calendar backend aktif."} · ${timezoneLabel()} · Update ${updated}`);
    } else if (payload.mode === "fallback") {
      liveStatus("Fallback Data", `${payload.errors?.join(" | ") || "Source utama gagal."} · ${timezoneLabel()} · Update ${updated}`);
    } else {
      liveStatus("Backend Sample", payload.error ? `Backend aktif, source error: ${payload.error}` : `Backend aktif, source belum mengirim data live. · ${timezoneLabel()}`);
    }

    renderLiveCalendar();
  } catch (error) {
    liveStatus("Backend Offline", error.message || "Gagal mengambil data backend.");
  }
}

function syncAllCheckboxGroup(changed, groupClass) {
  const allBox = $live(`.${groupClass}[value="all"]`);
  const boxes = $$live(`.${groupClass}`).filter((box) => box.value !== "all");

  if (changed.value === "all") {
    boxes.forEach((box) => { box.checked = false; });
    allBox.checked = true;
    return;
  }

  if (changed.checked) allBox.checked = false;
  if (!boxes.some((box) => box.checked)) allBox.checked = true;
}

function bindLiveCalendar() {
  document.addEventListener("change", (event) => {
    if (event.target.matches(".calendar-currency-option")) {
      syncAllCheckboxGroup(event.target, "calendar-currency-option");
      renderLiveCalendar();
    }
    if (event.target.matches(".calendar-impact-option")) {
      syncAllCheckboxGroup(event.target, "calendar-impact-option");
      renderLiveCalendar();
    }
    if (event.target.matches("#calendar-timezone")) fetchLiveCalendar();
  }, true);

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

  ["#calendar-search", "#calendar-session"].forEach((selector) => {
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
  setTimeout(() => {
    updateRangeLabels();
    fetchLiveCalendar();
  }, 1600);
});
