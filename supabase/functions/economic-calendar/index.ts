// Farmer Circle Economic Calendar Proxy
// Deploy as Supabase Edge Function.
// Recommended provider: Financial Modeling Prep economic-calendar endpoint.
// Set env ECONOMIC_CALENDAR_PROVIDER=fmp and ECONOMIC_CALENDAR_API_KEY=your_key.
// You can also set ECONOMIC_CALENDAR_SOURCE_URL for another allowed JSON calendar endpoint.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type CalendarEvent = {
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

function todayRange(range: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (range === "tomorrow") {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  }

  if (range === "week") {
    end.setDate(end.getDate() + 7);
  }

  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { from: format(start), to: format(end) };
}

function normalizeImpact(value: unknown): "low" | "medium" | "high" {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("3") || text.includes("high") || text.includes("bull") || text.includes("important")) return "high";
  if (text.includes("2") || text.includes("medium") || text.includes("moderate")) return "medium";
  return "low";
}

function pick(item: Record<string, unknown>, keys: string[], fallback = "-") {
  for (const key of keys) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return fallback;
}

function normalizeEvent(item: Record<string, unknown>): CalendarEvent {
  const rawDate = pick(item, ["date", "datetime", "date_time", "timestamp", "event_time"], "");
  const timeFromDate = rawDate.includes("T") ? rawDate.slice(11, 16) : rawDate.length >= 16 ? rawDate.slice(11, 16) : "";

  return {
    time: pick(item, ["time", "event_time", "hour"], timeFromDate || "--:--"),
    currency: pick(item, ["currency", "currency_code", "country_code"], "USD").toUpperCase(),
    impact: normalizeImpact(pick(item, ["impact", "importance", "volatility", "sentiment"], "low")),
    event: pick(item, ["event", "title", "name"], "Economic Event"),
    actual: pick(item, ["actual", "actual_value"], "-"),
    forecast: pick(item, ["forecast", "estimate", "forecast_value"], "-"),
    previous: pick(item, ["previous", "prev", "previous_value"], "-"),
    country: pick(item, ["country", "zone", "region"], "Global"),
  };
}

function sampleEvents(): CalendarEvent[] {
  return [
    { time: "19:30", currency: "USD", impact: "high", event: "Nonfarm Payrolls", actual: "-", forecast: "190K", previous: "175K", country: "United States" },
    { time: "19:30", currency: "USD", impact: "high", event: "Unemployment Rate", actual: "-", forecast: "4.0%", previous: "4.0%", country: "United States" },
    { time: "21:00", currency: "USD", impact: "medium", event: "ISM Services PMI", actual: "-", forecast: "52.6", previous: "53.8", country: "United States" },
  ];
}

async function fetchFromFmp(range: string, apiKey: string) {
  const { from, to } = todayRange(range);
  const url = new URL("https://financialmodelingprep.com/stable/economic-calendar");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) throw new Error(`FMP returned HTTP ${response.status}`);
  return await response.json();
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
  return await response.json();
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
    const timezone = url.searchParams.get("timezone") || "Asia/Jakarta";
    const provider = (Deno.env.get("ECONOMIC_CALENDAR_PROVIDER") || "fmp").toLowerCase();
    const sourceUrl = Deno.env.get("ECONOMIC_CALENDAR_SOURCE_URL") || "";
    const apiKey = Deno.env.get("ECONOMIC_CALENDAR_API_KEY") || "";

    let payload: unknown;
    let source = "Farmer Circle sample";
    let mode = "sample";

    if (provider === "fmp" && apiKey) {
      payload = await fetchFromFmp(range, apiKey);
      source = "Financial Modeling Prep economic calendar";
      mode = "live";
    } else if (sourceUrl) {
      payload = await fetchFromGenericSource(sourceUrl, apiKey, range, timezone);
      source = "Configured economic calendar source";
      mode = "live";
    } else {
      return json({ source, mode, range, timezone, events: sampleEvents() });
    }

    const rows = extractRows(payload);
    if (!Array.isArray(rows)) throw new Error("Source payload is not an array and has no events/data/result/calendar array.");

    return json({
      source,
      mode,
      range,
      timezone,
      events: rows.map((item) => normalizeEvent(item as Record<string, unknown>)),
    });
  } catch (error) {
    return json({
      source: "Farmer Circle proxy error",
      mode: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      events: sampleEvents(),
    }, 200);
  }
});
