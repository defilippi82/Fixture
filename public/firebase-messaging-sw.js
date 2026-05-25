// Importar los scripts de Firebase Service Worker desde la CDN
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuración de tu proyecto (Podés usar los mismos datos de tu consola)
const firebaseConfig = {
  apiKey: "AIzaSyCvQb2hS5Vqpfojz8z_Gdau2tmCfo5mrEs",
  authDomain: "fixture-84f3d.firebaseapp.com",
  projectId: "fixture-84f3d",
  storageBucket: "fixture-84f3d.firebasestorage.app",
  messagingSenderId: "352771152101",
  appId: "1:352771152101:web:240a81805a0ab8b6c0dc0c",
  measurementId: "G-NWEH8ZXR2X"
};

// Inicializar Firebase dentro del Service Worker
firebase.initializeApp(firebaseConfig);

// Recuperar el motor de mensajería
const messaging = firebase.messaging();

// Opcional: Manejar notificaciones cuando la app está en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación recibida en segundo plano: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico' // Ajustá el ícono si tenés otro
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});