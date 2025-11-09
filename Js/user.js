// ===== user.js =====
// (Replace your existing user.js with this file)

// Sections and logout
function showSection(sectionId) {
  const sections = document.querySelectorAll(".section");
  sections.forEach(sec => sec.style.display = "none");
  const s = document.getElementById(sectionId);
  if (s) s.style.display = "block";
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = "signin.html";
  });
}

// ===== Helpers =====
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Convert file -> compressed base64 data URL
async function fileToBase64WithResize(file, maxWidth = 1024, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image for resizing"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function base64ByteSize(dataUrl) {
  if (!dataUrl) return 0;
  const base64 = (dataUrl.split(",")[1] || dataUrl);
  const padding = (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  return Math.ceil((base64.length * 3) / 4) - padding;
}

// ===== Fetch Announcements for Home =====
function loadHomeAnnouncements() {
  const ul = document.getElementById("home-announcements");
  if (!ul) return;
  ul.innerHTML = "";
  db.collection("announcements").orderBy("createdAt", "desc").limit(3).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const li = document.createElement("li");
        li.textContent = doc.data().text;
        ul.appendChild(li);
      });
    })
    .catch(err => console.error("Load home announcements:", err));
}

// ===== Submit Complaint (Base64 image) =====
const complaintForm = document.getElementById("complaint-form");
if (complaintForm) {
  complaintForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const title = document.getElementById("complaint-title").value.trim();
      const description = document.getElementById("complaint-description").value.trim();
      const location = document.getElementById("complaint-location").value.trim();
      const imageFile = document.getElementById("complaint-image").files[0];

      const user = auth.currentUser;
      if (!user) {
        alert("Please sign in first.");
        return;
      }

      // disable submit while processing
      const submitBtn = complaintForm.querySelector("button[type='submit']") || complaintForm.querySelector("button");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting..."; }

      // convert and compress image
      let imageBase64 = "";
      if (imageFile) {
        imageBase64 = await fileToBase64WithResize(imageFile, 1024, 0.75);
        const bytes = base64ByteSize(imageBase64);
        const MAX_BYTES = 900000; // ~900 KB safe margin
        if (bytes > MAX_BYTES) {
          alert("Image too large after compression (" + Math.round(bytes/1024) + " KB). Choose a smaller image.");
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Submit Complaint"; }
          return;
        }
      }

      await db.collection("complaints").add({
        title,
        description,
        location,
        imageBase64: imageBase64 || "",
        status: "pending",
        createdBy: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        votesCount: 0
      });

      alert("Complaint submitted!");
      complaintForm.reset();

      // refresh lists
      loadAllComplaints();
      loadVoteComplaints();
      loadStatusList();
      loadPriorityList();
      loadHomeAnnouncements();
    } catch (err) {
      console.error("Submit complaint error:", err);
      alert("Could not submit complaint: " + (err.message || err));
    } finally {
      const submitBtn = complaintForm.querySelector("button[type='submit']") || complaintForm.querySelector("button");
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Submit Complaint"; }
    }
  });
}

// ===== Load all complaints =====
function loadAllComplaints() {
  const ul = document.getElementById("all-complaints");
  if (!ul) return;
  ul.innerHTML = "";

  let pendingCount = 0;
  let completedCount = 0;

  db.collection("complaints").orderBy("createdAt", "desc").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === "pending") pendingCount++;
        if (data.status === "completed") completedCount++;

        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "flex-start";
        li.style.padding = "15px";
        li.style.border = "1px solid #ccc";
        li.style.borderRadius = "8px";
        li.style.marginBottom = "15px";
        li.style.backgroundColor = "#f9f9f9";
        li.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";

        // Text container
        const textDiv = document.createElement("div");
        textDiv.innerHTML = `<strong>${escapeHtml(data.title)}</strong> - ${escapeHtml(data.status || "")}<br>
                             ${escapeHtml(data.description || "")}`;
        li.appendChild(textDiv);

        // Image container
        if (data.imageBase64) {
          const img = document.createElement("img");
          img.src = data.imageBase64;
          img.alt = "Complaint image";
          img.style.maxWidth = "100px";
          img.style.borderRadius = "6px";
          img.style.marginLeft = "20px"; // space from text and right
          img.style.cursor = "pointer";
          img.onclick = () => window.open(data.imageBase64, "_blank");
          li.appendChild(img);
        }

        ul.appendChild(li);
      });

      // Display counts at the top
      const countDiv = document.createElement("div");
      countDiv.style.marginBottom = "15px";
      countDiv.innerHTML = `<strong>Pending: ${pendingCount}</strong> | <strong>Completed: ${completedCount}</strong>`;
      ul.prepend(countDiv);
    })
    .catch(err => console.error("Load all complaints:", err));
}



