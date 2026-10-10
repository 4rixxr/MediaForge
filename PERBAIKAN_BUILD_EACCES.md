# MediaForge Builder – revisi untuk error spawn EACCES

Paket ini mencoba menghindari tahap pemindaian seluruh `node_modules` aplikasi oleh Electron Builder dengan membuat folder `.mediaforge-app` yang hanya berisi berkas runtime (`dist`, `desktop`, `server.js`, `package.json` minimal). Pada paket awal, sebagian besar paket di `node_modules` hanya dibutuhkan untuk BUILD, bukan saat aplikasi dijalankan.

Cara pakai: ekstrak ke folder BARU yang pendek, misalnya `C:\MediaForgeBuild` (jangan di dalam ZIP). Klik dua kali `BUILD_INSTALLER_WINDOWS.cmd`. Tidak perlu dijalankan sebagai administrator. Pastikan antivirus tidak memblokir proses build; jangan menonaktifkan proteksi Windows.

Installer, JIKA build berhasil, akan muncul pada folder `release`. Revisi ini belum diuji end-to-end di Windows. Bila gagal, kirim log dari error pertama; beberapa penyebab EACCES juga bisa berasal dari izin/antivirus/kebijakan perangkat.
