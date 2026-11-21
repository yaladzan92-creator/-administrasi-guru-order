# Formulir Pelanggan Administrasi Guru

Pratinjau frontend statis untuk GitHub Pages. Unggah `index.html` pada root repository.

**Status:** belum terhubung ke Supabase, token belum tervalidasi, belum mengirim pesanan, belum membuat ZIP. Dilarang mengklaim siap menerima pelanggan sebelum backend dibuat dan diuji.

## Integrasi berikutnya
- Cocokkan field dengan schema profil V22 dan katalog template yang tersedia.
- Supabase Edge Function untuk validasi token dan pembuatan order satu kali secara atomik.
- Row Level Security dan tabel pesanan privat.
- n8n Docker mengambil antrean secara aman, bukan mengakses database dari JS publik memakai secret.
- ZIP privat dengan signed download URL.
