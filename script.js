const STORAGE_KEY = "kuats-community-db";
const SESSION_KEY = "kuats-community-session";
const FAVORITES_KEY = "kuats-community-favorites";
const LIKES_KEY = "kuats-community-likes";
const DB_VERSION = 1;
const LEADER_EMAIL = "parpikuat@gmail.com";
const LEADER_PASSWORD_RECORD = {
  algorithm: "PBKDF2-SHA-256",
  iterations: 120000,
  salt: "/6TCPfhnBf2Z80cjUX0Hpg==",
  hash: "bR23n0jp8oKVQUeW69LJJ5ZkhNwDEL9QiwBI3Ww6vqE=",
};

const state = {
  db: null,
  session: null,
  editingPostId: null,
  editingResourceId: null,
  favorites: [],
  likes: [],
  forumSearch: "",
  resourceSearch: "",
};

const elements = {
  body: document.body,
  authModal: document.getElementById("authModal"),
  authForm: document.getElementById("authForm"),
  authStatus: document.getElementById("authStatus"),
  authTitle: document.getElementById("modalTitle"),
  authEyebrow: document.getElementById("modalEyebrow"),
  authCopy: document.getElementById("modalCopy"),
  authSubmit: document.getElementById("authSubmit"),
  profileCard: document.getElementById("profileCard"),
  profileEmail: document.getElementById("profileEmail"),
  profileRole: document.getElementById("profileRole"),
  favoriteList: document.getElementById("favoriteList"),
  forumSearchInput: document.getElementById("forumSearchInput"),
  resourceSearchInput: document.getElementById("resourceSearchInput"),
  sessionSummary: document.getElementById("sessionSummary"),
  forumList: document.getElementById("forumList"),
  resourceList: document.getElementById("resourceList"),
  accountList: document.getElementById("accountList"),
  leaderPanel: document.getElementById("leaderPanel"),
  postForm: document.getElementById("postForm"),
  resourceForm: document.getElementById("resourceForm"),
  postSubmitButton: document.getElementById("postSubmitButton"),
  postCancelButton: document.getElementById("postCancelButton"),
  resourceSubmitButton: document.getElementById("resourceSubmitButton"),
  resourceCancelButton: document.getElementById("resourceCancelButton"),
  resourceFileInput: document.getElementById("resourceFileInput"),
  resourceFileName: document.getElementById("resourceFileName"),
  statUsers: document.getElementById("statUsers"),
  statPosts: document.getElementById("statPosts"),
  statFiles: document.getElementById("statFiles"),
  exportDataButton: document.getElementById("exportDataButton"),
  importDataInput: document.getElementById("importDataInput"),
  importFileName: document.getElementById("importFileName"),
  openLogin: document.getElementById("openLogin"),
  userControls: document.getElementById("userControls"),
  profileButton: document.getElementById("profileButton"),
  topLogoutButton: document.getElementById("topLogoutButton"),
  contactButton: document.getElementById("contactButton"),
};

elements.openLogin.addEventListener("click", openLoginModal);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("logoutButton").addEventListener("click", logout);
document.querySelector('[data-close-modal="true"]').addEventListener("click", closeModal);
elements.authForm.addEventListener("submit", handleAuthSubmit);
elements.postForm.addEventListener("submit", handlePostSubmit);
elements.resourceForm.addEventListener("submit", handleResourceSubmit);
elements.resourceFileInput.addEventListener("change", updateSelectedFileName);
elements.forumSearchInput.addEventListener("input", handleForumSearch);
elements.resourceSearchInput.addEventListener("input", handleResourceSearch);
elements.postCancelButton.addEventListener("click", resetPostForm);
elements.resourceCancelButton.addEventListener("click", resetResourceForm);
elements.exportDataButton.addEventListener("click", exportBackupData);
elements.importDataInput.addEventListener("change", handleImportBackup);
elements.importDataInput.addEventListener("change", updateImportFileName);
elements.profileButton.addEventListener("click", openProfileModal);
elements.topLogoutButton.addEventListener("click", logout);
elements.contactButton.addEventListener("click", openContactModal);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

init().catch((error) => {
  console.error(error);
  setStatus("This browser does not support the demo auth features.", "error");
});

async function init() {
  state.db = loadDb();
  await ensureLeaderAccount();
  state.session = loadSession();
  state.favorites = loadFavorites();
  state.likes = loadLikes();
  syncSession();
  renderAll();
}

