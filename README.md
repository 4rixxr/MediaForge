# MediaForge Studio v1.3.0 — Web gratis + backend lokal opsional

**Deploy gratis GitHub Pages:** baca [`GITHUB_PAGES_GRATIS.md`](GITHUB_PAGES_GRATIS.md). Workflow `.github/workflows/deploy-pages.yml` tersedia; **belum dipublikasikan otomatis ke akun GitHub kamu**. Situs statis dapat diakses di HP maupun desktop. Peralatan pemrosesan file berbasis browser berjalan lokal bila browser mendukung formatnya.

**Catatan jujur:** Pengunduhan URL YouTube/Bstation/Dailymotion tidak berjalan pada hosting statis GitHub Pages; memerlukan backend lokal Node.js + yt-dlp + FFmpeg di komputer. Apple Music/Tidal/Deezer dengan DRM tidak didukung. Tidak ada biaya hosting atau iklan dari MediaForge, tetapi tidak semua fitur dapat dibuat bekerja identik di setiap perangkat hanya dengan GitHub Pages.

# MediaForge — Studio revision 1.1.0

Redesain workspace dan perbaikan bug dari MediaForge v1.0.0.
Status: **kandidat beta; belum disetujui untuk produksi publik penuh**.

## Menjalankan

Gunakan Node.js 22.12+ (diuji dengan Node.js 24).

```bash
npm ci
npm run dev
```

Buka alamat localhost yang ditampilkan. Untuk build:

```bash
npm run check
npm test
npm run preview
```

Gunakan `package-lock.json` sebagai lockfile. `bun.lock` lama telah dihapus karena tidak lagi cocok dengan dependensi. Dependensi AI/Express/dotenv yang tidak digunakan dan konflik esbuild lama telah dibersihkan. `dist/` berisi build statis; buka melalui server HTTP, bukan klik langsung index.html.

## Isi paket

- `src/`: kode lengkap yang telah diubah.
- `review/STUDIO_REVIEW.md`: penilaian lima peran, bukti pengujian, dan syarat produksi.
- `review/*-release.png`: screenshot dari aplikasi berjalan pada desktop, dark mode, dan mobile.
- `review/browser-results.json`: hasil smoke test Chromium.
- `tests/core-regressions.ts`: tes format media, audio, dan antrean FFmpeg.
- `tests/browser-smoke.cjs`: pengujian browser yang dapat diulang.
- `dist/`: hasil build Vite.

## Tes browser opsional

```bash
npm install --no-save playwright
npx playwright install chromium
node tests/browser-smoke.cjs
```

Tes memakai port 3001; pastikan kosong. Ini memasang tooling QA lokal tanpa menambahkannya sebagai dependensi produksi.

## Batas yang perlu diketahui

Konversi gambar menggunakan Canvas. Dukungan encode AVIF/BMP mengikuti browser; format yang tidak didukung menghasilkan error, bukan berkas dengan ekstensi palsu. FFmpeg memuat engine eksternal saat diperlukan, sehingga pemuatan pertama memerlukan internet. Fitur PDF berfokus pada pembuatan PDF dari gambar dan informasi berkas dasar, bukan merge/split PDF.

Pembatalan antrean menolak hasil dan penambahan riwayat, namun belum menghentikan komputasi codec yang sedang aktif. Jangan menjanjikan pemrosesan tanpa batas ukuran, offline penuh, atau kompatibilitas semua codec sebelum pengujian lanjutan.

## URL Downloader (v1.2.0)

This release adds an **URL Downloader** workspace. Video URLs from YouTube, Bstation/Bilibili and Dailymotion can be analyzed using a **local** backend, with output format, maximum resolution, center aspect-ratio crop, trim times, extraction to audio, and a final review with estimated file size. Original audio mode copies the selected source audio without re-encoding where supported. Transcoding cannot increase source fidelity. Actual downloaded sizes may differ from estimates.

**Requirements:** Node.js >=22, `yt-dlp` (current version) and `ffmpeg` + `ffprobe` on PATH. Install dependencies with `npm install`, build with `npm run build`, then launch `npm start` and open `http://127.0.0.1:8787`. For development, run `npm run dev:api` in one terminal and `npm run dev` in another (Vite proxies `/api/url` to the API). The local backend binds to loopback by default and is **not designed for public hosting**. A normal static-only deployment cannot download cross-origin remote media.

**Licensing & limitations:** download only content you own or are authorized to download in compliance with platform rules. Apple Music, Tidal and Deezer links are identified in the UI, but protected/subscription streams are deliberately **not downloaded**: their DRM and entitlement mechanisms are not bypassed. You can use the official offline playback features in those services. Video host availability is best effort and depends on accessible streams, current site extractor support and permissions. Playlist and live URLs are unsupported.
