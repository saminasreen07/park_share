import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

let razorpayInstance = null;
let isMockRazorpay = false;

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

const hasValidConfig = keyId && 
                        keySecret && 
                        !keyId.includes('rzp_test_mock');

if (hasValidConfig) {
  try {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    console.log('Razorpay SDK initialized successfully.');
  } catch (error) {
    console.warn('Razorpay initialization failed, using Mock Mode:', error.message);
    isMockRazorpay = true;
  }
} else {
  console.log('Razorpay configuration is using placeholder values. Running in MOCK Mode.');
  isMockRazorpay = true;
}

export const getRazorpayInstance = () => razorpayInstance;
export const isRazorpayMocked = () => isMockRazorpay;
