# WhatsApp Gateway SaaS Platform

Platform SaaS (Software as a Service) WhatsApp Gateway lengkap yang dibangun dengan tumpukan teknologi modern. Proyek ini siap pakai, menampilkan arsitektur monorepo yang terintegrasi, database MySQL, dan antarmuka pengguna yang modern, fungsional, dan responsif.

## Fitur Utama

-   **Backend Kuat**: Dibangun dengan Node.js, Express, dan Sequelize (MySQL) untuk kinerja yang andal dan skalabel.
-   **Frontend Fungsional & Modern**: Antarmuka pengguna yang dibangun dengan React.js dan Material-UI, menyediakan pengalaman yang bersih dan responsif di desktop dan seluler.
-   **Otentikasi Berbasis Sesi**: Sistem login yang aman menggunakan sesi yang disimpan di database, dengan alur terpisah untuk pengguna dan admin.
-   **Verifikasi OTP via WhatsApp**: Alur pendaftaran pengguna yang aman mewajibkan verifikasi nomor WhatsApp melalui OTP yang dikirim dari perangkat yang dikonfigurasi admin.
-   **Manajemen Device Real-time**:
    -   Tambah dan hapus perangkat WhatsApp.
    -   Lihat status koneksi (`Connected`, `Disconnected`, dll.) secara real-time.
    -   **Tampilkan QR Code** langsung di dasbor untuk menghubungkan perangkat baru.
-   **Fitur Pengiriman Pesan**:
    -   Kirim pesan tunggal ke satu nomor.
    -   Kirim pesan **Broadcast** ke banyak nomor sekaligus.
-   **Panel Admin Fungsional**:
    -   Dasbor admin terpisah dengan login khusus.
    -   Halaman pengaturan untuk menghubungkan dan mengelola perangkat pengirim OTP.
-   **Arsitektur Terintegrasi**: Dikonfigurasi untuk pengembangan (2 port) dan produksi (port tunggal, 8080), disederhanakan dengan skrip `npm`.

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

### 2. Konfigurasi Database

1.  Buat database baru di MySQL Anda.
    ```sql
    CREATE DATABASE wagateway;
    ```

### 3. Konfigurasi Environment

1.  Buat file `.env` di dalam direktori `backend` dan isi dengan kredensial database Anda:
    ```env
    PORT=8080
    DB_HOST=127.0.0.1
    DB_USER=root
    DB_PASSWORD=your_mysql_password
    DB_NAME=wagateway
    SESSION_SECRET=your_strong_session_secret
    ```
2.  Buat file `.env` di dalam direktori `frontend` dengan konten berikut untuk memastikan server pengembangan berjalan dengan benar:
    ```env
    DANGEROUSLY_DISABLE_HOST_CHECK=true
    HOST=0.0.0.0
    ```

### 4. Instal Dependensi

Jalankan dari **direktori root** proyek. Ini akan menginstal semuanya.
```bash
npm run install-all
```

### 5. Jalankan Migrasi Database & Seeder

Jalankan perintah berikut dari **direktori root** untuk membuat struktur tabel dan menambahkan akun admin default.
```bash
# 1. Membuat struktur tabel
npm run db:migrate --prefix backend

# 2. Menambahkan akun admin default
npm run db:seed --prefix backend
```
> **Akun Admin Default:**
> -   **Email:** `admin@example.com`
> -   **Password:** `admin123`

---

## ▶️ Menjalankan Aplikasi

Anda memiliki dua mode untuk menjalankan aplikasi:

### Mode Pengembangan (Development)

Mode ini sangat ideal untuk pengembangan, dengan hot-reloading untuk backend dan frontend.
```bash
npm run dev
```
-   **Backend API** akan berjalan di `http://localhost:8080`.
-   **Frontend React** akan berjalan di `http://localhost:3000`.

### Mode Produksi (Production)

Mode ini menyimulasikan lingkungan produksi. Frontend akan di-build dan disajikan oleh server backend. Semuanya akan berjalan di **satu port**.
```bash
# 1. Build aplikasi React
npm run build

# 2. Jalankan server produksi
npm start
```
-   **Aplikasi Lengkap** akan berjalan di `http://localhost:8080`.

Buka URL yang sesuai di browser Anda untuk mulai menggunakan aplikasi.
-   Untuk pengguna: `http://localhost:3000/login` (dev) atau `http://localhost:8080/login` (prod).
-   Untuk admin: `http://localhost:3000/admin/login` (dev) atau `http://localhost:8080/admin/login` (prod).
