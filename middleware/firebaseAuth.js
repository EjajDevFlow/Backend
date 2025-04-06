import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK if it hasn't been initialized yet
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('No authorization header');
      return res.status(401).json({ message: 'No token provided' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid token format - missing Bearer prefix');
      return res.status(401).json({ message: 'Invalid token format' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      console.log('Invalid token format - empty token');
      return res.status(401).json({ message: 'Invalid token format' });
    }

    console.log('Attempting to verify token...');
    
    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log('Token verified successfully. User ID:', decodedToken.uid);
      
      // Add the decoded token to the request object
      req.user = decodedToken;
      
      next();
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      if (verifyError.code === 'auth/id-token-expired') {
        return res.status(401).json({ message: 'Token expired. Please sign in again.' });
      } else if (verifyError.code === 'auth/argument-error') {
        return res.status(401).json({ message: 'Invalid token format' });
      } else if (verifyError.code === 'auth/invalid-token') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      return res.status(401).json({ message: 'Authentication failed: ' + verifyError.message });
    }
  } catch (error) {
    console.error('Error in auth middleware:', error);
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
}; 