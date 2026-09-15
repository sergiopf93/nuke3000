// ============================================================
//  firebase-config.js — YOUR Firebase project credentials
//
//  ⚠️ AÑADE ESTE ARCHIVO A .gitignore
//     (o usa variables de entorno / Firebase Hosting env vars)
//
//  Cómo obtener estos valores:
//    1. Ve a https://console.firebase.google.com
//    2. Selecciona tu proyecto
//    3. ⚙ Configuración del proyecto → Tus apps → Web app
//    4. Copia el objeto firebaseConfig
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROYECTO.firebaseapp.com",
  projectId:         "TU_PROYECTO",
  storageBucket:     "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID",
};

// Auto-init ONLINE module when this file loads
// (online.js must be loaded before this file)
if (typeof ONLINE !== 'undefined') {
  ONLINE.init(FIREBASE_CONFIG);
}
