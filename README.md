# WhatsApp Gateway SaaS - Edisi Node.js Murni

Platform SaaS (Software as a Service) WhatsApp Gateway lengkap yang dibangun murni dengan Node.js dan Express. Proyek ini sangat sederhana, menampilkan arsitektur monolitik, database MySQL, dan antarmuka pengguna yang dirender server menggunakan EJS.

## Fitur Utama

-   **Backend & Frontend Terpadu**: Dibangun sepenuhnya dengan Node.js, Express, dan EJS untuk kesederhanaan dan kinerja.
-   **Tanpa Proses Build**: Tidak ada langkah kompilasi atau build yang rumit. Cukup instal dependensi dan jalankan.
-   **Otentikasi Berbasis Sesi**: Sistem login yang aman menggunakan sesi yang disimpan di database.
-   **Fungsionalitas API Tetap Ada**: Semua rute API asli (`/api/v1/...`) tetap berfungsi untuk integrasi eksternal.

---

## Prasyarat

-   **Node.js**: Versi 16.x atau lebih tinggi.
-   **NPM**: Biasanya disertakan dengan Node.js.
-   **MySQL**: Server database yang berjalan.
-   **Git**: Untuk meng-clone repositori.

---

## 🚀 Panduan Instalasi & Konfigurasi Cepat

### 1. Clone Repositori

```bash
git clone <URL_REPOSITORI_ANDA>
cd <NAMA_FOLDER_PROYEK>
```

### 2. Konfigurasi Database & Environment

1.  Buat database baru di MySQL Anda.
    ```sql
    CREATE DATABASE wagateway;
    ```
2.  Proyek ini menggunakan satu file `.env` di direktori **root**. Cukup salin file contoh dan edit jika perlu. **Kredensial default sudah diisi.**
    ```bash
    cp .env.example .env
    ```

### 3. Instal Dependensi

Jalankan dari **direktori root** proyek. Ini akan menginstal dependensi backend.
```bash
npm install
```

### 4. Jalankan Migrasi Database & Seeder

Jalankan perintah berikut dari **direktori root** untuk membuat tabel dan akun admin default.
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

Tidak ada lagi mode pengembangan atau produksi yang terpisah. Cukup jalankan perintah start.

```bash
npm start
```
-   **Aplikasi Lengkap** akan berjalan di `http://localhost:8080`.

Buka `http://localhost:8080` di browser Anda untuk melihat halaman login.
