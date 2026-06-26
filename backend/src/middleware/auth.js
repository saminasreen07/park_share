import admin, { isFirebaseMocked } from '../config/firebase.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // 1. Check if Firebase is running in mock mode or token is simulated
      if (isFirebaseMocked() || token.startsWith('mock-')) {
        let email = 'driver@example.com';
        let name = 'Mock Driver';
        let phone = '+919999999999';
        let role = 'driver';

        if (token.includes('owner')) {
          email = 'owner@example.com';
          name = 'Mock Owner';
          phone = '+918888888888';
          role = 'owner';
        } else if (token.includes('admin')) {
          email = 'admin@example.com';
          name = 'Mock Admin';
          phone = '+917777777777';
          role = 'admin';
        }

        // If a specific ID is provided in mock token, e.g. mock-owner-65f80b12a3d0...
        const parts = token.split('-');
        let mockId = null;
        if (parts.length > 2) {
          mockId = parts[2];
        }

        let user;
        if (mockId && mockId.length === 24) {
          // If valid mongo id, search by id
          user = await User.findById(mockId);
        }

        if (!user) {
          // Search by email, or create
          user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              name,
              email,
              phone,
              role,
              isVerified: true,
              rating: 5.0,
              firebaseUid: `mock_uid_${role}`,
            });
          }
        }

        req.user = user;
        return next();
      }

      // 2. Production Firebase verification
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (fbErr) {
        // Fallback: Check if JWT is signed locally (useful for React Admin Dashboard)
        try {
          decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_parkshare_jwt_sign_key_2026');
        } catch (jwtErr) {
          throw new Error('Invalid authentication token');
        }
      }

      const email = decodedToken.email;
      let user = await User.findOne({ email });

      if (!user) {
        // Create user records automatically on first successful OAuth or OTP login
        user = await User.create({
          name: decodedToken.name || email.split('@')[0],
          email: email,
          phone: decodedToken.phone_number || '+910000000000',
          role: 'driver', // Default role
          firebaseUid: decodedToken.uid,
          isVerified: true,
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication Error:', error.message);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};
