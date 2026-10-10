# MediaForge Studio — Electron Builder Windows

## Cara paling gampang: membuat installer di Windows

1. Ekstrak ZIP ini **seluruhnya** ke sebuah folder (jangan dijalankan dari dalam ZIP).
2. Untuk **membuat** installer, diperlukan **Node.js 22 LTS atau lebih baru** dan internet satu kali pada komputer build. Pengguna akhir **tidak** membutuhkan Node.js.
3. Klik dua kali `BUILD_INSTALLER_WINDOWS.cmd`.
4. Tunggu unduhan dependensi dan build selesai; installer `MediaForge-Studio-Setup-1.6.0-Windows-x64.exe` akan muncul di folder `release`.
5. Install dan jalankan. yt-dlp, FFmpeg, FFprobe, dan runtime Electron disertakan pada installer; downloader memerlukan internet untuk mengakses URL.

**Tidak perlu mengunggah folder ke GitHub.** Jika ingin build melalui GitHub, workflow ada di `.github/workflows/windows-installer.yml` dan harus ikut di-commit.

**Catatan jujur:** Ini adalah *kit pembuat installer*, **bukan file EXE final**. Build Windows dan fitur download nyata perlu diuji pada Windows; belum diverifikasi di lingkungan ini. Windows mungkin memperingatkan installer yang belum ditandatangani sertifikat (code signing berbayar tidak disertakan). DRM layanan berbayar tidak dibypass.