function defaultDb() {
  return {
    version: DB_VERSION,
    users: [],
    posts: [],
    resources: [],
  };
}

function loadDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultDb();
  }

  try {
    const parsed = JSON.parse(raw);
    return migrateDb(parsed);
  } catch (error) {
    console.warn("Resetting invalid local database", error);
    return defaultDb();
  }
}

function saveDb() {
  state.db.version = DB_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
}

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Resetting invalid session", error);
    return null;
  }
}

function loadFavorites() {
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Resetting invalid favorites", error);
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
}

function loadLikes() {
  const raw = localStorage.getItem(LIKES_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Resetting invalid likes", error);
    return [];
  }
}

function saveLikes() {
  localStorage.setItem(LIKES_KEY, JSON.stringify(state.likes));
}

function saveSession() {
  if (state.session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

async function ensureLeaderAccount() {
  const existing = findUserByEmail(LEADER_EMAIL);
  if (existing) {
    existing.role = "leader";
    existing.password = existing.password || LEADER_PASSWORD_RECORD;
    saveDb();
    return;
  }

  state.db.users.push({
    id: crypto.randomUUID(),
    email: LEADER_EMAIL,
    role: "leader",
    createdAt: new Date().toISOString(),
    password: LEADER_PASSWORD_RECORD,
  });
  saveDb();
}

function migrateDb(input) {
  const base = defaultDb();
  const next = {
    version: typeof input?.version === "number" ? input.version : DB_VERSION,
    users: Array.isArray(input?.users) ? input.users : [],
    posts: Array.isArray(input?.posts) ? input.posts : [],
    resources: Array.isArray(input?.resources) ? input.resources : [],
  };

  next.posts = next.posts.map((post) => ({
    id: post.id || crypto.randomUUID(),
    title: String(post.title || ""),
    description: String(post.description || ""),
    tags: Array.isArray(post.tags) ? post.tags : [],
    pinned: Boolean(post.pinned),
    likes: Number.isFinite(post.likes) ? post.likes : 0,
    createdAt: post.createdAt || new Date().toISOString(),
  }));

  next.resources = next.resources.map((resource) => ({
    id: resource.id || crypto.randomUUID(),
    title: String(resource.title || ""),
    description: String(resource.description || ""),
    fileName: String(resource.fileName || ""),
    fileType: String(resource.fileType || "application/octet-stream"),
    fileDataUrl: String(resource.fileDataUrl || ""),
    createdAt: resource.createdAt || new Date().toISOString(),
  }));

  next.users = next.users.map((user) => ({
    id: user.id || crypto.randomUUID(),
    email: String(user.email || ""),
    role: user.role === "leader" ? "leader" : "member",
    createdAt: user.createdAt || new Date().toISOString(),
    password: user.password || LEADER_PASSWORD_RECORD,
  }));

  return { ...base, ...next };
}

function findUserByEmail(email) {
  return state.db.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function openLoginModal() {
  elements.authForm.reset();
  elements.authForm.classList.remove("hidden");
  elements.profileCard.classList.add("hidden");
  setStatus("");
  elements.authEyebrow.textContent = "Login";
  elements.authTitle.textContent = "Welcome back";
  elements.authCopy.textContent = "Leader login gives access to the publishing dashboard.";
  elements.authSubmit.textContent = "Login";
  elements.authModal.classList.remove("hidden");
  elements.authModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  elements.authModal.classList.add("hidden");
  elements.authModal.setAttribute("aria-hidden", "true");
  elements.profileCard.classList.add("hidden");
}

function setStatus(message, type = "") {
  elements.authStatus.textContent = message;
  elements.authStatus.className = "helper-text";
  if (type) {
    elements.authStatus.classList.add(type);
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    setStatus("Email and password are required.", "error");
    return;
  }

  const user = findUserByEmail(email);
  if (!user) {
    setStatus("Only the leader account can log in right now. Use parpikuat@gmail.com.", "error");
    return;
  }

  const validPassword = await verifyPassword(password, user.password);
  if (!validPassword) {
    setStatus("Wrong password.", "error");
    return;
  }

  state.session = createSession(user);
  saveSession();
  syncSession();
  renderAll();
  setStatus("Logged in successfully.", "success");
  setTimeout(closeModal, 500);
}

function createSession(user) {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

function syncSession() {
  const currentUser = getCurrentUser();
  const isLeader = currentUser?.role === "leader";

  elements.body.classList.toggle("leader-mode", isLeader);
  elements.leaderPanel.classList.toggle("hidden", !isLeader);
  elements.openLogin.classList.toggle("hidden", Boolean(currentUser));
  elements.userControls.classList.toggle("hidden", !currentUser);

  if (!currentUser) {
    elements.sessionSummary.innerHTML = "<p>Welcome to Kuats Community</p><strong>Stay close to every new release, note, and project drop</strong>";
    return;
  }

  elements.sessionSummary.innerHTML = `
    <p>Signed in as ${escapeHtml(currentUser.email)}</p>
    <strong>${isLeader ? "Leader access enabled" : "Member account active"}</strong>
  `;
}

function openProfileModal() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return;
  }

  elements.authEyebrow.textContent = "Profile";
  elements.authTitle.textContent = "Your profile";
  elements.authCopy.textContent = "Your current account details.";
  elements.authForm.classList.add("hidden");
  setStatus("");
  elements.profileEmail.textContent = currentUser.email;
  elements.profileRole.textContent = `Role: ${currentUser.role}`;
  elements.profileCard.classList.remove("hidden");
  elements.authModal.classList.remove("hidden");
  elements.authModal.setAttribute("aria-hidden", "false");
}

function openContactModal() {
  elements.authEyebrow.textContent = "Contact";
  elements.authTitle.textContent = "Contact Kuat";
  elements.authCopy.innerHTML = 'Email: <a href="mailto:parpikuat@gmail.com">parpikuat@gmail.com</a><br>Phone: <a href="tel:+77577594891">+7 757 759 4891</a><br><span class="inline-icon"><svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0 105.89 105.89 0 0 0 19.39 8.09C2.79 32.65-1.71 56.6.54 80.21h0A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.27 68.42 68.42 0 0 1-10.84-5.18c.91-.66 1.8-1.34 2.66-2.04a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2.04a68.68 68.68 0 0 1-10.86 5.19 77 77 0 0 0 6.89 11.26A105.25 105.25 0 0 0 126.6 80.22h0c2.64-27.33-4.51-51.07-18.9-72.15ZM42.45 65.69c-6.27 0-11.41-5.73-11.41-12.81s5-12.81 11.41-12.81c6.46 0 11.5 5.78 11.41 12.81 0 7.08-5 12.81-11.41 12.81Zm42.24 0c-6.27 0-11.41-5.73-11.41-12.81s5-12.81 11.41-12.81c6.46 0 11.5 5.78 11.41 12.81 0 7.08-4.95 12.81-11.41 12.81Z"/></svg><a href="https://discord.gg/VGyRxS9A" target="_blank" rel="noreferrer">Join our Discord community</a></span>';
  elements.authForm.classList.add("hidden");
  elements.profileCard.classList.add("hidden");
  setStatus("");
  elements.authModal.classList.remove("hidden");
  elements.authModal.setAttribute("aria-hidden", "false");
}

function logout() {
  state.session = null;
  saveSession();
  elements.authForm.classList.remove("hidden");
  syncSession();
  renderAll();
}

function getCurrentUser() {
  if (!state.session) {
    return null;
  }
  return state.db.users.find((user) => user.id === state.session.userId) || null;
}

function renderAll() {
  renderStats();
  renderForum();
  renderFavorites();
  renderResources();
  renderAccounts();
}

function renderStats() {
  elements.statUsers.textContent = String(state.db.users.length);
  elements.statPosts.textContent = String(state.db.posts.length);
  elements.statFiles.textContent = String(state.db.resources.length);
}

function renderForum() {
  elements.forumList.innerHTML = "";
  const currentUser = getCurrentUser();
  const isLeader = currentUser?.role === "leader";

  const filteredPosts = sortPosts(state.db.posts).filter(matchesForumSearch);

  if (!filteredPosts.length) {
    elements.forumList.appendChild(createEmptyState());
    return;
  }

  for (const post of filteredPosts) {
    elements.forumList.appendChild(createPostCard(post, isLeader));
  }
}

function renderFavorites() {
  elements.favoriteList.innerHTML = "";
  const currentUser = getCurrentUser();
  const isLeader = currentUser?.role === "leader";
  const favoritePosts = sortPosts(
    state.db.posts
      .filter((post) => state.favorites.includes(post.id))
      .filter(matchesForumSearch)
  );

  if (!favoritePosts.length) {
    elements.favoriteList.appendChild(createEmptyState());
    return;
  }

  for (const post of favoritePosts) {
    elements.favoriteList.appendChild(createPostCard(post, isLeader));
  }
}

function renderResources() {
  elements.resourceList.innerHTML = "";
  const currentUser = getCurrentUser();
  const isLeader = currentUser?.role === "leader";

  const filteredResources = sortResources(state.db.resources).filter(matchesResourceSearch);

  if (!filteredResources.length) {
    elements.resourceList.appendChild(createEmptyState());
    return;
  }

  for (const resource of filteredResources) {
    const article = document.createElement("article");
    article.className = "resource-card";

    const link = document.createElement("a");
    link.className = "download-link";
    link.href = resource.fileDataUrl;
    link.download = resource.fileName;
    link.textContent = `Download ${resource.fileName}`;

    article.innerHTML = `
      <p class="resource-meta">${formatDate(resource.createdAt)}</p>
      <h3>${escapeHtml(resource.title)}</h3>
      <p>${escapeHtml(resource.description)}</p>
    `;
    article.appendChild(link);
    if (isLeader) {
      const actions = document.createElement("div");
      actions.className = "card-actions";

      const editButton = document.createElement("button");
      editButton.className = "ghost-button";
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => startEditResource(resource.id));

      const deleteButton = document.createElement("button");
      deleteButton.className = "ghost-button danger-button";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteResource(resource.id));

      actions.append(editButton, deleteButton);
      article.appendChild(actions);
    }
    elements.resourceList.appendChild(article);
  }
}

