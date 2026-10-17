# Perbaikan verifikasi Windows 1.7.3

Error pada screenshot berasal dari scripts/verify-packaged.cjs: path node_modules/electron-updater/package.json memakai slash. Implementasi ASAR 3.4.1 memecah direktori berdasarkan path.sep milik host. Pada Windows, path bertingkat tersebut terbaca sebagai satu nama direktori dan gagal ditemukan.

Perbaikan: asar.extractFile(archive, path.normalize(name)). Pemeriksaan keberadaan updater tetap aktif; tidak dilewati.

Pengujian: implementasi Filesystem ASAR yang terpasang dijalankan dengan path.win32. Path lama menghasilkan error yang sama; skrip baru berhasil. Saat file updater sengaja dihilangkan, verifikasi tetap gagal. Seluruh 12 regresi Node dan regresi inti lulus. Verifikasi arsip win-unpacked yang tersedia juga lulus di Linux. Build installer serta menjalankan EXE di Windows belum diuji pada lingkungan ini.

Cara menerapkan di GitHub:
1. Ekstrak ZIP dan unggah ISI folder mf_electron_builder ke root repositori, menggantikan berkas lama. Sertakan folder .github.
2. Commit perubahan ke branch yang dipakai workflow.
3. Actions > Build Windows All-in-One Installer > Run workflow > pilih branch terbaru.
4. Jangan memakai Re-run jobs dari run lama: run tersebut menggunakan commit lama.

Perbaikan minimal jika tidak ingin mengganti seluruh proyek: ganti scripts/verify-packaged.cjs dengan berkas dari ZIP ini, commit, lalu Run workflow baru.
