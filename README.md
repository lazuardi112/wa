# WhatsApp Gateway SaaS Platform

Platform SaaS (Software as a Service) WhatsApp Gateway lengkap yang dibangun dengan tumpukan teknologi modern, menampilkan arsitektur monorepo yang terintegrasi, database MySQL, dan alur pendaftaran pengguna yang aman dengan verifikasi OTP WhatsApp.

## Fitur Utama

- **Backend Kuat**: Dibangun dengan Node.js, Express, dan Sequelize (MySQL) untuk kinerja yang andal dan skalabel.
- **Frontend Modern**: Kerangka React.js dasar yang siap untuk dikembangkan menjadi antarmuka yang modern dan responsif.
- **Verifikasi Pengguna Aman**: Alur pendaftaran baru yang mewajibkan verifikasi nomor WhatsApp melalui OTP, dikirim dari perangkat yang dikonfigurasi admin.
- **Manajemen Sesi Real-time**: Menggunakan Baileys dan Socket.io untuk mengelola koneksi WhatsApp dan memberikan pembaruan status secara langsung.
- **Struktur Monorepo**: Backend dan frontend dikelola dalam satu repositori tetapi tetap terpisah, disederhanakan dengan skrip `npm` dari root.

---

## Prasyarat

Sebelum Anda memulai, pastikan Anda telah menginstal perangkat lunak berikut:

- **Node.js**: Versi 16.x atau lebih tinggi.
- **NPM**: Biasanya disertakan dengan Node.js.
- **MySQL**: Server database MySQL yang berjalan secara lokal atau di jaringan Anda.
- **Git**: Untuk meng-clone repositori.

---

## 🚀 Panduan Instalasi & Konfigurasi

Ikuti langkah-langkah ini untuk menjalankan proyek secara lokal.

### 1. Clone Repositori

```bash
git clone https://github.com/your-username/whatsapp-saas-monorepo.git
cd whatsapp-saas-monorepo
```

### 2. Konfigurasi Database

1.  Masuk ke antarmuka baris perintah MySQL Anda.
2.  Buat database baru untuk proyek ini.

    ```sql
    CREATE DATABASE whatsapp_saas_db;
    ```

### 3. Konfigurasi Environment Backend

1.  Salin file `.env.example` (jika ada) atau buat file baru bernama `.env` di dalam direktori `backend`.
    ```bash
    cp backend/.env.example backend/.env
    ```
    Jika tidak ada, buat file `backend/.env` dan isi dengan konten berikut:

    ```env
    # Server Configuration
    PORT=8080

    # MySQL Database Connection
    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=root # Ganti dengan username MySQL Anda
    DB_PASSWORD=your_mysql_password # Ganti dengan password MySQL Anda
    DB_NAME=whatsapp_saas_db

    # JWT Secret
    JWT_SECRET=your_super_secret_jwt_key

    # Midtrans API Keys (opsional)
    MIDTRANS_SERVER_KEY=
    MIDTRANS_CLIENT_KEY=
    ```

2.  **Penting**: Pastikan untuk mengganti `DB_USER` dan `DB_PASSWORD` dengan kredensial database MySQL Anda.

### 4. Instal Dependensi

Jalankan skrip berikut dari **direktori root** proyek. Skrip ini akan menginstal dependensi untuk root, backend, dan frontend secara otomatis.

```bash
npm run install-all
```

### 5. Jalankan Migrasi Database & Seeder

Untuk membuat semua tabel yang diperlukan dan menambahkan akun admin default, jalankan perintah berikut dari **direktori root**.

**Penting**: Jalankan migrasi terlebih dahulu, baru seeder.

```bash
# Membuat struktur tabel
npm run db:migrate --prefix backend

# Menambahkan akun admin (email: admin@example.com, password: admin123)
npm run db:seed --prefix backend
```

---

## ▶️ Menjalankan Aplikasi

Setelah instalasi dan konfigurasi selesai, Anda dapat memulai server pengembangan backend dan frontend secara bersamaan dengan satu perintah dari **direktori root**:

```bash
npm run dev
```

- **Backend API** akan berjalan di `http://localhost:8080`.
- **Aplikasi Frontend React** akan berjalan di `http://localhost:3000`.

Buka `http://localhost:3000/register` di browser Anda untuk mulai menggunakan aplikasi.

---

## Struktur Proyek

```
/whatsapp-saas-monorepo
├── /backend
│   ├── /config       # Konfigurasi database Sequelize
│   ├── /controllers  # Logika bisnis untuk setiap rute
│   ├── /migrations   # File migrasi database
│   ├── /models       # Definisi model Sequelize
│   ├── /routes       # Definisi endpoint API
│   ├── /services     # Logika inti (misalnya, WhatsApp Service)
│   ├── server.js     # Titik masuk server backend
│   └── package.json  # Dependensi backend
│
├── /frontend
│   ├── /public
│   ├── /src
│   │   ├── /components
│   │   └── /pages      # Komponen halaman React
│   ├── App.js        # Komponen utama dan routing
│   └── package.json  # Dependensi frontend
│
└── package.json        # Skrip untuk mengelola proyek secara keseluruhan
```
