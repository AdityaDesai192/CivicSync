// ===== auth.js =====

// Initialize Firebase Auth and Firestore


// Grab input fields and buttons from HTML (ensure your HTML IDs match)
const signUpEmail = document.getElementById("signup-email");
const signUpPassword = document.getElementById("signup-password");
const signUpBtn = document.getElementById("signup-btn");

const signInEmail = document.getElementById("signin-email");
const signInPassword = document.getElementById("signin-password");
const signInBtn = document.getElementById("signin-btn");

// ===== Sign-Up Function =====
if (signUpBtn) {
  signUpBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const email = signUpEmail.value.trim().toLowerCase();
    const password = signUpPassword.value;

    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        // Set role in Firestore: admin or user
        const role = (email === "admin_email@gmail.com") ? "admin" : "user";

        db.collection("users").doc(user.uid).set({
          email: email,
          role: role,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
          alert("Sign-up successful!");
          if (role === "admin") {
            window.location.href = "admin_home.html";
          } else {
            window.location.href = "user_home.html";
          }
        })
        .catch((error) => {
          alert("Error saving user data: " + error.message);
        });
      })
      .catch((error) => {
        alert("Sign-up failed: " + error.message);
      });
  });
}

// ===== Sign-In Function =====
if (signInBtn) {
  signInBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const email = signInEmail.value.trim().toLowerCase();
    const password = signInPassword.value;

    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        // Fetch role from Firestore to redirect
        db.collection("users").doc(user.uid).get()
          .then((doc) => {
            if (doc.exists) {
              const role = doc.data().role;
              if (role === "admin") {
                window.location.href = "admin_home.html";
              } else {
                window.location.href = "user_home.html";
              }
            } else {
              alert("No user data found. Please sign up first.");
              auth.signOut();
            }
          })
          .catch((error) => {
            alert("Error fetching user data: " + error.message);
          });
      })
      .catch((error) => {
        alert("Sign-in failed: " + error.message);
      });
  });
}