// ===== Load complaints to vote =====
function loadVoteComplaints() {
  const ul = document.getElementById("vote-complaints");
  if (!ul) return;
  ul.innerHTML = "";
  const user = auth.currentUser;

  db.collection("complaints").where("status", "==", "pending").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.padding = "15px";
        li.style.border = "1px solid #ccc";
        li.style.borderRadius = "8px";
        li.style.marginBottom = "15px";
        li.style.backgroundColor = "#f9f9f9";
        li.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";

        // Text container
        const textDiv = document.createElement("div");
        textDiv.innerHTML = `<strong>${escapeHtml(data.title)}</strong><br>${escapeHtml(data.description || "")}`;
        li.appendChild(textDiv);

        // Image container
        if (data.imageBase64) {
          const img = document.createElement("img");
          img.src = data.imageBase64;
          img.alt = "Complaint image";
          img.style.maxWidth = "100px";
          img.style.borderRadius = "6px";
          img.style.marginLeft = "20px";
          img.style.cursor = "pointer";
          img.onclick = () => window.open(data.imageBase64, "_blank");
          li.appendChild(img);
        }

        // Vote button (uniform width)
        const voteBtn = document.createElement("button");
        voteBtn.textContent = "Vote";
        voteBtn.style.width = "100px";
        voteBtn.style.padding = "8px 0";
        voteBtn.style.marginLeft = "15px";
        voteBtn.style.borderRadius = "5px";
        voteBtn.style.backgroundColor = "#28a745";
        voteBtn.style.color = "#fff";
        voteBtn.style.border = "none";
        voteBtn.style.cursor = "pointer";

        voteBtn.onclick = () => {
          db.collection("complaints").doc(doc.id)
            .collection("votes").doc(user.uid).set({
              votedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
              db.collection("complaints").doc(doc.id)
                .update({ votesCount: firebase.firestore.FieldValue.increment(1) });
              alert("Voted successfully!");
              loadVoteComplaints(); // refresh after voting
            });
        };

        li.appendChild(voteBtn);
        ul.appendChild(li);
      });
    })
    .catch(err => console.error("Load vote complaints:", err));
}


// ===== Load status list =====
function loadStatusList() {
  const ul = document.getElementById("status-list");
  if (!ul) return;
  ul.innerHTML = "";

  db.collection("complaints").orderBy("createdAt", "desc").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.padding = "15px";
        li.style.border = "1px solid #ccc";
        li.style.borderRadius = "8px";
        li.style.marginBottom = "15px";
        li.style.backgroundColor = "#f9f9f9";
        li.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";

        // Text container
        const textDiv = document.createElement("div");
        textDiv.innerHTML = `<strong>${escapeHtml(data.title)}</strong><br>${escapeHtml(data.description || "")}`;
        li.appendChild(textDiv);

        // Image container
        if (data.imageBase64) {
          const img = document.createElement("img");
          img.src = data.imageBase64;
          img.alt = "Complaint image";
          img.style.maxWidth = "100px";
          img.style.borderRadius = "6px";
          img.style.marginLeft = "20px";
          img.style.cursor = "pointer";
          img.onclick = () => window.open(data.imageBase64, "_blank");
          li.appendChild(img);
        }

        // Status tag
        const statusTag = document.createElement("span");
        statusTag.textContent = data.status || "pending";
        statusTag.style.padding = "6px 12px";
        statusTag.style.borderRadius = "12px";
        statusTag.style.backgroundColor = data.status === "pending" ? "#ffc107" : "#28a745";
        statusTag.style.color = "#fff";
        statusTag.style.fontWeight = "bold";
        li.appendChild(statusTag);

        ul.appendChild(li);
      });
    })
    .catch(err => console.error("Load status complaints:", err));
}

