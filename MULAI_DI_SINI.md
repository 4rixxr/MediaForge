# Membuat MediaForge Studio 1.8.4 untuk Windows

## GitHub Actions

1. Ekstrak ZIP. Salin **seluruh isi `mf_electron_builder`** ke root repository, termasuk `.gitattributes`, `.github`, `package.json`, `package-lock.json`, `src`, `shared`, `desktop`, `scripts`, dan `tests`. Jangan hanya menyalin workflow atau `package.json`.
2. Commit seluruh perubahan ke branch yang dipakai build.
3. Pilih **Actions → Build Windows All-in-One Installer → Run workflow**, lalu pilih branch tersebut. Untuk portable pilih **Build Windows Portable EXE**.
4. Buat run baru setelah commit; **Re-run jobs pada run lama tetap memakai commit lama**. Periksa langkah `Show source commit`.
5. Setelah seluruh langkah berhasil, unduh artifact `MediaForge-Studio-Windows-Setup` atau `MediaForge-Studio-Windows-Portable`.
6. Hasil yang diharapkan: `MediaForge-Studio-Setup-1.8.4-Windows-x64.exe` atau `MediaForge-Studio-Portable-1.8.4-Windows-x64.exe`.

Workflow memasang dependensi terkunci, menyiapkan FFmpeg/FFprobe/yt-dlp dan runtime Node.js, VCDImager beserta DLL, CDRDAO, dan lisensi. Selanjutnya workflow menjalankan tes encoder/image, membuat ISO tanpa drive menggunakan IMAPI, memeriksa ASAR, lalu mencoba konversi Opus melalui preload/IPC pada aplikasi Electron hasil paket. Tidak ada pembakaran fisik otomatis di CI.

## Build lokal Windows

Komputer build memerlukan Node.js 22.12+, internet, dan MSYS2 UCRT64. Dari terminal **MSYS2 UCRT64**, pasang:

```sh
pacman -S --needed mingw-w64-ucrt-x86_64-vcdimager
```

Lokasi MSYS2 default `C:\msys64`; untuk lokasi lain set `MEDIAFORGE_MSYS2_ROOT`. Jalankan `BUILD_INSTALLER_WINDOWS.cmd`. Pengguna akhir installer/portable tidak memerlukan Node.js/MSYS2/FFmpeg terpisah.

ZIP ini berisi source dan preview hasil build, **bukan EXE yang sudah diuji di Windows**. Jika run baru gagal, kirim log teks langkah pertama yang merah beserta sekitar 20 baris sebelumnya dan commit yang dibangun. Jangan hanya kirim pesan penutup `exit code 1`.
