const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyClF3SzURrjqotoiktttSKq-zID-3DQRLg",
  authDomain:        "nuke3000.firebaseapp.com",
  projectId:         "nuke3000",
  storageBucket:     "nuke3000.firebasestorage.app",
  messagingSenderId: "306775845871",
  appId:             "1:306775845871:web:73ac781a2f10bd979a241a",
};

if (typeof ONLINE !== 'undefined') {
  ONLINE.init(FIREBASE_CONFIG);
}
