# Farmer Circle Economic Calendar Proxy

Function ini adalah backend/proxy untuk Economic Calendar.

Frontend GitHub Pages tidak mengambil data langsung dari sumber kalender ekonomi. Frontend mengambil data dari function ini agar:

- tidak kena CORS browser,
- API key/source URL tidak bocor di frontend,
- data bisa dinormalisasi ke format Farmer Circle.

## Deploy ke Supabase

```bash
supabase functions deploy economic-calendar
```

## Environment variable

Minimal:

```bash
supabase secrets set ECONOMIC_CALENDAR_SOURCE_URL="https://YOUR_ALLOWED_CALENDAR_SOURCE_URL"
```

Jika sumber data membutuhkan API key:

```bash
supabase secrets set ECONOMIC_CALENDAR_API_KEY="YOUR_API_KEY"
```

## Hubungkan ke frontend

Setelah deploy, buka file `calendar-config.js`, lalu isi:

```js
window.FARMER_CIRCLE_CONFIG = {
  calendarApiUrl: "https://PROJECT_ID.functions.supabase.co/economic-calendar",
};
```

## Format data sumber yang didukung

Function menerima response JSON dalam salah satu format:

```json
[
  {
    "time": "19:30",
    "currency": "USD",
    "impact": "high",
    "event": "Nonfarm Payrolls",
    "actual": "-",
    "forecast": "190K",
    "previous": "175K",
    "country": "United States"
  }
]
```

atau:

```json
{
  "events": []
}
```

atau:

```json
{
  "data": []
}
```

## Catatan Investing

Kalau ingin memakai data dari Investing, gunakan endpoint/API yang memang legal/diizinkan untuk diakses server-side. Jangan taruh credential atau source URL private di frontend GitHub Pages.
