const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

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
              <p>Kalender ekonomi versi Farmer Circle. Bisa multi-filter currency dan impact, plus timezone member.</p>
            </div>
            <div class="calendar-source-card">
              <span>DATA MODE</span>
              <strong id="calendar-mode-label">Loading...</strong>
              <small id="calendar-source-note">Mengecek backend calendar...</small>
            </div>
          </div>

          <div class="calendar-filters pro-calendar-filters">
            <label class="calendar-search-field">
              <span>Search News</span>
              <input id="calendar-search" type="search" placeholder="Cari NFP, CPI, FOMC..." />
            </label>

            <div class="calendar-filter-block calendar-multi" id="calendar-currency-filter">
              <span>Currency</span>
              <button class="calendar-multi-trigger" type="button" data-calendar-menu="currency">
                <strong id="calendar-currency-summary">Semua currency</strong>
                <i data-lucide="chevron-down"></i>
              </button>
              <div class="calendar-multi-menu" data-calendar-panel="currency">
                <label><input class="calendar-currency-option" type="checkbox" value="all" checked /> Semua currency</label>
                <label><input class="calendar-currency-option" type="checkbox" value="USD" /> USD</label>
                <label><input class="calendar-currency-option" type="checkbox" value="EUR" /> EUR</label>
                <label><input class="calendar-currency-option" type="checkbox" value="GBP" /> GBP</label>
                <label><input class="calendar-currency-option" type="checkbox" value="JPY" /> JPY</label>
                <label><input class="calendar-currency-option" type="checkbox" value="AUD" /> AUD</label>
                <label><input class="calendar-currency-option" type="checkbox" value="CAD" /> CAD</label>
                <label><input class="calendar-currency-option" type="checkbox" value="CHF" /> CHF</label>
                <label><input class="calendar-currency-option" type="checkbox" value="NZD" /> NZD</label>
                <label><input class="calendar-currency-option" type="checkbox" value="CNY" /> CNY</label>
              </div>
            </div>

            <div class="calendar-filter-block calendar-multi" id="calendar-impact-filter">
              <span>Impact</span>
              <button class="calendar-multi-trigger" type="button" data-calendar-menu="impact">
                <strong id="calendar-impact-summary">Semua impact</strong>
                <i data-lucide="chevron-down"></i>
              </button>
              <div class="calendar-multi-menu" data-calendar-panel="impact">
                <label><input class="calendar-impact-option" type="checkbox" value="all" checked /> Semua impact</label>
                <label><input class="calendar-impact-option" type="checkbox" value="high" /> High impact</label>
                <label><input class="calendar-impact-option" type="checkbox" value="medium" /> Medium impact</label>
                <label><input class="calendar-impact-option" type="checkbox" value="low" /> Low impact</label>
              </div>
            </div>

            <label class="calendar-filter-block">
              <span>Timezone</span>
              <select id="calendar-timezone">
                <option value="auto">Local time</option>
                <option value="7" selected>GMT+7 Jakarta</option>
                <option value="8">GMT+8 Singapore</option>
                <option value="9">GMT+9 Tokyo</option>
                <option value="0">GMT+0 London</option>
                <option value="-4">GMT-4 New York DST</option>
                <option value="-5">GMT-5 New York</option>
              </select>
            </label>

            <label class="calendar-filter-block">
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
    .calendar-source-card span, .calendar-table-head, .calendar-impact, .calendar-range, .calendar-filter-block > span, .calendar-search-field > span, .calendar-date-divider { font-family: "JetBrains Mono", monospace; text-transform: uppercase; letter-spacing: .1em; }
    .calendar-source-card span { color: var(--cyan); font-size: .66rem; font-weight: 900; }
    .calendar-source-card small { color: var(--muted); line-height: 1.45; }
    .calendar-filters { display: grid; grid-template-columns: minmax(220px,1.35fr) repeat(4,minmax(150px,.75fr)); gap: 14px; padding: 16px; }
    .calendar-filter-block, .calendar-search-field { display: grid; gap: 8px; min-width: 0; position: relative; }
    .calendar-filter-block > span, .calendar-search-field > span { color: #9fb0e0; font-size: .68rem; font-weight: 900; }
    .calendar-multi-trigger { width: 100%; min-height: 43px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 13px; border: 1px solid var(--line); border-radius: 10px; color: var(--text); background: #10162a; font-weight: 900; }
    .calendar-multi-trigger:hover, .calendar-multi.open .calendar-multi-trigger { border-color: rgba(37,212,206,.42); background: rgba(18,29,48,.9); }
    .calendar-multi-trigger strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .83rem; }
    .calendar-multi-menu { position: absolute; z-index: 80; top: calc(100% + 8px); left: 0; right: 0; display: none; max-height: 260px; overflow: auto; padding: 8px; border: 1px solid rgba(150,165,210,.22); border-radius: 12px; background: rgba(7,10,22,.98); box-shadow: 0 24px 60px rgba(0,0,0,.45); backdrop-filter: blur(16px); }
    .calendar-multi.open .calendar-multi-menu { display: grid; gap: 4px; }
    .calendar-multi-menu label { display: flex; align-items: center; gap: 8px; padding: 9px 8px; border-radius: 9px; color: var(--text); font-size: .83rem; cursor: pointer; }
    .calendar-multi-menu label:hover { background: rgba(37,212,206,.08); }
    .calendar-multi-menu input { width: 15px; min-height: 15px; accent-color: var(--cyan); }
    .calendar-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px; }
    .calendar-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
    .calendar-range { min-height: 36px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; color: var(--muted); background: rgba(255,255,255,.035); font-size: .68rem; font-weight: 900; }
    .calendar-range.active, .calendar-range:hover { color: var(--text); border-color: rgba(37,212,206,.35); background: rgba(37,212,206,.1); }
    .calendar-table-card { overflow: hidden; }
    .calendar-table-head, .calendar-row { display: grid; grid-template-columns: 90px 100px 120px minmax(240px,1fr) 100px 110px 110px; gap: 12px; align-items: center; }
    .calendar-table-head { padding: 13px 16px; color: var(--low); border-bottom: 1px solid var(--line); font-size: .66rem; font-weight: 900; }
    .calendar-list { display: grid; }
    .calendar-date-divider { display: flex; align-items: center; gap: 12px; min-height: 42px; padding: 12px 16px; color: var(--cyan); background: linear-gradient(90deg, rgba(37,212,206,.12), rgba(117,92,246,.08)); border-top: 1px solid rgba(37,212,206,.16); border-bottom: 1px solid rgba(37,212,206,.12); font-size: .7rem; font-weight: 900; }
    .calendar-date-divider::before { content: ""; width: 22px; height: 1px; background: var(--cyan); box-shadow: 0 0 12px rgba(37,212,206,.6); }
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
    @media (max-width: 1260px) { .calendar-filters { grid-template-columns: repeat(2,minmax(0,1fr)); } .calendar-search-field { grid-column: span 2; } }
    @media (max-width: 1100px) { .calendar-table-card { overflow-x: auto; } .calendar-table-head, .calendar-row { min-width: 1000px; } }
    @media (max-width: 640px) { .calendar-hero, .calendar-toolbar { flex-direction: column; align-items: stretch; } .calendar-source-card { min-width: 0; } .calendar-filters { grid-template-columns: 1fr; } .calendar-search-field { grid-column: auto; } }
  `;
  document.head.appendChild(style);
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

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".calendar-multi-trigger");
    if (trigger) {
      const parent = trigger.closest(".calendar-multi");
      const isOpen = parent?.classList.contains("open");
      $$(".calendar-multi").forEach((item) => item.classList.remove("open"));
      parent?.classList.toggle("open", !isOpen);
      return;
    }
    if (!event.target.closest(".calendar-multi")) $$(".calendar-multi").forEach((item) => item.classList.remove("open"));
  });

  document.addEventListener("click", (event) => {
    const range = event.target.closest(".calendar-range");
    if (!range) return;
    $$(".calendar-range").forEach((button) => button.classList.remove("active"));
    range.classList.add("active");
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    injectCalendarUI();
    addCalendarStyles();
    bindCalendarUI();
    window.lucide?.createIcons();
  }, 800);
});
