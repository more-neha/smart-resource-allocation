/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

// Firebase Messaging Service Worker for Push Notifications
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBiL62ezp5ekK0L3ask17wPWwaZKLnve-A",
  authDomain: "smart-resource-allocatio-f9756.firebaseapp.com",
  projectId: "smart-resource-allocatio-f9756",
  storageBucket: "smart-resource-allocatio-f9756.firebasestorage.app",
  messagingSenderId: "246826595651",
  appId: "1:246826595651:web:918a289e986544df05ebf6",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "SmartAid Notification";
  const options = {
    body: payload.notification?.body || "You have a new update.",
    icon: "/smartaid-logo.svg",
    data: { url: payload.data?.click_action || "/volunteer-dashboard" },
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/volunteer-dashboard";
  event.waitUntil(clients.openWindow(url));
});
