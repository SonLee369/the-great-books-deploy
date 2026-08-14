import { db } from "./firebase-config.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const catalogEl = document.getElementById("catalog");
const searchInput = document.getElementById("searchInput");
const tagFilter = document.getElementById("tagFilter");
const sortOrder = document.getElementById("sortOrder");
const resultCount = document.getElementById("resultCount");
const drawerMeta = document.getElementById("drawerMeta");

const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");

let allBooks = [];

function starString(rating){
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

// Deterministic pseudo call-number, purely decorative
function callNumber(book){
  const src = (book.title || "") + (book.author || "");
  let hash = 0;
  for (let i = 0; i < src.length; i++){
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0;
  }
  const digits = (100 + (hash % 900)).toString();
  const letter = (book.author || book.title || "?").trim().charAt(0).toUpperCase() || "?";
  return `${digits}.${(hash % 10)} ${letter}${Math.max(1, book.rating || 1)}`;
}

function formatDate(dateStr){
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function loadBooks(){
  try{
    const q = query(collection(db, "books"), orderBy("dateRead", "desc"));
    const snap = await getDocs(q);
    allBooks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err){
    console.error(err);
    catalogEl.innerHTML = `<p class="empty">Couldn't reach the catalog. If you're the site owner, check that firebase-config.js has your real project keys and that Firestore rules allow public read.</p>`;
    return;
  }
  populateTagFilter();
  render();
}

function populateTagFilter(){
  const tags = new Set();
  allBooks.forEach(b => (b.tags || []).forEach(t => tags.add(t)));
  [...tags].sort().forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tagFilter.appendChild(opt);
  });
}

function getFiltered(){
  const term = searchInput.value.trim().toLowerCase();
  const tag = tagFilter.value;
  let list = allBooks.filter(b => {
    const matchesTerm = !term ||
      (b.title || "").toLowerCase().includes(term) ||
      (b.author || "").toLowerCase().includes(term);
    const matchesTag = !tag || (b.tags || []).includes(tag);
    return matchesTerm && matchesTag;
  });

  switch (sortOrder.value){
    case "date-asc":
      list.sort((a, b) => (a.dateRead || "").localeCompare(b.dateRead || ""));
      break;
    case "rating-desc":
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "title-asc":
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    default:
      list.sort((a, b) => (b.dateRead || "").localeCompare(a.dateRead || ""));
  }
  return list;
}

function render(){
  const list = getFiltered();
  resultCount.textContent = `${list.length} ${list.length === 1 ? "book" : "books"}`;
  drawerMeta.textContent = `${allBooks.length} total on shelf`;

  if (!list.length){
    catalogEl.innerHTML = `<p class="empty">No cards match. Try a different search or shelf.</p>`;
    return;
  }

  catalogEl.innerHTML = "";
  list.forEach(book => {
    const card = document.createElement("button");
    card.className = "card";
    card.setAttribute("aria-haspopup", "dialog");

    const excerpt = (book.review || "").slice(0, 160);
    const coverImg = book.coverUrl
      ? `<img class="cover" src="${escapeHtml(book.coverUrl)}" alt="" loading="lazy" onerror="this.remove()">`
      : "";

    card.innerHTML = `
      ${coverImg}
      <p class="call-no">${callNumber(book)}</p>
      <h3>${escapeHtml(book.title || "Untitled")}</h3>
      <p class="author">${escapeHtml(book.author || "Unknown author")}</p>
      <span class="stars" aria-label="${book.rating || 0} out of 5 stars">${starString(book.rating)}</span>
      <p class="excerpt">${escapeHtml(excerpt)}</p>
      <div class="tags">${(book.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      <div class="stamp">RETURNED<br>${formatDate(book.dateRead)}</div>
    `;
    card.addEventListener("click", () => openModal(book));
    catalogEl.appendChild(card);
  });
}

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function openModal(book){
  const modalCover = document.getElementById("modalCover");
  if (book.coverUrl){
    modalCover.src = book.coverUrl;
    modalCover.hidden = false;
    modalCover.onerror = () => { modalCover.hidden = true; };
  } else {
    modalCover.hidden = true;
    modalCover.removeAttribute("src");
  }
  document.getElementById("modalCallNo").textContent = callNumber(book);
  document.getElementById("modalTitle").textContent = book.title || "Untitled";
  document.getElementById("modalAuthor").textContent = book.author || "Unknown author";
  document.getElementById("modalStars").textContent = starString(book.rating);
  document.getElementById("modalReview").textContent = book.review || "";
  document.getElementById("modalTags").innerHTML = (book.tags || [])
    .map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");
  document.getElementById("modalStamp").innerHTML = `RETURNED<br>${formatDate(book.dateRead)}`;
  modalOverlay.hidden = false;
  modalClose.focus();
}

function closeModal(){
  modalOverlay.hidden = true;
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

searchInput.addEventListener("input", render);
tagFilter.addEventListener("change", render);
sortOrder.addEventListener("change", render);

loadBooks();