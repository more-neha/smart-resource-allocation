import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Firebase Cloud Messaging — Push Notifications
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  // Messaging not supported in this browser
}

/**
 * Request notification permission, get FCM token, and register it with the backend.
 */
export async function requestNotificationPermission() {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;

    const token = await getToken(messaging, { vapidKey });
    if (!token) return null;

    // Register token with backend
    const authToken = localStorage.getItem("smartaid_token");
    if (authToken) {
      const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      await fetch(`${API_BASE}/api/notifications/register-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });
    }

    return token;
  } catch (err) {
    return null;
  }
}

/**
 * Listen for foreground push messages and show a browser notification.
 */
export function onForegroundMessage(callback) {
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    if (callback) callback(payload);
    // Show browser notification for foreground messages
    if (Notification.permission === "granted") {
      new Notification(payload.notification?.title || "SmartAid", {
        body: payload.notification?.body || "New update available",
      });
    }
  });
}
