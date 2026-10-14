> Catatan versi sebelumnya. Untuk source 1.8.0, gunakan [MULAI_DI_SINI.md](MULAI_DI_SINI.md) dan [PERBAIKAN_1.8.0.md](PERBAIKAN_1.8.0.md).

# MediaForge di GitHub Pages (gratis, tanpa iklan)

## Publikasi

1. Buat **repository public** gratis di GitHub (misalnya `mediaforge`).
2. Upload semua isi folder `MediaForge/` ini ke akar repository (termasuk folder tersembunyi `.github/`). Commit ke cabang `main`.
3. Buka **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Buka tab **Actions**; workflow `Deploy MediaForge to GitHub Pages` akan membangun dan menerbitkan website otomatis. Jika belum jalan, pilih **Run workflow**.
5. Alamat situs: `https://NAMA-AKUN.github.io/NAMA-REPO/`.

Tidak perlu kartu kredit atau domain. Repository **harus public** untuk GitHub Free. GitHub Pages dan Actions memiliki batas penggunaan/fair-use.

## Fitur yang bekerja di web

- Alat pemrosesan berkas yang dijalankan di browser (gambar, audio/video menurut kompatibilitas codec/perangkat).
- Desain responsif untuk perangkat mobile/desktop, tanpa akun MediaForge dan tanpa iklan.
- Data/berkas pribadi tidak diupload ke server MediaForge untuk pemrosesan lokal.

## Batasan penting downloader URL

**GitHub Pages TIDAK menjalankan Node.js, yt-dlp, FFmpeg executable, atau endpoint `/api/url`**. Downloader URL dalam paket ini hanya bekerja di komputer yang menjalankan backend lokal (`npm start` sesudah `npm ci`, `npm run build`, dan memasang `yt-dlp` serta `ffmpeg`). Mengakses website GitHub Pages melalui HP tidak otomatis menjalankan backend desktop.

Browser iOS/Android juga tidak memberikan akses umum ke program yt-dlp; unduh URL YouTube/Bstation/Dailymotion lintas perangkat **belum tersedia** pada versi web statis ini. Hindari menyatakan dukungan itu sudah berfungsi. Apple Music, Tidal, dan Deezer URL ber-DRM tidak dapat diunduh di implementasi ini.

## Biaya

Hosting situs statis GitHub Pages untuk repo public di GitHub Free tidak memiliki biaya berlangganan; tidak ada iklan yang disisipkan MediaForge. Biaya internet/perangkat tetap ditanggung masing-masing pengguna. Jangan menyimpan akses token/rahasia pada repository public.
