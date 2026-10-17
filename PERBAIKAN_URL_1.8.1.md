# Perbaikan unduhan URL — 1.8.1

Paket source ini melanjutkan seluruh perbaikan 1.8.0. Build ulang melalui workflow dari commit baru; jangan menjalankan ulang job dari commit lama.

## Perubahan

- Build Windows menyertakan Node.js sebagai runtime JavaScript yt-dlp, dengan jalur eksplisit. Electron tidak diperlakukan sebagai executable Node mandiri. yt-dlp diperbarui saat build, bukan memakai cache executable lama tanpa pemeriksaan.
- Hasil unduhan diambil dari jalur final yang dilaporkan yt-dlp, bukan file fragmen sementara. Jalur harus berada di direktori tugas dan file harus berisi data.
- MP4/MKV dikonversi ke H.264/AAC; WebM memakai VP9/Opus. MPEG, MPEG-2, DAT dan audio menggunakan profil format tujuan. Video tanpa audio dapat diproses.
- Batas resolusi diterapkan pada hasil lokal. Sumber diunduh dahulu, lalu dipotong dengan FFmpeg. DAT tetap PAL 352×288, 25 fps. Audio original mempertahankan stream; potongan dapat mengikuti batas paket audio.
- URL dibersihkan dari spasi tepi; akses localhost ke server lokal diterima. Kontrol dikunci selama proses berlangsung.
- Respons HTML atau hasil kosong tidak boleh dilaporkan sebagai unduhan sukses.

## Verifikasi

- TypeScript, build produksi, serta pengujian regresi dijalankan pada lingkungan Linux.
- 21 tes regresi lulus dengan pengujian native diaktifkan.
- Tes HTTP + FFmpeg/FFprobe asli menghasilkan MP4, WebM, MKV, MPEG, MPEG-2, DAT, WMA dan Opus. Durasi potongan, batas resolusi, codec, dan video tanpa audio diperiksa.
- Tes browser menjalankan analisis → pengaturan → konfirmasi → unduhan MP4, memeriksa hasil dengan FFprobe, penguncian kontrol, penolakan respons HTML, dan tidak adanya error halaman.

Tes URL mengganti pengambilan sumber internet dengan fixture lokal; konversi, HTTP, browser dan pemeriksaan file benar-benar dijalankan. Ini **bukan bukti unduhan langsung YouTube/Bilibili/Dailymotion berhasil**. Belum ada URL gagal atau pesan error terbaru dari pengguna. Build EXE Windows dan GitHub Actions belum dijalankan di lingkungan ini. Situs dapat berubah, mensyaratkan login, membatasi wilayah atau menolak akses; tidak ada klaim dukungan tanpa batas maupun bypass DRM. Batas proses backend tetap 10 menit per proses anak.

Rujukan runtime yt-dlp: https://github.com/yt-dlp/yt-dlp/wiki/EJS

Riwayat perbaikan konversi dan batas verifikasi burner: PERBAIKAN_1.8.0.md.
