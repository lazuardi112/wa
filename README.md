# WhatsApp Gateway SaaS Platform

This is a comprehensive, multi-user SaaS platform that allows users to connect their WhatsApp accounts and send messages programmatically via API or through a user-friendly web interface. It includes a full-featured admin panel for managing users, transactions, and system settings.

## Features

### User Features
- **Device Management**: Connect multiple WhatsApp devices by scanning a QR code.
- **Advanced Messaging**: Send messages via a tabbed UI for single text, media (image/document) uploads, and bulk messaging.
- **Complex Bot Builder**:
    - Create automated responses based on prefix keywords.
    - Build complex, branching conversation flows using a parent-child structure.
    - Bot responses can be a sequence of multiple messages (text and images).
    - Toggle bots on/off, edit, and delete them.
- **API Access**: Generate an API key to send messages programmatically.
- **Subscription System**: Tiered access with a Free plan and upgradable Premium plan.
- **Transaction History**: View a complete history of all payments.

### Admin Features
- **Admin Dashboard**: At-a-glance statistics of the platform's health (total users, revenue, etc.).
- **User Management**: View a list of all registered users.
- **Transaction Management**: View a complete history of all transactions on the platform.
- **System Settings**:
    - Configure Midtrans API keys (Server & Client).
    - Set a notification URL override for Midtrans webhooks.
    - Designate a global OTP device for sending verification codes.

## Prerequisites

- Node.js (v16 or later)
- MySQL Server

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo.git
    cd your-repo
    ```

2.  **Create `.env` file:**
    Copy the `.env.example` file to a new `.env` file and fill in your environment variables.
    ```bash
    cp .env.example .env
    ```

    **Required `.env` Variables:**
    - `DB_HOST`: Your MySQL database host.
    - `DB_USER`: Your MySQL username.
    - `DB_PASSWORD`: Your MySQL password.
    - `DB_NAME`: Your database name (must be created beforehand).
    - `SESSION_SECRET`: A long, random string for securing sessions.
    - `MIDTRANS_IS_PRODUCTION`: `false` for sandbox, `true` for production.
    - `MIDTRANS_SERVER_KEY`: Your Midtrans Server Key.
    - `MIDTRANS_CLIENT_KEY`: Your Midtrans Client Key.

    **Optional `.env` Variables:**
    - `ADMIN_USERNAME`: The username for the admin login (defaults to `admin`).
    - `ADMIN_PASSWORD`: The password for the admin login (defaults to `admin123`).

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Run Database Migrations & Seeders:**
    This command will create all necessary tables and populate the `Packages` table with default "Free" and "Premium" plans.
    ```bash
    npm run db:migrate
    npm run db:seed
    ```

5.  **Run the Application:**
    ```bash
    npm start
    ```
    The application will be running at `http://localhost:8080`.

## Getting Started

1.  **Admin Login**: Navigate to `http://localhost:8080/admin/login` and log in with the admin credentials.
2.  **Configure Settings**: In the admin panel, go to **Settings** and configure your Midtrans keys and select a device to act as the global OTP sender (you will need to register a normal user and connect a device first to do this).
3.  **User Registration**: You can now register a new user account from the main page. You will receive an OTP on WhatsApp from the device you configured.
4.  **Connect Device**: Log in as the new user, go to the **Devices** page, and scan the QR code.
5.  **Explore**: You can now use the messaging features, build bots, or generate an API key from the **API Docs** page.

