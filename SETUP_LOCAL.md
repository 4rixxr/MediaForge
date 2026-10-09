# MediaForge v1.4 – URL downloader lokal

## Cara menjalankan

1. Instal Node.js 22+ dari nodejs.org, yt-dlp dari github.com/yt-dlp/yt-dlp, dan FFmpeg dari ffmpeg.org (gratis, satu kali). Ketiganya harus tersedia dalam PATH.
2. Windows: klik `START_WINDOWS.cmd`; macOS/Linux: jalankan `./START_MAC_LINUX.sh` lewat terminal.
3. Buka `http://127.0.0.1:8787` di perangkat yang menjalankan mesin lokal, kemudian menu **Download from URL**.
4. Tempel URL media yang dapat diakses, klik Analyze, pilih format, resolusi, rasio/crop, rentang waktu, lalu konfirmasi estimasi ukuran dan unduh.

Koneksi internet dibutuhkan untuk mengunduh media sumber dan dependensi saat persiapan awal. Tidak menggunakan server berbayar atau iklan.

**Batas nyata**: GitHub Pages hanya meng-host UI statis dan tidak menjalankan `server.js`, `yt-dlp` atau FFmpeg. Jadi URL downloader tidak bekerja hanya dengan membuka link GitHub Pages di HP. Untuk itu dibutuhkan aplikasi native per platform atau service backend tambahan. Apple Music, Tidal, dan Deezer tetap dibatasi untuk konten ber-DRM.

## Diagnostik

`node --version`, `yt-dlp --version`, `ffmpeg -version`; lalu `npm install && npm run check && npm start`.

## Keamanan

Backend bind ke `127.0.0.1` (tidak dipublikasikan ke internet). Hanya URL HTTPS dari domain yang didukung, tanpa port/kredensial. Unduhan dijalankan sebagai proses lokal, tidak ada akun atau database awan.

## Status verifikasi

Backend lulus `node --check`. Fitur download end-to-end memerlukan eksekutabel yt-dlp dan koneksi ke URL sumber nyata pada perangkat target; tidak diklaim lolos uji end-to-end dalam paket ini.
