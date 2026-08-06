import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App;

export const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });

  console.log('Firebase initialized successfully');
  return firebaseApp;
};

export const getFirebaseAuth = (): admin.auth.Auth => {
  return initializeFirebase().auth();
};

export const getFirebaseMessaging = (): admin.messaging.Messaging => {
  return initializeFirebase().messaging();
};