// ===== Load priority list (sorted by votesCount desc) =====
function loadPriorityList() {
  const ul = document.getElementById("priority-list");
  if (!ul) return;
  ul.innerHTML = "";

  db.collection("complaints").where("status", "==", "pending")
    .orderBy("votesCount", "desc").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.padding = "15px";
        li.style.border = "1px solid #ccc";
        li.style.borderRadius = "8px";
        li.style.marginBottom = "15px";
        li.style.backgroundColor = "#f9f9f9";
        li.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";
        li.style.position = "relative";

        // Text container
        const textDiv = document.createElement("div");
        textDiv.innerHTML = `<strong>${escapeHtml(data.title)}</strong><br>${escapeHtml(data.description || "")}`;
        li.appendChild(textDiv);

        // Image container
        if (data.imageBase64) {
          const img = document.createElement("img");
          img.src = data.imageBase64;
          img.alt = "Complaint image";
          img.style.maxWidth = "100px";
          img.style.borderRadius = "6px";
          img.style.marginLeft = "20px";
          img.style.cursor = "pointer";
          img.onclick = () => window.open(data.imageBase64, "_blank");
          li.appendChild(img);
        }

        // Vote count tag
        const voteTag = document.createElement("span");
        voteTag.textContent = `Votes: ${data.votesCount || 0}`;
        voteTag.style.backgroundColor = "#007bff";
        voteTag.style.color = "#fff";
        voteTag.style.padding = "4px 8px";
        voteTag.style.borderRadius = "12px";
        voteTag.style.position = "absolute";
        voteTag.style.top = "10px";
        voteTag.style.right = "10px";
        li.appendChild(voteTag);

        ul.appendChild(li);
      });
    })
    .catch(err => console.error("Load priority complaints:", err));
}


// ===== Load announcements for announcements page =====
function loadAnnouncementsPage() {
  const ul = document.getElementById("announcements-list");
  if (!ul) return;
  ul.innerHTML = "";

  db.collection("announcements").orderBy("createdAt", "desc").limit(5).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();

        const card = document.createElement("div");
        card.style.border = "1px solid #ccc";
        card.style.borderRadius = "8px";
        card.style.padding = "15px";
        card.style.marginBottom = "15px";
        card.style.backgroundColor = "#f5f5f5";
        card.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";
        card.style.position = "relative";

        // Announcement text
        const textDiv = document.createElement("div");
        textDiv.textContent = data.text || "";
        textDiv.style.fontSize = "16px";
        textDiv.style.fontWeight = "500";
        card.appendChild(textDiv);

        // Timestamp
        const timeDiv = document.createElement("div");
        const createdAt = data.createdAt ? data.createdAt.toDate().toLocaleString() : "";
        timeDiv.textContent = createdAt;
        timeDiv.style.fontSize = "12px";
        timeDiv.style.color = "#555";
        timeDiv.style.marginTop = "8px";
        card.appendChild(timeDiv);

        ul.appendChild(card);
      });
    })
    .catch(err => console.error("Load announcements:", err));
}


// ===== Initialize user page =====
auth.onAuthStateChanged(user => {
  if (user) {
    loadHomeAnnouncements();
    loadAllComplaints();
    loadVoteComplaints();
    loadStatusList();
    loadPriorityList();
    loadAnnouncementsPage();
  } else {
    window.location.href = "signin.html";
  }
});
