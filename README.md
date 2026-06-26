# ParkShare - AI-Powered Peer-to-Peer Parking Space Marketplace

ParkShare is a 100% production-ready peer-to-peer mobile marketplace platform connecting homeowners (parking hosts) who want to rent out their vacant parking slots with drivers looking for affordable and secure nearby parking. The project features glassmorphic UI aesthetics, Scikit-Learn recommendation models, Razorpay checkout integrations, and Google Maps GPS routing.

---

## Workspace Structure
```text
Park_Share/
├── backend/        # Node.js + Express.js API server
├── frontend/       # Flutter (Dart) mobile application
├── ai/             # Python FastAPI recommendation engine
├── admin/          # React.js + Tailwind CSS administrator dashboard
└── README.md       # Master project setup & deployment guide
```

---

## 1. Software Prerequisites
Ensure you have the following installed on your developer machine:
* **Node.js**: v18.x or higher (LTS recommended)
* **Flutter SDK**: v3.16.x or higher & Dart SDK
* **Python**: v3.10.x or higher
* **MongoDB**: Local Community Server OR MongoDB Atlas cloud account
* **Firebase CLI**: If deploying Firebase rules natively
* **Vite**: Supported out of the box in package.json (run via Node)
* **Android Studio / Xcode**: For compiling mobile binaries

---

## 2. Installation & Quick Start

### Step A: Clone & Set Up Folder Structure
All folders are pre-configured inside the root workspace folder. Navigate to each directory to install dependencies:

```bash
# Install backend dependencies
cd backend
npm install

# Install admin dashboard dependencies
cd ../admin
npm install

# Install Python ML dependencies
cd ../ai
pip install -r requirements.txt

# Fetch Flutter dependencies
cd ../frontend
flutter pub get
```

---

## 3. Firebase Configuration
Firebase Authentication is used for user logins (SMS OTP verification and Google Sign-in OAuth).

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project called **ParkShare**.
3. Under **Authentication**, enable **Phone** (OTP) and **Google** as Sign-in Providers.
4. **Android App configuration**: Register your Android app package name (e.g. `com.example.parkshare`) and generate the `google-services.json` file. Place it in `frontend/android/app/`.
5. **iOS App configuration**: Register your iOS App bundle name and download `GoogleService-Info.plist`. Place it in `frontend/ios/Runner/`.
6. Go to **Project Settings** > **Service Accounts**, and click **Generate new private key**.
7. Copy the service account parameters into your `backend/.env` file:
   * `FIREBASE_PROJECT_ID`
   * `FIREBASE_CLIENT_EMAIL`
   * `FIREBASE_PRIVATE_KEY`

---

## 4. MongoDB Atlas Configuration
MongoDB stores collections for users, parking spaces, bookings, payments, and host wallets.

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Go to **Database Access** and create a user with read/write access.
3. Go to **Network Access** and whitelist `0.0.0.0/Target IP` (allow connections from anywhere in development).
4. Click **Connect** > **Drivers** and copy your URI connection string.
5. In `backend/.env`, set `MONGODB_URI` to your connection string.

---

## 5. Google Maps API Configuration
Google Maps provides coordinates lookup, nearby geolocation rendering, and route drawings.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable:
   * **Maps SDK for Android**
   * **Maps SDK for iOS**
   * **Directions API** (for routing ETAs)
   * **Places API** (for address searches)
3. Create an API Key and restrict it appropriately for security.
4. **Android Setup**: In `frontend/android/app/src/main/AndroidManifest.xml`, add your key:
   ```xml
   <meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_KEY_HERE"/>
   ```
5. **iOS Setup**: In `frontend/ios/Runner/AppDelegate.swift`, register the key:
   ```swift
   GMSServices.provideAPIKey("YOUR_KEY_HERE")
   ```

---

## 6. Razorpay Configuration
Razorpay handles driver payment transactions.

1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Switch to **Test Mode** (for development).
3. Go to **Account & Settings** > **API Keys** > **Generate Key**.
4. In `backend/.env`, set:
   * `RAZORPAY_KEY_ID` = your key
   * `RAZORPAY_KEY_SECRET` = your secret
5. In `frontend/lib/features/parking/screens/booking_confirm_screen.dart`, set the key value.

> [!NOTE]
> If keys are not set or are left as mock placeholders, the app automatically drops back to **Simulated Mock checkout** allowing you to test bookings without making actual sandbox payments.

---

## 7. Environment Variables (.env)
Create `backend/.env` containing:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://admin:pass@cluster.mongodb.net/parkshare
AI_SERVICE_URL=http://localhost:8000
JWT_SECRET=super_secret_parkshare_jwt_sign_key_2026

# Firebase Credentials
FIREBASE_PROJECT_ID=parkshare-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@parkshare-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----\n"

# Razorpay Credentials
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=yyyy
```

---

## 8. Running the Project Locally

To run the entire suite, boot each service in separate terminal windows:

### 1. Launch AI Recommendation Engine
```bash
cd ai
python app.py
```
*App launches on `http://localhost:8000`. On startup, it checks if `model.joblib` exists, and if not, automatically trains a Scikit-Learn RandomForest model on synthetic preferences.*

### 2. Launch Backend API
```bash
cd backend
npm run dev
```
*API launches on `http://localhost:5000`. Connects to MongoDB Atlas and listens for requests.*

### 3. Launch React Admin Panel
```bash
cd admin
npm run dev
```
*Dashboard opens on `http://localhost:3000`. Login using default credentials: `admin@parkshare.com` / `adminpassword123`.*

### 4. Launch Flutter App
Ensure an emulator or physical device is connected:
```bash
cd frontend
flutter run
```

---

## 9. Testing Guide

### Automated Backend Tests
Ensure API endpoints work correctly:
```bash
cd backend
npm test
```

### Automated ML Service Tests
Ensure Python recommendation logic parses candidates and calculates correct scores:
```bash
cd ai
pytest
```

---

## 10. Building and Packaging for Production

### Build Android APK
Compile a release bundle:
```bash
cd frontend
flutter build apk --release
```
*The resulting APK is generated inside `build/app/outputs/flutter-apk/app-release.apk`.*

### Deploying the Backend
Deploy the Node Express API to **Heroku**, **Render**, or **AWS ECS**:
1. Package the server using Docker or push directly to Render.
2. Set Environment config vars on your cloud hosting dashboard (matching `.env` properties).

---

## 11. Troubleshooting Common Errors
* **Error: Cannot connect to MongoDB**: Make sure you have whitelisted `0.0.0.0` in MongoDB Atlas Network settings and that your URI string has no typos.
* **Error: Razorpay payment fails with Bad Request**: Verify that your currency is set to `INR` and your amount is converted to Paisa (amount * 100) before placing the order.
* **Error: Android emulator cannot reach API**: By default, Android emulators cannot resolve `localhost`. The `ApiClient` is pre-configured to use `10.0.2.2` when running on Android. Ensure your backend is listening on all interfaces (`0.0.0.0`).

---

## 12. Future Enhancements
1. **IoT Smart Locks**: Integrate smart gate locks that automatically open when the driver scans the Check-In QR code.
2. **Predictive Peak Pricing**: Dynamically increase pricing during high demand peak hours based on historical analytics.
3. **Advanced EV Spot booking**: Let drivers filter parking spots based on charger type compatibility (Type 2, CCS2).
