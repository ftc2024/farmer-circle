import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://nsnjgfcuuesqibmpbiuv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbmpnZmN1dWVzcWlibXBiaXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcwMTEsImV4cCI6MjA5ODcxMzAxMX0.FdsZBJUeSh1b5BmxrxXdkkQbVfKevRToO90YFl7PsnY";
const JOURNAL_META_VERSION = "fcj_supabase_v1";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
});

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const PAIR_DATA = {
  forex: {
    label: "Forex",
    pairs: ["EUR/USD", "GBP/USD", "USD/JPY", "GBP/JPY", "USD/CAD", "AUD/USD", "NZD/USD", "EUR/GBP", "EUR/JPY", "AUD/JPY", "USD/CHF", "EUR/CHF", "CAD/JPY", "GBP/CAD", "EUR/AUD"],
    pipFactor: (pair) => pair.includes("JPY") ? 100 : 10000,
  },
  commodity: {
    label: "Commodity",
    pairs: ["XAU/USD", "XAG/USD"],
    pipFactor: (pair) => pair === "XAU/USD" ? 10 : 100,
  },
  index: {
    label: "Index",
    pairs: ["US30", "NASDAQ", "USOIL"],
    pipFactor: () => 1,
  },
  crypto: {
    label: "Crypto",
    pairs: ["BTC/USD", "DOGE/USD", "SOL/USD", "TRX/USD"],
    pipFactor: (pair) => pair === "BTC/USD" ? 1 : 10000,
  },
};

const PIP_VALUE_PER_LOT = {
  "EUR/USD": 10, "GBP/USD": 10, "AUD/USD": 10, "NZD/USD": 10, "EUR/GBP": 10, "GBP/CAD": 10, "EUR/AUD": 10,
  "USD/JPY": 9.3, "GBP/JPY": 9.3, "EUR/JPY": 9.3, "AUD/JPY": 9.3, "CAD/JPY": 9.3,
  "USD/CAD": 10, "USD/CHF": 10, "EUR/CHF": 10,
  "XAU/USD": 1, "XAG/USD": 0.5,
  "US30": 1, "NASDAQ": 1, "USOIL": 1,
  "BTC/USD": 1, "DOGE/USD": 1, "SOL/USD": 1, "TRX/USD": 1,
};

const state = {
  session: null,
  trades: [],
  direction: "",
  emotion: "",
  outcome: "",
  currentFilter: "All",
  editingId: "",
  ready: false,
};

function esc(value = "") {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fmtMoney(value) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+$" : "-$"}${Math.abs(n).toFixed(2)}`;
}

function fmtSigned(value, suffix = "") {
  const n = Number(value || 0);
  return `${n > 0 ? "+" : ""}${Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, "") : "0"}${suffix}`;
}

function parseMeta(notes) {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && parsed._journalMeta === JOURNAL_META_VERSION ? parsed : {};
  } catch {
    return { legacyNotes: notes };
  }
}

function dbDirectionToJournal(direction) {
  if (direction === "short" || direction === "SELL") return "SELL";
  return "BUY";
}

function journalDirectionToDb(direction) {
  return direction === "SELL" ? "short" : "long";
}

