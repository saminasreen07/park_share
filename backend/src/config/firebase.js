import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp = null;
let isMockFirebase = false;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Check if credentials are placeholders or empty
const hasValidConfig = projectId && 
                        clientEmail && 
                        privateKey && 
                        !projectId.includes('prod') && 
                        !clientEmail.includes('xxxxx');

if (hasValidConfig) {
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        // Handle newline characters in private key
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.warn('Firebase initialization failed, falling back to Mock Mode:', error.message);
    isMockFirebase = true;
  }
} else {
  console.log('Firebase configuration is missing or using placeholder values. Running in MOCK Mode.');
  isMockFirebase = true;
}

export const getFirebaseApp = () => firebaseApp;
export const isFirebaseMocked = () => isMockFirebase;
export default admin;
