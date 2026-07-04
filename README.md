# Farmer Circle Trade Journal

Website static SPA dengan Supabase Auth, jurnal trade per user, dan daily bias yang hanya bisa dibuat oleh role `admin` atau `mentor`.

## Setup Supabase

1. Buat project di Supabase.
2. Buka SQL Editor, lalu jalankan isi `supabase-schema.sql`.
3. Aktifkan email/password provider di Authentication.
4. Buat user lewat Authentication.
5. Jadikan user sebagai admin atau mentor jika diperlukan:

```sql
update public.profiles set role = 'admin' where id = 'USER_UUID';
update public.profiles set role = 'mentor' where id = 'USER_UUID';
```

## Setup Frontend

Edit `app.js`:

```js
const SUPABASE_URL = "https://PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "SUPABASE_ANON_KEY";
```

Anon key memang boleh ada di browser. Yang tidak boleh bocor adalah service role key. Proteksi data dilakukan oleh Row Level Security di `supabase-schema.sql`.

## Jalankan Lokal

Karena ini static app, bisa dijalankan dengan server sederhana:

```powershell
python -m http.server 5173
```

Lalu buka `http://localhost:5173`.

## Fitur

- Login Supabase dengan validasi email/password salah.
- Session otomatis dipulihkan setelah refresh.
- User hanya bisa melihat, membuat, mengedit, dan menghapus jurnal trade miliknya sendiri.
- Semua authenticated user bisa melihat daily bias.
- Hanya role `admin` dan `mentor` yang bisa upload, edit, dan hapus daily bias.
- Role enforcement ada di database policy, bukan cuma disembunyikan di frontend.
