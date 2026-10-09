# MediaForge Studio v1.5.0 — Windows Portable

**Tujuan:** satu file EXE Windows x64 untuk pengguna akhir. Tidak perlu memasang Node.js, Python, yt-dlp, atau FFmpeg secara manual.

## Penting: ini paket SOURCE, belum EXE final

Arsip ZIP ini berisi proyek siap dibangun. File EXE **belum dibuat atau diuji di Windows** dalam lingkungan ini. Workflow GitHub Actions `windows-portable.yml` mengambil dependensi secara otomatis **saat proses build**, memasukkan `yt-dlp.exe`, `ffmpeg.exe`, dan `ffprobe.exe` ke paket aplikasi Electron, lalu menghasilkan executable portable.

## Cara menghasilkan EXE menggunakan GitHub (gratis sesuai kuota GitHub Actions)

1. Buat repository GitHub baru, unggah **isi folder proyek ini** (jangan ZIP-nya langsung).
2. Buka tab **Actions** → **Build Windows Portable EXE** → **Run workflow**.
3. Setelah build sukses, buka hasil workflow → **Artifacts** → unduh `MediaForge-Studio-Windows-Portable`.
4. Ekstrak ZIP artefak dari GitHub: di dalamnya ada satu file `MediaForge-Studio-1.5.0-Windows-Portable-x64.exe`. Jalankan pada Windows 10/11 x64.

Tidak perlu memasang yt-dlp, FFmpeg, Python, maupun Node.js di komputer **pengguna**. Proses build memerlukan akses internet sekali untuk mengambil dependensi. Saat memakai aplikasi, internet tetap diperlukan untuk mengakses sumber media.

### Batasan

- GitHub Actions gratis dibatasi kuota dan kebijakan GitHub; workflow publik biasanya memenuhi penggunaan gratis yang tersedia. Tidak ada hosting berbayar yang diperlukan.
- EXE belum *code-signed*: Windows SmartScreen mungkin memberi peringatan karena aplikasi dari penerbit tidak dikenal. Jangan mematikan keamanan sistem; verifikasi asal berkas.
- YouTube, Bstation, dan Dailymotion hanya bekerja bila yt-dlp mendukung URL yang dimaksud dan sumber mengizinkan pengunduhan. DRM Apple Music / Tidal / Deezer tidak dibypass.
- UI mengunduh berkas lewat proses lokal; kualitas, pilihan resolusi, dan estimasi ukuran tergantung media sumber. Versi portable ini belum diverifikasi menggunakan pengunduhan nyata.
- Upgrade yt-dlp/FFmpeg berarti membangun ulang paket portable atau merilis versi baru. Tidak ada download otomatis saat startup.
- Lisensi distribusi komponen pihak ketiga (termasuk FFmpeg dan Electron) wajib dipatuhi sebelum distribusi publik.
