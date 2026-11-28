# Formulir penjualan Administrasi Guru

## Audit dan perubahan

- `index.html` adalah satu-satunya halaman di checkout GitHub Pages. Versi sebelumnya menetapkan `SD-PJOK-1-6`, kelas `"1-6"`, `phase: "A,B,C"`, dan `semester: "both"`. Javascript mengirim `{ token, form_data }` ke endpoint Supabase dan membaca `success` serta `order_id`. README sebelumnya masih menyebut formulir belum terhubung. Versi yang terpasang belum dapat diverifikasi.
- Checkout ini tidak memuat source `submit-order`, SQL tabel `orders`, ekspor workflow n8n, atau katalog Docker. Kolom email, kaitan token dengan pesanan, status, dan prosedur transaksi belum dapat diaudit. Koneksi langsung ke endpoint gagal dari workspace.
- Halaman kini memakai empat tahap dan menyimpan isian di DOM selama halaman terbuka. Refresh menghapus draft. NPSN, desa/kelurahan, kecamatan, dan NIP kepala sekolah dibuat wajib untuk pesanan baru. Validasi wilayah memeriksa kelengkapan isian. Kecocokan dengan registri wilayah belum diperiksa.
- `order-form.mjs` memuat katalog, membentuk payload, dan mengunci pengiriman selama POST. Jika hasil POST ambigu, halaman meminta pelanggan menghubungi admin untuk konfirmasi. Token lama dari query string tetap bisa dipakai dan dihapus dari URL setelah halaman dimuat. URL awal tetap bisa tercatat di server yang menerima navigasi.
- `order-contract.mjs` menyediakan validasi produk dan normalisasi email yang dapat diimpor oleh Edge Function. Pesanan baru menyertakan `buyer_email`, `email`, dan `customer_email` dengan nilai yang sama. Pemetaan ke kolom tabel atau ke envelope n8n harus diverifikasi. Tahun ajaran berasal dari katalog. Pesanan baru tidak mengirim pilihan semester.

## Kontrak katalog untuk aktivasi

`GET` pada URL `submit-order` harus mengembalikan JSON dengan bentuk berikut. Nilainya hanya contoh uji.

```json
{"products":[{"academic_year":"2026/2027","level":"SD","grade":4,"subject":"Matematika"}]}
```

Publikasikan proyeksi tersebut dari katalog Docker melalui sinkronisasi server. Periksa struktur katalog asli dan gunakan nilai mapel yang diterima workflow. Paket guru kelas mengandalkan nama kanonis Bahasa Indonesia, Matematika, Pendidikan Pancasila, dan IPAS. Jika identifier V22 berbeda, petakan secara eksplisit setelah memeriksa katalog dan workflow. Pastikan manifest hanya memuat baris aktif yang kompatibel. Sertakan hanya empat field contoh dalam respons publik. Browser mengunci formulir bila katalog gagal dimuat. Pada backend, katalog yang gagal dibaca atau sudah kedaluwarsa harus mencegah penerimaan SKU baru.

## Contoh payload

Berikut potongan `form_data`. Request tetap berbentuk `{ token, form_data }` dan menyertakan field identitas pelanggan.

```json
[
  {"package_code":"ADM-SINGLE","level":"SD","grade":4,"subject":"Matematika","academic_year":"2026/2027","buyer_email":"guru@example.com","email":"guru@example.com","customer_email":"guru@example.com"},
  {"package_code":"ADM-SD-CLASS","level":"SD","grade":4,"academic_year":"2026/2027","buyer_email":"guru@example.com","email":"guru@example.com","customer_email":"guru@example.com"},
  {"package_code":"ADM-SUBJECT-MULTI","level":"SMP","subject":"PJOK","grades":[7,8,9],"academic_year":"2026/2027","buyer_email":"guru@example.com","email":"guru@example.com","customer_email":"guru@example.com"}
]
```

## Pengujian

Jalankan `node --test order-contract.test.mjs`. Fixture mencakup Matematika SD 4, paket kelas SD 4, PJOK SMP 7–9, Biologi SMA 11–12, Seni tidak tersedia, data katalog rusak, SMK, jenjang dan tahun yang salah, kelas duplikat, serta email lama dan email invalid. Data produksi, token invalid/kedaluwarsa/terpakai, idempotensi setelah refresh, dan rangkaian Supabase → n8n → V22 masih perlu diuji.

## Deployment minimum

1. Ambil source fungsi, definisi tabel/RPC tanpa data pelanggan, node pemetaan n8n, dan contoh katalog yang sudah disanitasi. Verifikasi alur transaksi token dan perilaku saat respons hilang.
2. Dalam staging, tambahkan GET dan CORS ke fungsi yang sama. Untuk tiga SKU baru, validasi ulang identitas dan produk terhadap manifest server sebelum mengeksekusi transaksi lama. Terapkan normalisasi email dalam fungsi dan verifikasi pemetaan ke n8n. Pertahankan jalur SKU lama. Jangan mengganti transaksi token dengan operasi baca dan tulis terpisah.
3. Uji dengan token staging, termasuk token kedaluwarsa dan terpakai, POST bersamaan dan respons terputus setelah transaksi. Untuk konfirmasi otomatis setelah timeout atau refresh diperlukan kontrak replay dari backend yang bisa mengembalikan pesanan yang sama dengan aman. Frontend saat ini menampilkan status belum terkonfirmasi.
4. Setelah staging menghasilkan artefak V22 dan mengirimkannya ke email uji, deploy fungsi dan sinkronisasi katalog terlebih dahulu. Publikasikan `index.html`, `order-form.mjs`, dan `order-contract.mjs` bersama setelah GET/POST terverifikasi. Sampai saat itu, pertahankan halaman produksi yang berjalan.
