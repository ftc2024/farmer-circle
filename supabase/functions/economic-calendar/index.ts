// Farmer Circle Economic Calendar Proxy
// Deploy as Supabase Edge Function.
// Default provider is AUTO:
// 1) ForexFactory/FairEconomy weekly XML feed
// 2) Financial Modeling Prep economic-calendar endpoint
// 3) Farmer Circle sample fallback only when every live source is unavailable

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type CalendarEvent = {
  date?: string;
  datetime?: string;
  time: string;
  currency: string;
  impact: "low" | "medium" | "high";
  event: string;
  actual: string;
  forecast: string;
  previous: string;
  country: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function timezoneOffsetHours(timezone: string) {
  const match = String(timezone || "").match(/GMT\s*([+-]?\d+(?:\.\d+)?)/i);
  if (match) return Number(match[1]);
  if (timezone === "Asia/Jakarta") return 7;
  return 0;
}

function localDateFromOffset(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000);
}

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDateWindow(range: string, timezone = "GMT+7") {
  const offset = timezoneOffsetHours(timezone);
  const today = localDateFromOffset(offset);
  let start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let end = new Date(start);

  if (range === "tomorrow") {
    start = addDays(start, 1);
    end = addDays(end, 1);
  } else if (range === "week") {
    const day = start.getUTCDay();
    const diffToMonday = day === 0 ? 1 : 1 - day;
    start = addDays(start, diffToMonday);
    end = addDays(start, 5);
  }

  return { from: dateKey(start), to: dateKey(end) };
}

function normalizeImpact(value: unknown): "low" | "medium" | "high" {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("3") || text.includes("high") || text.includes("bull") || text.includes("red") || text.includes("important")) return "high";
  if (text.includes("2") || text.includes("medium") || text.includes("moderate") || text.includes("orange")) return "medium";
  return "low";
}

function inferImpactFromEvent(title: string, current: "low" | "medium" | "high") {
  if (current !== "low") return current;
  const text = title.toLowerCase();
  const highWords = ["nonfarm", "nfp", "cpi", "inflation", "interest rate", "rate decision", "fomc", "fed", "gdp", "unemployment", "opec", "crude oil inventories", "retail sales"];
  const mediumWords = ["pmi", "confidence", "claims", "ppi", "manufacturing", "services", "housing", "trade balance"];
  if (highWords.some((word) => text.includes(word))) return "high";
  if (mediumWords.some((word) => text.includes(word))) return "medium";
  return current;
}

function pick(item: Record<string, unknown>, keys: string[], fallback = "-") {
  for (const key of keys) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return fallback;
}

function parseDateToKey(raw: string) {
  const value = String(raw || "").trim();
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const match = value.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (match) {
    const month = match[1].padStart(2, "0");
    const day = match[2].padStart(2, "0");
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return dateKey(date);
  return "";
}

function inRange(eventDate: string | undefined, range: string, timezone = "GMT+7") {
  if (!eventDate) return true;
  const { from, to } = getDateWindow(range, timezone);
  if (range === "today" || range === "tomorrow") return eventDate === from;
  return eventDate >= from && eventDate <= to;
}

function normalizeEvent(item: Record<string, unknown>, timezone = "GMT+7"): CalendarEvent {
  const rawDate = pick(item, ["date", "datetime", "date_time", "timestamp", "event_time"], "");
  const parsedDate = parseDateToKey(rawDate);
  const timeFromDate = rawDate.includes("T") ? rawDate.slice(11, 16) : rawDate.length >= 16 ? rawDate.slice(11, 16) : "";
  const eventTitle = pick(item, ["event", "title", "name"], "Economic Event");
  const impact = inferImpactFromEvent(eventTitle, normalizeImpact(pick(item, ["impact", "importance", "volatility", "sentiment"], "low")));

  return {
    date: parsedDate,
    datetime: rawDate,
    time: pick(item, ["time", "event_time", "hour"], timeFromDate || "--:--"),
    currency: pick(item, ["currency", "currency_code", "country_code", "country"], "USD").toUpperCase(),
    impact,
    event: eventTitle,
    actual: pick(item, ["actual", "actual_value"], "-"),
    forecast: pick(item, ["forecast", "estimate", "forecast_value"], "-"),
    previous: pick(item, ["previous", "prev", "previous_value"], "-"),
    country: pick(item, ["country_name", "country", "zone", "region"], "Global"),
  };
}

function sampleEvents(timezone = "GMT+7"): CalendarEvent[] {
  const { from } = getDateWindow("today", timezone);
  return [
    { date: from, datetime: "", time: "All Day", currency: "USD", impact: "high", event: "OPEC Meeting", actual: "-", forecast: "-", previous: "-", country: "US" },
    { date: from, datetime: "", time: "19:30", currency: "USD", impact: "high", event: "Nonfarm Payrolls", actual: "-", forecast: "190K", previous: "175K", country: "United States" },
    { date: from, datetime: "", time: "21:00", currency: "USD", impact: "medium", event: "ISM Services PMI", actual: "-", forecast: "52.6", previous: "53.8", country: "United States" },
  ];
}

function xmlText(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseForexFactoryXml(xml: string, range: string, timezone = "GMT+7") {
  const blocks = Array.from(xml.matchAll(/<event>([\s\S]*?)<\/event>/gi)).map((match) => match[1]);
  const rows = blocks.map((block) => {
    const title = xmlText(block, "title");
    const country = xmlText(block, "country");
    const rawDate = xmlText(block, "date");
    const date = parseDateToKey(rawDate);
    const time = xmlText(block, "time") || "All Day";
    // Penting: untuk ForexFactory jangan di-upgrade pakai keyword. Pakai impact asli dari feed agar cocok dengan warna FF.
    const impact = normalizeImpact(xmlText(block, "impact"));

    return {
      date,
      datetime: "",
      time,
      currency: country || "USD",
      impact,
      event: title || "Economic Event",
      actual: xmlText(block, "actual") || "-",
      forecast: xmlText(block, "forecast") || "-",
      previous: xmlText(block, "previous") || "-",
      country: country || "Global",
    } as CalendarEvent;
  });

  return rows.filter((row) => inRange(row.date, range, timezone));
}

async function fetchFromForexFactory(range: string, timezone = "GMT+7") {
  const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.xml", {
    headers: {
      "Accept": "application/xml,text/xml,*/*",
      "User-Agent": "FarmerCircleCalendar/1.0",
    },
  });
  if (!response.ok) throw new Error(`ForexFactory feed returned HTTP ${response.status}`);
  const xml = await response.text();
  return parseForexFactoryXml(xml, range, timezone);
}

