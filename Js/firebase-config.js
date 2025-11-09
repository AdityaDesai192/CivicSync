// ===== firebase-config.js =====

// TODO: Replace the values below with your Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBQ32MsdHlNAAElcjN1UFOe15EZinphvaA",
  authDomain: "my-college-project-c5706.firebaseapp.com",
  projectId: "my-college-project-c5706",
  storageBucket: "my-college-project-c5706.firebasestorage.app",
  messagingSenderId: "386611950525",
  appId: "1:386611950525:web:c3b86e4acb6fa7523f18d4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

