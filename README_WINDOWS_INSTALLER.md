Untuk cara cepat, baca **MULAI_DI_SINI.md** dan jalankan **BUILD_INSTALLER_WINDOWS.cmd** pada Windows.

# MediaForge Studio 1.6.0 — Windows Installer (All-in-One)

## Hasil akhir

`MediaForge-Studio-Setup-1.6.0-Windows-x64.exe` adalah **target build**, bukan berkas yang telah tersedia di ZIP ini. Installer memasang aplikasi Electron dan tiga alat bantu (`yt-dlp.exe`, `ffmpeg.exe`, `ffprobe.exe`) dalam satu paket. Pengguna Windows 10/11 x64 hanya perlu menjalankan installer, memilih lokasi, lalu membuka MediaForge Studio melalui Start Menu atau shortcut desktop. Tidak perlu memasang Python, Node.js atau FFmpeg secara terpisah.

## Build installer melalui GitHub Actions

1. Unggah **isi folder proyek** ke repository GitHub (jangan mengunggah ZIP tanpa ekstraksi).
2. Masuk tab **Actions**, pilih **Build Windows All-in-One Installer**, klik **Run workflow**.
3. Jika berhasil, buka workflow run → **Artifacts** → **MediaForge-Studio-Windows-Installer**.
4. Unduh lalu ekstrak artifact, jalankan `MediaForge-Studio-Setup-1.6.0-Windows-x64.exe`.

Build berlangsung pada runner Windows milik GitHub; internet diperlukan saat build untuk mengunduh binary alat bantu. Pada PC pengguna, koneksi diperlukan untuk mengakses media URL, **bukan untuk memasang dependensi lagi**.

**Kondisi saat penyerahan**: source installer dan workflow siap dicoba; belum ada EXE hasil build yang dapat diuji dalam lingkungan Linux ini. Proses build atau unduhan dependensi masih mungkin gagal; periksa log GitHub Actions. Installer belum ditandatangani secara digital dan mungkin memunculkan peringatan SmartScreen. Tidak termasuk pembobolan DRM dan tidak menjamin unduhan dari semua URL.

Source FFmpeg/yt-dlp/Electron dan lisensi distribusi wajib diperiksa sebelum publikasi.