function renderAccounts() {
  elements.accountList.innerHTML = "";
  const currentUser = getCurrentUser();
  if (currentUser?.role !== "leader") {
    return;
  }

  const leader = findUserByEmail(LEADER_EMAIL);
  if (!leader) {
    return;
  }

  const article = document.createElement("article");
  article.className = "account-card";
  article.innerHTML = `
    <strong>${escapeHtml(leader.email)}</strong>
    <p>Role: ${escapeHtml(leader.role)}</p>
    <p>Created: ${formatDate(leader.createdAt)}</p>
    <p>Publishing access enabled</p>
  `;
  elements.accountList.appendChild(article);
}

function handlePostSubmit(event) {
  event.preventDefault();
  const currentUser = getCurrentUser();
  if (currentUser?.role !== "leader") {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const postId = String(formData.get("postId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const tagsRaw = String(formData.get("tags") || "").trim();
  const tags = tagsRaw ? tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean) : [];

  if (postId) {
    const post = state.db.posts.find((item) => item.id === postId);
    if (!post) {
      return;
    }
    post.title = title;
    post.description = description;
    post.tags = tags;
  } else {
    state.db.posts.push({
      id: crypto.randomUUID(),
      title,
      description,
      tags,
      pinned: false,
      likes: 0,
      createdAt: new Date().toISOString(),
    });
  }

  saveDb();
  renderAll();
  resetPostForm();
}

async function handleResourceSubmit(event) {
  event.preventDefault();
  const currentUser = getCurrentUser();
  if (currentUser?.role !== "leader") {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const resourceId = String(formData.get("resourceId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const file = formData.get("file");
  const existing = resourceId ? state.db.resources.find((item) => item.id === resourceId) : null;

  if (!existing && (!(file instanceof File) || !file.size)) {
    alert("Please choose a file before uploading.");
    return;
  }

  try {
    let fileDataUrl = existing?.fileDataUrl || "";
    let fileName = existing?.fileName || "";
    let fileType = existing?.fileType || "application/octet-stream";

    if (file instanceof File && file.size) {
      fileDataUrl = await fileToDataUrl(file);
      fileName = file.name;
      fileType = file.type || "application/octet-stream";
    }

    if (existing) {
      existing.title = title;
      existing.description = description;
      existing.fileDataUrl = fileDataUrl;
      existing.fileName = fileName;
      existing.fileType = fileType;
    } else {
      state.db.resources.push({
        id: crypto.randomUUID(),
        title,
        description,
        fileName,
        fileType,
        fileDataUrl,
        createdAt: new Date().toISOString(),
      });
    }
    saveDb();
    renderAll();
    resetResourceForm();
    alert(existing ? "Resource updated." : "File uploaded and published.");
  } catch (error) {
    console.error(error);
    alert("The file could not be uploaded. Try a smaller file.");
  }
}

function createEmptyState() {
  const template = document.getElementById("emptyStateTemplate");
  return template.content.firstElementChild.cloneNode(true);
}

function createPostCard(post, isLeader) {
  const article = document.createElement("article");
  article.className = "forum-card";
  article.innerHTML = `
    <p class="post-meta">${formatDate(post.createdAt)}</p>
    <h3>${escapeHtml(post.title)}</h3>
    <p>${escapeHtml(post.description)}</p>
    <div class="meta-row">
      <span>${post.pinned ? "Pinned" : "Community post"}</span>
      <span>${post.likes || 0} like${post.likes === 1 ? "" : "s"}</span>
      <span>${state.favorites.includes(post.id) ? "Favorited" : "Not in favorites"}</span>
    </div>
    <div class="tag-row">${(post.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
  `;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const likeButton = document.createElement("button");
  likeButton.className = "ghost-button reaction-button like-button";
  likeButton.type = "button";
  likeButton.innerHTML = '<span class="reaction-icon" aria-hidden="true">❤</span>Like';
  likeButton.addEventListener("click", () => likePost(post.id));

  const favoriteButton = document.createElement("button");
  favoriteButton.className = "ghost-button reaction-button favorite-button";
  favoriteButton.type = "button";
  favoriteButton.innerHTML = '<span class="reaction-icon" aria-hidden="true">★</span>Favorite';
  favoriteButton.addEventListener("click", () => toggleFavorite(post.id));

  if (state.likes.includes(post.id)) {
    likeButton.classList.add("active");
  }

  if (state.favorites.includes(post.id)) {
    favoriteButton.classList.add("active");
  }

  actions.append(likeButton, favoriteButton);

  if (isLeader) {
    const pinButton = document.createElement("button");
    pinButton.className = "ghost-button";
    pinButton.type = "button";
    pinButton.textContent = post.pinned ? "Unpin" : "Pin";
    pinButton.addEventListener("click", () => togglePin(post.id));

    const editButton = document.createElement("button");
    editButton.className = "ghost-button";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => startEditPost(post.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "ghost-button danger-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deletePost(post.id));

    actions.append(pinButton, editButton, deleteButton);
  }

  article.appendChild(actions);
  return article;
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    if (Boolean(b.pinned) !== Boolean(a.pinned)) {
      return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    }
    const likeDiff = (b.likes || 0) - (a.likes || 0);
    if (likeDiff !== 0) {
      return likeDiff;
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

function sortResources(resources) {
  return [...resources].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function startEditPost(postId) {
  const post = state.db.posts.find((item) => item.id === postId);
  if (!post) {
    return;
  }

  state.editingPostId = postId;
  elements.postForm.elements.postId.value = post.id;
  elements.postForm.elements.title.value = post.title;
  elements.postForm.elements.description.value = post.description;
  elements.postForm.elements.tags.value = (post.tags || []).join(", ");
  elements.postSubmitButton.textContent = "Save Changes";
  elements.postCancelButton.classList.remove("hidden");
  elements.postForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetPostForm() {
  state.editingPostId = null;
  elements.postForm.reset();
  elements.postForm.elements.postId.value = "";
  elements.postSubmitButton.textContent = "Publish Project";
  elements.postCancelButton.classList.add("hidden");
}

function deletePost(postId) {
  const confirmed = confirm("Delete this project post?");
  if (!confirmed) {
    return;
  }

  state.db.posts = state.db.posts.filter((item) => item.id !== postId);
  state.favorites = state.favorites.filter((id) => id !== postId);
  state.likes = state.likes.filter((id) => id !== postId);
  saveDb();
  saveFavorites();
  saveLikes();
  if (state.editingPostId === postId) {
    resetPostForm();
  }
  renderAll();
}

function togglePin(postId) {
  const post = state.db.posts.find((item) => item.id === postId);
  if (!post) {
    return;
  }
  post.pinned = !post.pinned;
  saveDb();
  renderAll();
}

function likePost(postId) {
  const post = state.db.posts.find((item) => item.id === postId);
  if (!post) {
    return;
  }

  if (state.likes.includes(postId)) {
    state.likes = state.likes.filter((id) => id !== postId);
    post.likes = Math.max(0, (post.likes || 0) - 1);
  } else {
    state.likes = [...state.likes, postId];
    post.likes = (post.likes || 0) + 1;
  }

  saveDb();
  saveLikes();
  renderAll();
}

function toggleFavorite(postId) {
  if (state.favorites.includes(postId)) {
    state.favorites = state.favorites.filter((id) => id !== postId);
  } else {
    state.favorites = [...state.favorites, postId];
  }
  saveFavorites();
  renderAll();
}

function startEditResource(resourceId) {
  const resource = state.db.resources.find((item) => item.id === resourceId);
  if (!resource) {
    return;
  }

  state.editingResourceId = resourceId;
  elements.resourceForm.elements.resourceId.value = resource.id;
  elements.resourceForm.elements.title.value = resource.title;
  elements.resourceForm.elements.description.value = resource.description;
  elements.resourceSubmitButton.textContent = "Save Resource";
  elements.resourceCancelButton.classList.remove("hidden");
  elements.resourceForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetResourceForm() {
  state.editingResourceId = null;
  elements.resourceForm.reset();
  elements.resourceForm.elements.resourceId.value = "";
  elements.resourceSubmitButton.textContent = "Upload Resource";
  elements.resourceCancelButton.classList.add("hidden");
  elements.resourceFileName.textContent = "No file selected";
}

function deleteResource(resourceId) {
  const confirmed = confirm("Delete this uploaded resource?");
  if (!confirmed) {
    return;
  }

  state.db.resources = state.db.resources.filter((item) => item.id !== resourceId);
  saveDb();
  if (state.editingResourceId === resourceId) {
    resetResourceForm();
  }
  renderAll();
}

function exportBackupData() {
  const currentUser = getCurrentUser();
  if (currentUser?.role !== "leader") {
    return;
  }

  const backup = {
    exportedAt: new Date().toISOString(),
    data: state.db,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kuats-community-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function handleImportBackup(event) {
  const currentUser = getCurrentUser();
  const file = event.target.files?.[0];
  if (currentUser?.role !== "leader" || !file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const nextDb = parsed?.data;

    if (!nextDb || !Array.isArray(nextDb.users) || !Array.isArray(nextDb.posts) || !Array.isArray(nextDb.resources)) {
      throw new Error("Invalid backup file.");
    }

    state.db = {
      users: nextDb.users,
      posts: nextDb.posts,
      resources: nextDb.resources,
    };

    saveDb();
    syncSession();
    renderAll();
  } catch (error) {
    console.error(error);
  } finally {
    event.target.value = "";
    elements.importFileName.textContent = "No file selected";
  }
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return {
    algorithm: "PBKDF2-SHA-256",
    iterations: 120000,
    salt: bytesToBase64(salt),
    hash: bytesToBase64(new Uint8Array(bits)),
  };
}

async function verifyPassword(password, record) {
  const salt = base64ToBytes(record.salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: record.iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const candidateHash = bytesToBase64(new Uint8Array(bits));
  return timingSafeEqual(candidateHash, record.hash);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function updateSelectedFileName() {
  const file = elements.resourceFileInput.files?.[0];
  elements.resourceFileName.textContent = file ? file.name : "No file selected";
}

function updateImportFileName() {
  const file = elements.importDataInput.files?.[0];
  elements.importFileName.textContent = file ? file.name : "No file selected";
}

function handleForumSearch(event) {
  state.forumSearch = event.target.value.trim().toLowerCase();
  renderForum();
  renderFavorites();
}

function handleResourceSearch(event) {
  state.resourceSearch = event.target.value.trim().toLowerCase();
  renderResources();
}

function matchesForumSearch(post) {
  if (!state.forumSearch) {
    return true;
  }

  const haystack = [
    post.title,
    post.description,
    ...(post.tags || []),
  ].join(" ").toLowerCase();

  return haystack.includes(state.forumSearch);
}

function matchesResourceSearch(resource) {
  if (!state.resourceSearch) {
    return true;
  }

  const haystack = [
    resource.title,
    resource.description,
    resource.fileName,
  ].join(" ").toLowerCase();

  return haystack.includes(state.resourceSearch);
}
