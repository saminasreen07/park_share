# ParkShare Setup & Integration Guide

This guide details the steps to configure and run the unified responsive ParkShare peer-to-peer parking marketplace using Next.js and Supabase.

---

## 1. Supabase Project Setup & Configurations

### Step 1: Create a Project
1. Go to [Supabase Console](https://supabase.com) and log in.
2. Click **New Project** and select your organization.
3. Fill in:
   * **Name**: `ParkShare`
   * **Database Password**: Enter a secure password (store it safely).
   * **Region**: Select the closest region to your users.
4. Click **Create new project** and wait 2-3 minutes for provision.

### Step 2: Retrieve API credentials
1. Navigate to **Project Settings** -> **API**.
2. Locate and copy:
   * **Project URL**: `https://your-project.supabase.co`
   * **Anon Public Key** (under `anon public` key card)
   * **Service Role Key** (under `service_role` card) -> Keep this key secret, only use on the server!

### Step 3: Run Database Migrations
1. Navigate to **SQL Editor** in the left menu.
2. Click **New Query**.
3. Copy the entire contents of the project's [supabase_schema.sql](file:///c:/Users/srahu/Desktop/ParkShare/park_share/supabase_schema.sql) file and paste it into the query editor.
4. Click **Run**. This will create the `profiles`, `parking_spaces`, `bookings`, `payments`, `reviews`, `favorites`, `tickets`, and `notifications` tables, triggers for auth profiles, and all Row Level Security policies.

### Step 4: Configure Storage Buckets
1. Navigate to **Storage** in the left menu.
2. Create three buckets (Click **New Bucket**):
   * **`parking-spaces`**: Set as **Public** (anyone can view space photos).
   * **`owner-verification`**: Keep as **Private** (kyc documents).
   * **`driver-documents`**: Keep as **Private** (driver booking documents).
3. Ensure these bucket names match the RLS rules defined in `supabase_schema.sql`.

### Step 5: Configure Auth Providers
* **Email Auth**: Enabled by default. Navigate to **Authentication** -> **Providers** -> **Email** to toggle configurations.
* **Phone OTP**: Configure an SMS provider (e.g. Twilio) under **Authentication** -> **Providers** -> **Phone**.
  * For local testing without active SMS credit, navigate to the **Phone** provider settings, enable **Phone OTP**, and configure **Test Phone Numbers** (e.g. `+919999999999` with OTP `123456`). This allows seamless local testing of the OTP auth flow using the genuine Supabase SDK.
* **Google Login**: Navigate to **Authentication** -> **Providers** -> **Google**. Follow Google Cloud Console instructions to create OAuth Web Client credentials, and input the Client ID and Client Secret.

---

## 2. Environment Variables Setup

Create a `.env.local` file inside the `web/` folder with the following variables:

```env
# Next.js App configuration URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Configurations
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-secure-service-role-key

# Google Maps API Configurations
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Razorpay API Configurations
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Telegram Bot API Configurations
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_NOTIFICATIONS_CHAT_ID=your-group-or-channel-chat-id
```

---

## 3. Telegram Bot Setup

To send booking alerts and navigation links to drivers, owners, and administrators:

1. **Create the Bot**:
   * Open Telegram and search for `@BotFather`.
   * Send `/newbot` command.
   * Enter a display name for the bot (e.g., `ParkShare Notifications Bot`).
   * Enter a username for the bot ending in `bot` (e.g., `parkshare_alerts_bot`).
   * BotFather will return a **HTTP API Token** (e.g. `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`). Copy this value as `TELEGRAM_BOT_TOKEN`.

2. **Retrieve Group Chat ID**:
   * Create a new Telegram Group containing yourself, your staff/hosts, and invite the newly created bot.
   * Send a dummy message in the group: `hello bot`.
   * Open your browser and navigate to: `https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/getUpdates`
   * Search for `"chat": {"id": -XXXXXXXXX` in the JSON response. Copy this ID (usually starts with a negative sign) and set it as `TELEGRAM_NOTIFICATIONS_CHAT_ID`.
   * Ensure the bot has administrator permissions in the group to send messages.

---

## 4. Google Maps API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create or select a project.
3. Navigate to **APIs & Services** -> **Library**.
4. Enable the following APIs:
   * **Maps JavaScript API** (for rendering map pins and markers).
   * **Places API** (for address search and autocomplete).
   * **Directions API** (for drawing routes and distance/ETA calculations).
5. Navigate to **APIs & Services** -> **Credentials**.
6. Click **Create Credentials** -> **API key**. Copy the generated key as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
7. (Recommended for production): Restrict the API key usage to your website domain (e.g. `*.parkshare.com/*`) and to only allow the enabled maps services.

---

## 5. Razorpay Payments Setup

1. Create or log in to a [Razorpay Developer Account](https://dashboard.razorpay.com).
2. Toggle to **Test Mode** (or Live Mode if deploying to production).
3. Navigate to **Settings** -> **API Keys**.
4. Click **Generate Key**.
5. Copy the generated keys:
   * **Key ID**: Set as `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
   * **Key Secret**: Set as `RAZORPAY_KEY_SECRET`.
6. Simulated Mode: If these environment variables are left blank or configured as placeholders in development, the ParkShare checkout UI automatically detects the missing keys and activates the high-fidelity mock simulation buttons, allowing you to test success/failure flows without making network requests to Razorpay.

---

## 6. Local Development

To run the application locally:

1. Install dependencies inside the `web/` folder:
   ```bash
   cd web
   npm install
   ```
2. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser. Next.js will compile the routes on-the-fly.

---

## 7. Production Deployment

The unified Next.js + Supabase application is optimized to run as a single deployment on hosting platforms like **Vercel**:

1. Push your code repository to GitHub/GitLab.
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your repository.
4. Configure the **Build Settings**:
   * **Framework Preset**: Next.js
   * **Root Directory**: `web` (extremely important!)
5. Expand **Environment Variables** and add all variables listed in the `.env` section.
6. Click **Deploy**. Vercel will build and serve your app at a public `.vercel.app` domain.
