# WhatsApp Gateway SaaS Platform

Platform ini memungkinkan Anda untuk menghubungkan perangkat WhatsApp Anda dan mengirim pesan melalui API.

## Fitur

*   Manajemen Perangkat (Tambah, Hapus, Sambungkan Ulang)
*   Mengirim Pesan Teks melalui API
*   Otentikasi Pengguna & Admin
*   Panel Pengguna & Admin
*   Sistem Langganan (Integrasi Midtrans)

## Prasyarat

*   Node.js (v16 atau lebih baru)
*   MySQL Server

## Instalasi & Setup

1.  **Clone repositori:**
    ```bash
    git clone https://github.com/username/repo.git
    cd repo
    ```

2.  **Buat file `.env`:**
    Salin file `.env.example` ke `.env` baru.
    ```bash
    cp .env.example .env
    ```
    Sesuaikan variabel di dalam `.env` dengan konfigurasi database dan environment Anda.

    *   `DB_HOST`: Host database MySQL Anda
    *   `DB_USER`: Nama pengguna database
    *   `DB_PASSWORD`: Kata sandi database
    *   `DB_NAME`: Nama database (pastikan Anda sudah membuatnya)
    *   `SESSION_SECRET`: Kunci rahasia acak untuk sesi

3.  **Install dependensi:**
    Jalankan perintah berikut dari direktori root proyek.
    ```bash
    npm install
    ```
    > **Catatan Penting:** Jika Anda mengalami masalah koneksi, pastikan Anda menggunakan versi Baileys terbaru dengan menjalankan:
    > ```bash
    > npm install @whiskeysockets/baileys@latest
    > ```

4.  **Jalankan Migrasi & Seeder Database:**
    Perintah ini akan membuat tabel yang diperlukan dan mengisi data awal (seperti akun admin default).
    ```bash
    npm run db:migrate
    npm run db:seed
    ```
    > **Catatan:** Akun admin default adalah `admin@example.com` dengan kata sandi `admin123`.

5.  **Jalankan Aplikasi:**
    ```bash
    npm start
    ```

Aplikasi sekarang akan berjalan di `http://localhost:8080`.

## Cara Kerja

1.  **Daftar Akun Baru**: Buka aplikasi di browser dan buat akun baru.
2.  **Login**: Masuk ke akun Anda.
3.  **Tambah Perangkat**:
    *   Buka halaman "Devices".
    *   Klik "Add New Device" dan beri nama.
    *   Pindai kode QR yang muncul menggunakan aplikasi WhatsApp di ponsel Anda (Link a device).
4.  **Kirim Pesan**: Gunakan halaman "Messaging" atau "API Docs" untuk mulai mengirim pesan dari perangkat yang terhubung.