function normalizeTrade(row) {
  const meta = parseMeta(row.notes);
  const direction = meta.direction || dbDirectionToJournal(row.direction);
  const pnl = Number(meta.pnl ?? row.result_r ?? 0);
  const outcome = meta.outcome || (pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven");
  const entry = Number(meta.entry ?? row.entry_price ?? 0);
  const exit = Number(meta.exit ?? 0);
  const sl = Number(meta.sl ?? row.stop_loss ?? 0);
  const tp = Number(meta.tp ?? row.take_profit ?? 0);

  return {
    dbId: row.id,
    createdAt: row.created_at,
    date: row.trade_date,
    session: meta.session || row.setup || "—",
    pair: meta.pair || row.pair || "—",
    category: meta.category || inferCategory(row.pair),
    lot: Number(meta.lot ?? 0),
    direction,
    entry,
    sl,
    tp,
    exit,
    pnl,
    balanceBefore: Number(meta.balanceBefore ?? 0),
    balanceAfter: Number(meta.balanceAfter ?? 0),
    pips: Number(meta.pips ?? calcPips(entry, exit, row.pair, direction) ?? 0),
    rrPlan: meta.rrPlan ?? calcRRPlan(entry, sl, tp),
    rrActual: meta.rrActual ?? calcRRActual(entry, sl, exit, direction),
    pct: meta.pct ?? null,
    emotion: meta.emotion || "—",
    outcome,
    reason: meta.reason || row.setup || "",
    notes: meta.review || meta.legacyNotes || "",
  };
}

function inferCategory(pair) {
  for (const [category, data] of Object.entries(PAIR_DATA)) {
    if (data.pairs.includes(pair)) return category;
  }
  return "forex";
}

function getPipFactor(pair) {
  for (const data of Object.values(PAIR_DATA)) {
    if (data.pairs.includes(pair)) return data.pipFactor(pair);
  }
  return 10000;
}

function calcPips(entry, exit, pair, direction) {
  if (!entry || !exit || !pair || !direction) return null;
  const rawDiff = direction === "SELL" ? entry - exit : exit - entry;
  return Number((rawDiff * getPipFactor(pair)).toFixed(1));
}

function calcAutoPnl(entry, exit, lot, pair, direction) {
  const pips = calcPips(entry, exit, pair, direction);
  if (pips === null || !lot) return null;
  const pipValue = PIP_VALUE_PER_LOT[pair] ?? 10;
  return Number((pips * pipValue * lot).toFixed(2));
}

function calcRRPlan(entry, sl, tp) {
  if (!entry || !sl || !tp) return null;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  return risk > 0 ? Number((reward / risk).toFixed(2)) : null;
}

function calcRRActual(entry, sl, exit, direction) {
  if (!entry || !sl || !exit || !direction) return null;
  const risk = Math.abs(entry - sl);
  const reward = direction === "SELL" ? entry - exit : exit - entry;
  return risk > 0 ? Number((reward / risk).toFixed(2)) : null;
}

function injectJournalStyles() {
  if ($("#trade-journal-upgrade-style")) return;
  const style = document.createElement("style");
  style.id = "trade-journal-upgrade-style";
  style.textContent = `
    .tj-shell{display:grid;gap:20px}.tj-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:20px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(135deg,rgba(117,92,246,.16),rgba(37,212,206,.08));box-shadow:var(--shadow)}.tj-hero h3{font-size:1.4rem}.tj-hero p{margin:6px 0 0;color:var(--muted);line-height:1.6}.tj-sync{font-family:"JetBrains Mono",monospace;font-size:.72rem;color:var(--cyan);text-transform:uppercase;letter-spacing:.12em}.tj-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.tj-stat{padding:16px;border:1px solid var(--line);border-radius:14px;background:rgba(16,22,42,.72)}.tj-stat span{display:block;margin-bottom:6px;color:var(--muted);font-family:"JetBrains Mono",monospace;font-size:.68rem;text-transform:uppercase;letter-spacing:.1em}.tj-stat strong{font-size:1.4rem}.tj-stat small{display:block;margin-top:4px;color:var(--low)}.tj-grid{display:grid;grid-template-columns:minmax(340px,480px) minmax(0,1fr);gap:22px;align-items:start}.tj-card{padding:20px;border:1px solid var(--line);border-radius:16px;background:rgba(16,22,42,.74);box-shadow:var(--shadow)}.tj-section-title{display:flex;align-items:center;gap:10px;margin:4px 0 14px;color:var(--cyan);font-family:"JetBrains Mono",monospace;font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.tj-section-title:after{content:"";height:1px;flex:1;background:var(--line)}.tj-form{display:grid;gap:16px}.tj-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.tj-form-grid.three{grid-template-columns:repeat(3,1fr)}.tj-full{grid-column:1/-1}.tj-label{display:grid;gap:8px;color:var(--muted);font-size:.78rem;font-weight:800}.tj-label b{color:var(--cyan);font-weight:900}.tj-select-display{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:43px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#10162a}.tj-select-display strong{color:var(--cyan)}.tj-mini-btn{min-height:34px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;color:var(--muted);background:rgba(255,255,255,.04);font-weight:800}.tj-mini-btn:hover{color:var(--cyan);background:rgba(37,212,206,.1)}.tj-toggle,.tj-emotions,.tj-outcomes{display:grid;gap:8px}.tj-toggle,.tj-outcomes{grid-template-columns:1fr 1fr}.tj-outcomes{grid-template-columns:repeat(3,1fr)}.tj-emotions{grid-template-columns:repeat(auto-fit,minmax(108px,1fr))}.tj-pill{min-height:42px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;color:var(--muted);background:#10162a;font-weight:900}.tj-pill:hover{border-color:var(--line-strong);color:var(--text)}.tj-pill.active{color:#07101a;background:linear-gradient(135deg,var(--purple),var(--blue) 48%,var(--cyan));box-shadow:0 14px 30px rgba(37,212,206,.12)}.tj-pill.sell.active,.tj-pill.loss.active{color:#1a0808;background:linear-gradient(135deg,#ff7070,#d6a74d)}.tj-pill.win.active{color:#07101a;background:linear-gradient(135deg,var(--cyan),#6dffcb)}.tj-pill.be.active{color:#07101a;background:linear-gradient(135deg,var(--blue),var(--cyan))}.tj-calc{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.tj-calc-box{padding:12px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.035)}.tj-calc-box span{display:block;margin-bottom:5px;color:var(--low);font-family:"JetBrains Mono",monospace;font-size:.65rem;text-transform:uppercase}.tj-calc-box strong{color:var(--cyan);font-family:"JetBrains Mono",monospace}.tj-actions{display:flex;gap:10px;align-items:center}.tj-actions .primary-button{width:auto;flex:1}.tj-actions .ghost-button{width:auto}.tj-message{min-height:20px;margin:0;color:var(--cyan);font-weight:800}.tj-error{min-height:20px;margin:0;color:var(--danger);font-weight:800}.tj-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px}.tj-filters{display:flex;flex-wrap:wrap;gap:8px}.tj-filter{min-height:34px;padding:7px 12px;border:1px solid var(--line);border-radius:999px;color:var(--muted);background:rgba(255,255,255,.04);font-size:.78rem;font-weight:800}.tj-filter.active,.tj-filter:hover{color:var(--cyan);border-color:rgba(37,212,206,.38);background:rgba(37,212,206,.1)}.tj-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px;background:rgba(8,11,22,.55)}.tj-table{width:100%;border-collapse:collapse;min-width:980px}.tj-table th,.tj-table td{padding:12px 13px;border-bottom:1px solid rgba(150,165,210,.1);text-align:left;white-space:nowrap}.tj-table th{color:var(--low);font-family:"JetBrains Mono",monospace;font-size:.66rem;text-transform:uppercase;letter-spacing:.1em}.tj-table td{color:var(--muted);font-family:"JetBrains Mono",monospace;font-size:.78rem}.tj-table tr:hover td{background:rgba(37,212,206,.04)}.tj-badge{display:inline-flex;align-items:center;min-height:24px;padding:3px 9px;border-radius:7px;font-weight:900}.tj-badge.buy,.tj-badge.win{color:var(--cyan);background:rgba(37,212,206,.1)}.tj-badge.sell,.tj-badge.loss{color:var(--danger);background:rgba(255,112,112,.1)}.tj-badge.be{color:var(--blue);background:rgba(74,168,238,.12)}.tj-pos{color:var(--cyan)!important}.tj-neg{color:var(--danger)!important}.tj-expand{display:none}.tj-expand.open{display:table-row}.tj-expand-content{padding:15px 18px!important;white-space:normal!important;line-height:1.7;color:var(--muted)!important}.tj-row-actions{display:flex;gap:8px;margin-top:12px}.tj-empty{padding:42px 18px;text-align:center;color:var(--low);font-family:"JetBrains Mono",monospace}.tj-loading{padding:30px;color:var(--muted);font-family:"JetBrains Mono",monospace}@media(max-width:1080px){.tj-grid{grid-template-columns:1fr}.tj-stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:640px){.tj-form-grid,.tj-form-grid.three,.tj-calc,.tj-stats{grid-template-columns:1fr}.tj-hero{align-items:flex-start;flex-direction:column}.tj-toolbar{align-items:flex-start;flex-direction:column}.tj-actions{flex-direction:column}.tj-actions .primary-button,.tj-actions .ghost-button{width:100%}}
  `;
  document.head.appendChild(style);
}

function journalHTML() {
  return `
    <div class="tj-shell">
      <div class="tj-hero">
        <div>
          <p class="eyebrow small-eyebrow">Journal Trade</p>
          <h3>Trade Entry System</h3>
          <p>Format input mengikuti sistem Farmer Circle Journal: pair, session, lot, auto pips, auto P&L, RR, emosi, outcome, alasan entry, dan review.</p>
        </div>
        <div class="tj-sync" id="tj-sync-status">Supabase Sync</div>
      </div>

      <div class="tj-stats">
        <div class="tj-stat"><span>Total Trade</span><strong id="tj-total">0</strong><small id="tj-total-sub">tersimpan</small></div>
        <div class="tj-stat"><span>Total P&L</span><strong id="tj-pnl">$0.00</strong><small>auto dari jurnal</small></div>
        <div class="tj-stat"><span>Win Rate</span><strong id="tj-winrate">0%</strong><small id="tj-wl">0W / 0L / 0BE</small></div>
        <div class="tj-stat"><span>Avg RR</span><strong id="tj-rr">—</strong><small id="tj-balance">Balance —</small></div>
      </div>

      <div class="tj-grid">
        <form id="trade-form" class="tj-card tj-form" novalidate>
          <input id="trade-id" type="hidden" />

          <div class="tj-section-title">01 — Setup Entry</div>
          <div class="tj-form-grid">
            <label class="tj-label"><span>Tanggal <b>*</b></span><input id="tj-date" type="date" required /></label>
            <label class="tj-label"><span>Session <b>*</b></span><select id="tj-session" required><option value="">Pilih Session</option><option>Asia 02:00–10:00 WIB</option><option>London 14:00–23:00 WIB</option><option>NY Pagi 19:00–22:00 WIB</option><option>NY Siang 22:00–01:00 WIB</option><option>NY Malam 01:00–04:00 WIB</option></select></label>
          </div>

          <div class="tj-form-grid">
            <label class="tj-label"><span>Kategori Pair <b>*</b></span><select id="tj-category"><option value="">Pilih Kategori</option><option value="forex">Forex</option><option value="commodity">Commodity</option><option value="index">Index</option><option value="crypto">Crypto</option></select></label>
            <label class="tj-label"><span>Pair <b>*</b></span><select id="tj-pair" disabled><option value="">Pilih kategori dulu</option></select></label>
          </div>

          <div class="tj-form-grid three">
            <label class="tj-label"><span>Lot Size <b>*</b></span><input id="tj-lot" type="number" min="0" step="0.01" placeholder="0.01" /></label>
            <label class="tj-label"><span>Balance Sebelum</span><input id="tj-balance-before" type="number" step="0.01" placeholder="auto dari trade terakhir" /></label>
            <label class="tj-label"><span>Arah <b>*</b></span><div class="tj-toggle"><button class="tj-pill buy" type="button" data-direction="BUY">BUY</button><button class="tj-pill sell" type="button" data-direction="SELL">SELL</button></div></label>
          </div>

          <div class="tj-form-grid three">
            <label class="tj-label"><span>Entry <b>*</b></span><input id="tj-entry" type="number" step="0.00001" placeholder="0.00000" /></label>
            <label class="tj-label"><span>Stop Loss <b>*</b></span><input id="tj-sl" type="number" step="0.00001" placeholder="0.00000" /></label>
            <label class="tj-label"><span>Take Profit <b>*</b></span><input id="tj-tp" type="number" step="0.00001" placeholder="0.00000" /></label>
          </div>

          <label class="tj-label tj-full"><span>Alasan Entry <b>*</b></span><textarea id="tj-reason" rows="4" placeholder="Contoh: BOS H4 + FVG H1 + liquidity sweep saat London..."></textarea></label>

          <div class="tj-section-title">02 — Kondisi Mental</div>
          <div class="tj-emotions" id="tj-emotions">
            ${["Tenang", "Percaya Diri", "Ragu", "FOMO", "Takut", "Greedy", "Revenge Trade", "Fokus"].map((label) => `<button class="tj-pill" type="button" data-emotion="${label}">${label}</button>`).join("")}
          </div>

          <div class="tj-section-title">03 — Setelah Close Trade</div>
          <div class="tj-form-grid three">
            <label class="tj-label"><span>Harga Exit <b>*</b></span><input id="tj-exit" type="number" step="0.00001" placeholder="0.00000" /></label>
            <label class="tj-label"><span>Profit/Loss ($)</span><input id="tj-pnl-field" type="number" step="0.01" placeholder="auto" /></label>
            <label class="tj-label"><span>Balance Setelah</span><input id="tj-balance-after" type="number" step="0.01" placeholder="auto" readonly /></label>
          </div>

          <div class="tj-calc">
            <div class="tj-calc-box"><span>Total Pips</span><strong id="tj-calc-pips">—</strong></div>
            <div class="tj-calc-box"><span>RR Plan</span><strong id="tj-calc-rr-plan">—</strong></div>
            <div class="tj-calc-box"><span>RR Aktual</span><strong id="tj-calc-rr-actual">—</strong></div>
          </div>

          <div class="tj-outcomes" id="tj-outcomes">
            <button class="tj-pill win" type="button" data-outcome="Win">WIN</button>
            <button class="tj-pill loss" type="button" data-outcome="Loss">LOSS</button>
            <button class="tj-pill be" type="button" data-outcome="Breakeven">BE</button>
          </div>

          <label class="tj-label tj-full"><span>Catatan / Review</span><textarea id="tj-notes" rows="4" placeholder="Apa yang benar? Apa yang harus diperbaiki?"></textarea></label>
          <p id="trade-error" class="tj-error" role="alert"></p>
          <p id="tj-message" class="tj-message" role="status"></p>
          <div class="tj-actions">
            <button id="save-trade-button" class="primary-button" type="submit"><i data-lucide="save"></i><span>Simpan Trade</span></button>
            <button id="tj-cancel-edit" class="ghost-button hidden" type="button"><i data-lucide="x"></i><span>Batal Edit</span></button>
          </div>
        </form>

        <div class="tj-card">
          <div class="tj-toolbar">
            <div>
              <div class="tj-section-title" style="margin-bottom:6px">Trade Log Supabase</div>
              <p style="margin:0;color:var(--muted);font-size:.84rem">Data muncul ulang dari device mana pun selama login dengan akun yang sama.</p>
            </div>
            <button id="refresh-trades" class="ghost-button compact" type="button"><i data-lucide="refresh-cw"></i><span>Refresh</span></button>
          </div>
          <div class="tj-filters" id="tj-filters">
            ${["All", "Win", "Loss", "Breakeven", "XAU/USD", "GBP/USD", "EUR/USD"].map((label) => `<button class="tj-filter ${label === "All" ? "active" : ""}" type="button" data-filter="${label}">${label === "Breakeven" ? "BE" : label}</button>`).join("")}
          </div>
          <div class="tj-table-wrap" style="margin-top:14px">
            <table class="tj-table">
              <thead><tr><th>#</th><th>Tanggal</th><th>Pair</th><th>Arah</th><th>Session</th><th>Entry</th><th>Exit</th><th>Pips</th><th>P&L</th><th>RR</th><th>Emosi</th><th>Hasil</th></tr></thead>
              <tbody id="trade-list"><tr><td colspan="12"><div class="tj-loading">Loading jurnal...</div></td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function injectJournalUI() {
  const section = $("#journal-section");
  if (!section || section.dataset.tradeJournalUpgrade === "1") return;
  section.dataset.tradeJournalUpgrade = "1";
  section.innerHTML = journalHTML();
  bindJournalEvents();
  setDefaultDate();
  window.lucide?.createIcons();
}

function setDefaultDate() {
  const date = $("#tj-date");
  if (date && !date.value) date.value = new Date().toISOString().slice(0, 10);
  const before = $("#tj-balance-before");
  if (before && !before.value) {
    const latest = getLatestBalance();
    if (latest) before.value = latest.toFixed(2);
  }
}

function bindJournalEvents() {
  $("#trade-form")?.addEventListener("submit", saveTrade);
  $("#refresh-trades")?.addEventListener("click", loadTrades);
  $("#tj-cancel-edit")?.addEventListener("click", resetForm);
  $("#tj-category")?.addEventListener("change", handleCategoryChange);
  $("#tj-pair")?.addEventListener("change", recalcAll);
  ["#tj-lot", "#tj-entry", "#tj-sl", "#tj-tp", "#tj-exit", "#tj-pnl-field", "#tj-balance-before"].forEach((selector) => $(selector)?.addEventListener("input", recalcAll));

  $$("[data-direction]").forEach((button) => button.addEventListener("click", () => setChoice("direction", button.dataset.direction, "[data-direction]", button)));
  $$("[data-emotion]").forEach((button) => button.addEventListener("click", () => setChoice("emotion", button.dataset.emotion, "[data-emotion]", button)));
  $$("[data-outcome]").forEach((button) => button.addEventListener("click", () => setChoice("outcome", button.dataset.outcome, "[data-outcome]", button)));
  $$("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    state.currentFilter = button.dataset.filter;
    $$("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    renderTrades();
  }));
}

function setChoice(key, value, selector, button) {
  state[key] = value;
  $$(selector).forEach((item) => item.classList.toggle("active", item === button));
  recalcAll();
}

function handleCategoryChange() {
  const category = $("#tj-category")?.value;
  const pairSelect = $("#tj-pair");
  if (!pairSelect) return;
  if (!category || !PAIR_DATA[category]) {
    pairSelect.disabled = true;
    pairSelect.innerHTML = '<option value="">Pilih kategori dulu</option>';
    return;
  }
  pairSelect.disabled = false;
  pairSelect.innerHTML = '<option value="">Pilih Pair</option>' + PAIR_DATA[category].pairs.map((pair) => `<option value="${pair}">${pair}</option>`).join("");
  recalcAll();
}

function recalcAll() {
  const pair = $("#tj-pair")?.value;
  const entry = num($("#tj-entry")?.value);
  const sl = num($("#tj-sl")?.value);
  const tp = num($("#tj-tp")?.value);
  const exit = num($("#tj-exit")?.value);
  const lot = num($("#tj-lot")?.value);
  const balanceBefore = num($("#tj-balance-before")?.value) ?? getLatestBalance();
  const pips = calcPips(entry, exit, pair, state.direction);
  const rrPlan = calcRRPlan(entry, sl, tp);
  const rrActual = calcRRActual(entry, sl, exit, state.direction);
  const pnlInput = $("#tj-pnl-field");
  const autoPnl = calcAutoPnl(entry, exit, lot, pair, state.direction);
  const typedPnl = num(pnlInput?.value);
  const pnl = typedPnl ?? autoPnl;

  if (autoPnl !== null && (document.activeElement !== pnlInput || !pnlInput.value)) {
    pnlInput.value = autoPnl.toFixed(2);
  }
  if ($("#tj-balance-after")) $("#tj-balance-after").value = pnl !== null ? (balanceBefore + pnl).toFixed(2) : "";
  if ($("#tj-calc-pips")) $("#tj-calc-pips").textContent = pips !== null ? fmtSigned(pips) : "—";
  if ($("#tj-calc-rr-plan")) $("#tj-calc-rr-plan").textContent = rrPlan ? `1:${rrPlan}` : "—";
  if ($("#tj-calc-rr-actual")) $("#tj-calc-rr-actual").textContent = rrActual ? `1:${rrActual}` : "—";
}

function getLatestBalance() {
  const withBalance = state.trades.filter((trade) => Number(trade.balanceAfter) > 0).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  return Number(withBalance[0]?.balanceAfter || 0);
}

function validateTrade() {
  const required = [
    ["Tanggal", $("#tj-date")?.value],
    ["Session", $("#tj-session")?.value],
    ["Kategori Pair", $("#tj-category")?.value],
    ["Pair", $("#tj-pair")?.value],
    ["Lot Size", $("#tj-lot")?.value],
    ["Arah BUY/SELL", state.direction],
    ["Entry", $("#tj-entry")?.value],
    ["Stop Loss", $("#tj-sl")?.value],
    ["Take Profit", $("#tj-tp")?.value],
    ["Harga Exit", $("#tj-exit")?.value],
    ["Emosi", state.emotion],
    ["Hasil Trade", state.outcome],
    ["Alasan Entry", $("#tj-reason")?.value.trim()],
  ];
  const missing = required.filter(([, value]) => !value).map(([label]) => label);
  return missing;
}

async function saveTrade(event) {
  event.preventDefault();
  const errorBox = $("#trade-error");
  const message = $("#tj-message");
  if (errorBox) errorBox.textContent = "";
  if (message) message.textContent = "";

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    if (errorBox) errorBox.textContent = "Session login tidak ditemukan. Coba login ulang.";
    return;
  }

  const missing = validateTrade();
  if (missing.length) {
    if (errorBox) errorBox.textContent = `Belum lengkap: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` (+${missing.length - 3} lagi)` : ""}`;
    return;
  }

  recalcAll();
  const pair = $("#tj-pair").value;
  const entry = num($("#tj-entry").value);
  const sl = num($("#tj-sl").value);
  const tp = num($("#tj-tp").value);
  const exit = num($("#tj-exit").value);
  const lot = num($("#tj-lot").value);
  const pnl = num($("#tj-pnl-field").value) ?? calcAutoPnl(entry, exit, lot, pair, state.direction) ?? 0;
  const balanceBefore = num($("#tj-balance-before").value) ?? getLatestBalance();
  const balanceAfter = balanceBefore + pnl;
  const pips = calcPips(entry, exit, pair, state.direction) ?? 0;
  const rrPlan = calcRRPlan(entry, sl, tp);
  const rrActual = calcRRActual(entry, sl, exit, state.direction);
  const pct = balanceBefore > 0 ? Number(((pnl / balanceBefore) * 100).toFixed(2)) : null;
  const reason = $("#tj-reason").value.trim();
  const review = $("#tj-notes").value.trim();
  const session = $("#tj-session").value;

  const meta = {
    _journalMeta: JOURNAL_META_VERSION,
    category: $("#tj-category").value,
    session,
    pair,
    lot,
    direction: state.direction,
    entry,
    sl,
    tp,
    exit,
    pnl,
    balanceBefore,
    balanceAfter,
    pips,
    rrPlan,
    rrActual,
    pct,
    emotion: state.emotion,
    outcome: state.outcome,
    reason,
    review,
  };

  const payload = {
    user_id: user.id,
    trade_date: $("#tj-date").value,
    pair,
    setup: session,
    direction: journalDirectionToDb(state.direction),
    entry_price: entry,
    stop_loss: sl,
    take_profit: tp,
    risk_percent: pct,
    result_r: pnl,
    notes: JSON.stringify(meta),
  };

  const saveButton = $("#save-trade-button");
  const saveText = saveButton?.querySelector("span");
  if (saveButton) saveButton.disabled = true;
  if (saveText) saveText.textContent = state.editingId ? "Menyimpan Edit..." : "Menyimpan...";

  const query = state.editingId
    ? supabase.from("trade_journals").update(payload).eq("id", state.editingId).eq("user_id", user.id)
    : supabase.from("trade_journals").insert(payload);

  const { error } = await query;
  if (saveButton) saveButton.disabled = false;
  if (saveText) saveText.textContent = "Simpan Trade";

  if (error) {
    if (errorBox) errorBox.textContent = `Gagal simpan trade: ${error.message}`;
    return;
  }

  if (message) message.textContent = state.editingId ? "Trade berhasil diperbarui." : "Trade berhasil disimpan ke Supabase.";
  await loadTrades();
  resetForm(false);
}

async function loadTrades() {
  const sync = $("#tj-sync-status");
  if (sync) sync.textContent = "Syncing...";
  const list = $("#trade-list");
  if (list) list.innerHTML = '<tr><td colspan="12"><div class="tj-loading">Loading jurnal dari Supabase...</div></td></tr>';

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    state.trades = [];
    renderStats();
    renderTrades();
    if (sync) sync.textContent = "Belum Login";
    return;
  }

  const { data, error } = await supabase
    .from("trade_journals")
    .select("*")
    .eq("user_id", user.id)
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (list) list.innerHTML = `<tr><td colspan="12"><div class="tj-empty">Gagal memuat jurnal: ${esc(error.message)}</div></td></tr>`;
    if (sync) sync.textContent = "Sync Error";
    return;
  }

  state.trades = (data || []).map(normalizeTrade);
  renderStats();
  renderTrades();
  setDefaultDate();
  if (sync) sync.textContent = "Supabase Synced";
}

function renderStats() {
  const total = state.trades.length;
  const wins = state.trades.filter((trade) => trade.outcome === "Win").length;
  const losses = state.trades.filter((trade) => trade.outcome === "Loss").length;
  const be = state.trades.filter((trade) => trade.outcome === "Breakeven").length;
  const pnl = state.trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const rrs = state.trades.map((trade) => Number(trade.rrActual)).filter(Number.isFinite);
  const avgRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : null;
  const latestBalance = getLatestBalance();

  if ($("#tj-total")) $("#tj-total").textContent = total;
  if ($("#tj-total-sub")) $("#tj-total-sub").textContent = `${total} trade tersimpan`;
  if ($("#tj-pnl")) {
    $("#tj-pnl").textContent = fmtMoney(pnl);
    $("#tj-pnl").className = pnl >= 0 ? "tj-pos" : "tj-neg";
  }
  if ($("#tj-winrate")) $("#tj-winrate").textContent = total ? `${((wins / total) * 100).toFixed(1)}%` : "0%";
  if ($("#tj-wl")) $("#tj-wl").textContent = `${wins}W / ${losses}L / ${be}BE`;
  if ($("#tj-rr")) $("#tj-rr").textContent = avgRR ? `1:${avgRR.toFixed(2)}` : "—";
  if ($("#tj-balance")) $("#tj-balance").textContent = latestBalance ? `Balance $${latestBalance.toFixed(2)}` : "Balance —";
}

function filteredTrades() {
  if (state.currentFilter === "All") return state.trades;
  return state.trades.filter((trade) => trade.outcome === state.currentFilter || trade.pair === state.currentFilter);
}

function renderTrades() {
  const list = $("#trade-list");
  if (!list) return;
  const rows = filteredTrades();
  if (!rows.length) {
    list.innerHTML = '<tr><td colspan="12"><div class="tj-empty">Belum ada trade tercatat di filter ini.</div></td></tr>';
    return;
  }
  list.innerHTML = rows.map((trade, index) => {
    const pnlClass = trade.pnl >= 0 ? "tj-pos" : "tj-neg";
    const pipsClass = trade.pips >= 0 ? "tj-pos" : "tj-neg";
    const dirClass = trade.direction === "SELL" ? "sell" : "buy";
    const outcomeClass = trade.outcome === "Win" ? "win" : trade.outcome === "Loss" ? "loss" : "be";
    return `
      <tr class="tj-main-row" data-expand="${esc(trade.dbId)}" style="cursor:pointer">
        <td>${index + 1}</td>
        <td>${esc(trade.date || "—")}</td>
        <td><span class="tj-badge be">${esc(trade.pair)}</span></td>
        <td><span class="tj-badge ${dirClass}">${trade.direction}</span></td>
        <td>${esc(trade.session || "—")}</td>
        <td>${trade.entry || "—"}</td>
        <td>${trade.exit || "—"}</td>
        <td class="${pipsClass}">${fmtSigned(trade.pips)}</td>
        <td class="${pnlClass}">${fmtMoney(trade.pnl)}</td>
        <td style="color:var(--cyan)">${trade.rrActual ? `1:${trade.rrActual}` : "—"}</td>
        <td>${esc(trade.emotion || "—")}</td>
        <td><span class="tj-badge ${outcomeClass}">${trade.outcome === "Breakeven" ? "BE" : trade.outcome}</span></td>
      </tr>
      <tr class="tj-expand" id="tj-expand-${esc(trade.dbId)}">
        <td colspan="12" class="tj-expand-content">
          ${trade.reason ? `<strong style="color:var(--cyan);font-family:'JetBrains Mono',monospace;font-size:.72rem">ALASAN ENTRY</strong><br>${esc(trade.reason)}<br><br>` : ""}
          ${trade.notes ? `<strong style="color:var(--blue);font-family:'JetBrains Mono',monospace;font-size:.72rem">REVIEW</strong><br>${esc(trade.notes)}<br><br>` : ""}
          <span>Balance: $${Number(trade.balanceBefore || 0).toFixed(2)} → $${Number(trade.balanceAfter || 0).toFixed(2)}${trade.pct !== null && trade.pct !== undefined ? ` (${trade.pct > 0 ? "+" : ""}${trade.pct}%)` : ""}</span>
          <div class="tj-row-actions">
            <button class="tj-mini-btn" type="button" data-edit="${esc(trade.dbId)}">Edit</button>
            <button class="tj-mini-btn" type="button" data-delete="${esc(trade.dbId)}" style="color:var(--danger)">Hapus</button>
          </div>
        </td>
      </tr>`;
  }).join("");

  $$("[data-expand]").forEach((row) => row.addEventListener("click", () => $("#tj-expand-" + CSS.escape(row.dataset.expand))?.classList.toggle("open")));
  $$("[data-edit]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); editTrade(button.dataset.edit); }));
  $$("[data-delete]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); deleteTrade(button.dataset.delete); }));
}

function editTrade(id) {
  const trade = state.trades.find((item) => String(item.dbId) === String(id));
  if (!trade) return;
  state.editingId = trade.dbId;
  $("#trade-id").value = trade.dbId;
  $("#tj-date").value = trade.date || new Date().toISOString().slice(0, 10);
  $("#tj-session").value = trade.session || "";
  $("#tj-category").value = trade.category || inferCategory(trade.pair);
  handleCategoryChange();
  $("#tj-pair").value = trade.pair;
  $("#tj-lot").value = trade.lot || "";
  $("#tj-balance-before").value = trade.balanceBefore || "";
  $("#tj-entry").value = trade.entry || "";
  $("#tj-sl").value = trade.sl || "";
  $("#tj-tp").value = trade.tp || "";
  $("#tj-exit").value = trade.exit || "";
  $("#tj-pnl-field").value = trade.pnl || "";
  $("#tj-balance-after").value = trade.balanceAfter || "";
  $("#tj-reason").value = trade.reason || "";
  $("#tj-notes").value = trade.notes || "";
  setChoice("direction", trade.direction, "[data-direction]", $(`[data-direction="${trade.direction}"]`));
  setChoice("emotion", trade.emotion, "[data-emotion]", $(`[data-emotion="${CSS.escape(trade.emotion)}"]`));
  setChoice("outcome", trade.outcome, "[data-outcome]", $(`[data-outcome="${trade.outcome}"]`));
  $("#tj-cancel-edit")?.classList.remove("hidden");
  $("#save-trade-button span").textContent = "Simpan Edit";
  recalcAll();
  $("#trade-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteTrade(id) {
  if (!confirm("Hapus trade ini dari Supabase?")) return;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return;
  const { error } = await supabase.from("trade_journals").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    const errorBox = $("#trade-error");
    if (errorBox) errorBox.textContent = `Gagal hapus trade: ${error.message}`;
    return;
  }
  await loadTrades();
}

function resetForm(clearMessage = true) {
  state.editingId = "";
  state.direction = "";
  state.emotion = "";
  state.outcome = "";
  $("#trade-form")?.reset();
  $("#trade-id") && ($("#trade-id").value = "");
  $$(".tj-pill.active").forEach((button) => button.classList.remove("active"));
  $("#tj-pair") && ($("#tj-pair").disabled = true, $("#tj-pair").innerHTML = '<option value="">Pilih kategori dulu</option>');
  $("#tj-calc-pips") && ($("#tj-calc-pips").textContent = "—");
  $("#tj-calc-rr-plan") && ($("#tj-calc-rr-plan").textContent = "—");
  $("#tj-calc-rr-actual") && ($("#tj-calc-rr-actual").textContent = "—");
  $("#tj-cancel-edit")?.classList.add("hidden");
  $("#save-trade-button span") && ($("#save-trade-button span").textContent = "Simpan Trade");
  if (clearMessage && $("#tj-message")) $("#tj-message").textContent = "";
  if ($("#trade-error")) $("#trade-error").textContent = "";
  setDefaultDate();
}

async function start() {
  injectJournalStyles();
  injectJournalUI();
  const { data } = await supabase.auth.getSession();
  state.session = data.session;
  await loadTrades();
  state.ready = true;
}

function scheduleStart() {
  setTimeout(() => start().catch((error) => console.warn("Trade journal upgrade skipped:", error.message)), 650);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleStart);
} else {
  scheduleStart();
}

supabase.auth.onAuthStateChange(() => {
  if (!state.ready) return;
  setTimeout(() => loadTrades(), 250);
});