# WhatsApp Gateway SaaS - Edisi Node.js Lengkap

Platform SaaS (Software as a Service) WhatsApp Gateway lengkap yang dibangun murni dengan Node.js dan Express. Proyek ini berfungsi penuh, menampilkan arsitektur monolitik, database MySQL, dan antarmuka pengguna yang dirender server menggunakan EJS.

## Fitur Utama

-   **Backend & Frontend Terpadu**: Dibangun sepenuhnya dengan Node.js, Express, dan EJS untuk kesederhanaan dan kinerja.
-   **Tanpa Proses Build**: Tidak ada langkah kompilasi atau build yang rumit. Cukup instal dependensi dan jalankan.
-   **Panel Admin Fungsional**:
    -   Dasbor admin terpisah dengan login khusus.
    -   **Manajemen Pengguna**: Lihat, blokir, dan buka blokir pengguna.
    -   **Pengaturan Sistem**: Konfigurasikan kunci API Midtrans dan URL notifikasi dari UI.
-   **Panel Pengguna Lengkap**:
    -   Dasbor dinamis yang menampilkan statistik penggunaan (perangkat, pesan, status langganan).
    -   **Manajemen Perangkat**: Tambah perangkat baru dengan memindai QR code secara real-time.
    -   **Pengiriman Pesan**: Kirim pesan teks ke satu atau banyak nomor.
    -   **Batas Penggunaan**: Paket gratis dibatasi hingga 50 pesan per hari.
-   **Integrasi Pembayaran**:
    -   Perpanjang langganan menggunakan Midtrans Core API.
    -   Penanganan notifikasi pembayaran otomatis melalui webhook.
-   **Fitur API Pengguna**:
    -   Hasilkan kunci API unik dari dasbor.
    -   Dokumentasi API untuk mengirim pesan secara terprogram.
-   **Otentikasi Berbasis Sesi**: Sistem login yang aman untuk pengguna dan admin.

---

## Prasyarat

-   **Node.js**: Versi 16.x atau lebih tinggi.
-   **NPM**: Biasanya disertakan dengan Node.js.
-   **MySQL**: Server database yang berjalan.
-   **Git**: Untuk meng-clone repositori.

---

## 🚀 Panduan Instalasi & Konfigurasi

### 1. Clone Repositori

```bash
git clone <URL_REPOSITORI_ANDA>
cd <NAMA_FOLDER_PROYEK>
```

### 2. Konfigurasi Database & Environment

1.  Buat database baru di MySQL Anda: `CREATE DATABASE wagateway;`
2.  Salin file `.env.example` menjadi `.env`. Kredensial database Anda sudah diisi.
    ```bash
    cp .env.example .env
    ```

### 3. Instal Dependensi & Siapkan Database

Jalankan perintah berikut dari **direktori root** proyek.
```bash
# Instal semua dependensi Node.js
npm run install-all

# Jalankan migrasi untuk membuat semua tabel
npm run db:migrate

# (Opsional) Jalankan seeder untuk membuat akun admin & pengguna default
npm run db:seed
```
> **Akun Default:**
> -   **Admin:** `admin@example.com` / `admin123`
> -   **Pengguna:** `user@example.com` / `user123`

---

## ▶️ Menjalankan Aplikasi

```bash
npm start
```
-   **Aplikasi Lengkap** akan berjalan di `http://localhost:8080`.

**Akses Aplikasi:**
-   **Pengguna:** Buka `http://localhost:8080` untuk login.
-   **Admin:** Buka `http://localhost:8080/admin` untuk login.

**Langkah Pertama Setelah Instalasi:**
1.  Login sebagai admin.
2.  Buka halaman **Settings**.
3.  Masukkan **Kunci Server Midtrans** dan **URL Notifikasi** Anda. URL notifikasi harus dapat diakses secara publik (gunakan ngrok untuk pengujian lokal) dan harus menunjuk ke `http://URL_PUBLIK_ANDA/api/v1/payment/notify`.