async function fetchFromFmp(range: string, apiKey: string, timezone = "GMT+7") {
  const { from, to } = getDateWindow(range, timezone);
  const url = new URL("https://financialmodelingprep.com/stable/economic-calendar");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`FMP returned HTTP ${response.status}`);
  const payload = await response.json();
  const rows = extractRows(payload);
  if (!Array.isArray(rows)) throw new Error("FMP payload is not an array");
  return rows.map((item) => normalizeEvent(item as Record<string, unknown>, timezone)).filter((row) => inRange(row.date, range, timezone));
}

async function fetchFromGenericSource(sourceUrl: string, apiKey: string, range: string, timezone: string) {
  const source = new URL(sourceUrl);
  source.searchParams.set("range", range);
  source.searchParams.set("timezone", timezone);

  const headers: HeadersInit = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "FarmerCircleCalendar/1.0",
  };

  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await fetch(source.toString(), { headers });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const payload = await response.json();
  const rows = extractRows(payload);
  if (!Array.isArray(rows)) throw new Error("Source payload is not an array");
  return rows.map((item) => normalizeEvent(item as Record<string, unknown>, timezone)).filter((row) => inRange(row.date, range, timezone));
}

function extractRows(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  const object = payload as Record<string, unknown>;
  return object.events || object.data || object.result || object.calendar || [];
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "today";
    const timezone = url.searchParams.get("timezone") || "GMT+7";
    const provider = (Deno.env.get("ECONOMIC_CALENDAR_PROVIDER") || "auto").toLowerCase();
    const sourceUrl = Deno.env.get("ECONOMIC_CALENDAR_SOURCE_URL") || "";
    const apiKey = Deno.env.get("ECONOMIC_CALENDAR_API_KEY") || "";

    let events: CalendarEvent[] = [];
    let source = "Farmer Circle sample";
    let mode = "sample";
    const errors: string[] = [];

    const tryForexFactory = async () => {
      events = await fetchFromForexFactory(range, timezone);
      source = "ForexFactory / FairEconomy weekly calendar feed";
      mode = "live";
    };

    const tryFmp = async () => {
      if (!apiKey) throw new Error("FMP API key is missing");
      events = await fetchFromFmp(range, apiKey, timezone);
      source = "Financial Modeling Prep economic calendar";
      mode = "live";
    };

    if (provider === "forexfactory" || provider === "ff") {
      await tryForexFactory();
    } else if (provider === "fmp") {
      await tryFmp();
    } else if (provider === "generic" && sourceUrl) {
      events = await fetchFromGenericSource(sourceUrl, apiKey, range, timezone);
      source = "Configured economic calendar source";
      mode = "live";
    } else {
      try {
        await tryForexFactory();
      } catch (error) {
        errors.push(`FF: ${error instanceof Error ? error.message : "failed"}`);
        try { await tryFmp(); } catch (fmpError) { errors.push(`FMP: ${fmpError instanceof Error ? fmpError.message : "failed"}`); }
        if (!events.length && sourceUrl) {
          try {
            events = await fetchFromGenericSource(sourceUrl, apiKey, range, timezone);
            source = "Configured economic calendar source";
            mode = "live";
          } catch (genericError) { errors.push(`Generic: ${genericError instanceof Error ? genericError.message : "failed"}`); }
        }
      }
    }

    if (!events.length && mode !== "live") {
      events = sampleEvents(timezone).filter((row) => inRange(row.date, range, timezone));
      source = "Farmer Circle sample";
      mode = errors.length ? "fallback" : "sample";
    }

    events.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.time).localeCompare(String(b.time)));

    return json({
      source,
      mode,
      range,
      timezone,
      errors,
      updated_at: new Date().toISOString(),
      events,
    });
  } catch (error) {
    return json({
      source: "Farmer Circle proxy error",
      mode: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      updated_at: new Date().toISOString(),
      events: sampleEvents(),
    }, 200);
  }
});
