import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");
const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const whoami = document.getElementById("whoami");
const logoutBtn = document.getElementById("logoutBtn");

const bookForm = document.getElementById("bookForm");
const formMsg = document.getElementById("formMsg");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const adminList = document.getElementById("adminList");
const bookCount = document.getElementById("bookCount");

const fields = ["bookId", "title", "author", "rating", "dateRead", "tags", "coverUrl", "review"];
const getField = id => document.getElementById(id);

// ---------- Auth ----------
onAuthStateChanged(auth, user => {
  if (user){
    loginView.classList.add("hidden");
    adminView.classList.remove("hidden");
    whoami.textContent = `signed in as ${user.email}`;
    loadBooks();
  } else {
    adminView.classList.add("hidden");
    loginView.classList.remove("hidden");
  }
});

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginMsg.innerHTML = "";
  const email = getField("email").value.trim();
  const password = getField("password").value;
  try{
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err){
    loginMsg.innerHTML = `<p class="msg error">${friendlyAuthError(err)}</p>`;
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

function friendlyAuthError(err){
  const code = err.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")){
    return "Email or password didn't match. Try again.";
  }
  if (code.includes("too-many-requests")) return "Too many attempts — wait a bit and retry.";
  return "Sign-in failed: " + (err.message || "unknown error");
}

// ---------- Book CRUD ----------
let editingId = null;

bookForm.addEventListener("submit", async e => {
  e.preventDefault();
  formMsg.innerHTML = "";
  saveBtn.disabled = true;

  const payload = {
    title: getField("title").value.trim(),
    author: getField("author").value.trim(),
    rating: Number(getField("rating").value),
    dateRead: getField("dateRead").value,
    tags: getField("tags").value.split(",").map(t => t.trim()).filter(Boolean),
    coverUrl: getField("coverUrl").value.trim(),
    review: getField("review").value.trim()
  };

  try{
    if (editingId){
      await updateDoc(doc(db, "books", editingId), payload);
      formMsg.innerHTML = `<p class="msg ok">Updated "${payload.title}".</p>`;
    } else {
      await addDoc(collection(db, "books"), payload);
      formMsg.innerHTML = `<p class="msg ok">Added "${payload.title}" to the catalog.</p>`;
    }
    resetForm();
    await loadBooks();
  } catch (err){
    console.error(err);
    formMsg.innerHTML = `<p class="msg error">Couldn't save: ${err.message}</p>`;
  } finally {
    saveBtn.disabled = false;
  }
});

cancelEditBtn.addEventListener("click", resetForm);

function resetForm(){
  editingId = null;
  bookForm.reset();
  formTitle.textContent = "Add a book";
  saveBtn.textContent = "Save to catalog";
  cancelEditBtn.classList.add("hidden");
}

function fillFormForEdit(book){
  editingId = book.id;
  getField("title").value = book.title || "";
  getField("author").value = book.author || "";
  getField("rating").value = book.rating || 5;
  getField("dateRead").value = book.dateRead || "";
  getField("tags").value = (book.tags || []).join(", ");
  getField("coverUrl").value = book.coverUrl || "";
  getField("review").value = book.review || "";
  formTitle.textContent = `Editing "${book.title}"`;
  saveBtn.textContent = "Save changes";
  cancelEditBtn.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadBooks(){
  adminList.innerHTML = `<p class="msg">Loading…</p>`;
  try{
    const q = query(collection(db, "books"), orderBy("dateRead", "desc"));
    const snap = await getDocs(q);
    const books = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    bookCount.textContent = books.length;
    renderAdminList(books);
  } catch (err){
    adminList.innerHTML = `<p class="msg error">Couldn't load books: ${err.message}</p>`;
  }
}

function renderAdminList(books){
  if (!books.length){
    adminList.innerHTML = `<p class="msg">No reviews yet — add your first one above.</p>`;
    return;
  }
  adminList.innerHTML = "";
  books.forEach(book => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <img class="thumb" alt="" onerror="this.style.visibility='hidden'">
      <div class="info">
        <strong></strong>
        <span></span>
      </div>
      <div class="actions">
        <button class="edit">Edit</button>
        <button class="danger delete">Delete</button>
      </div>
    `;
    const thumb = row.querySelector(".thumb");
    if (book.coverUrl) thumb.src = book.coverUrl; else thumb.style.visibility = "hidden";
    row.querySelector("strong").textContent = book.title || "Untitled";
    row.querySelector("span").textContent = `${book.author || "Unknown"} · ${book.dateRead || "no date"} · ${"★".repeat(book.rating || 0)}`;
    row.querySelector(".edit").addEventListener("click", () => fillFormForEdit(book));
    row.querySelector(".delete").addEventListener("click", () => deleteBook(book));
    adminList.appendChild(row);
  });
}

async function deleteBook(book){
  if (!confirm(`Delete "${book.title}"? This can't be undone.`)) return;
  try{
    await deleteDoc(doc(db, "books", book.id));
    if (editingId === book.id) resetForm();
    await loadBooks();
  } catch (err){
    alert("Couldn't delete: " + err.message);
  }
}