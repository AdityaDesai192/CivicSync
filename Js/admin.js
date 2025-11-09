// ===== admin.js =====

// Sections and logout
function showSection(sectionId) {
  const sections = document.querySelectorAll(".section");
  sections.forEach(sec => sec.style.display = "none");
  document.getElementById(sectionId).style.display = "block";
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = "signin.html";
  });
}

// ===== Load all complaints for Do/Done =====
function loadComplaintsForAdmin() {
  const ul = document.getElementById("complaints-list");
  ul.innerHTML = "";
  db.collection("complaints").orderBy("createdAt", "desc").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const li = document.createElement("li");
        const data = doc.data();
        li.textContent = `${data.title} - ${data.status} `;

        // Button to mark as completed
        const completeBtn = document.createElement("button");
        completeBtn.textContent = "Mark Completed";
        completeBtn.onclick = () => {
          db.collection("complaints").doc(doc.id).update({
            status: "completed"
          }).then(() => {
            alert("Status updated!");
            loadComplaintsForAdmin(); // refresh list
          });
        };

        li.appendChild(completeBtn);
        ul.appendChild(li);
      });
    });
}

// ===== Add Announcement =====
const announcementForm = document.getElementById("announcement-form");
if (announcementForm) {
  announcementForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = document.getElementById("announcement-text").value;
    const user = auth.currentUser;

    db.collection("announcements").add({
      text: text,
      createdBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      alert("Announcement added!");
      document.getElementById("announcement-text").value = "";
      loadAnnouncementsForAdmin();
    });
  });
}

// ===== Load announcements for admin =====
function loadAnnouncementsForAdmin() {
  const ul = document.getElementById("admin-announcements-list");
  ul.innerHTML = "";
  db.collection("announcements").orderBy("createdAt", "desc").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const li = document.createElement("li");
        li.textContent = doc.data().text + " ";

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.onclick = () => {
          db.collection("announcements").doc(doc.id).delete().then(() => {
            alert("Announcement deleted!");
            loadAnnouncementsForAdmin();
          });
        };

        li.appendChild(delBtn);
        ul.appendChild(li);
      });
    });
}

// ===== Initialize admin page =====
auth.onAuthStateChanged(user => {
  if (user) {
    loadComplaintsForAdmin();
    loadAnnouncementsForAdmin();
  } else {
    window.location.href = "signin.html";
  }
});
