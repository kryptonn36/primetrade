const API = "/api/v1";

let token = localStorage.getItem("token") || null;
let currentFilter = "all";
let currentUser = null;


// ── helpers ───────────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(API + path, { ...opts, headers });
  const data = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    const detail = data?.detail || "something went wrong";
    throw new Error(Array.isArray(detail) ? detail.map(e => e.msg).join(", ") : detail);
  }
  return data;
}

function showMsg(el, text, type = "error") {
  el.textContent = text;
  el.className = `msg ${type}`;
}

function clearMsg(el) {
  el.textContent = "";
  el.className = "msg";
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${name}`).classList.add("active");
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(s) {
  return { todo: "todo", in_progress: "in progress", done: "done" }[s] || s;
}

function badgeClass(s) {
  return { todo: "badge-todo", in_progress: "badge-in_progress", done: "badge-done" }[s] || "badge-todo";
}


// ── auth ──────────────────────────────────────────────────────────────────────

async function loginUser() {
  const msg = document.getElementById("login-msg");
  clearMsg(msg);

  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  if (!username || !password) return showMsg(msg, "fill in all fields");

  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    token = data.access_token;
    localStorage.setItem("token", token);
    await loadDashboard();
  } catch (err) {
    showMsg(msg, err.message);
  }
}

async function registerUser() {
  const msg = document.getElementById("register-msg");
  clearMsg(msg);

  const username = document.getElementById("reg-username").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;

  if (!username || !email || !password) return showMsg(msg, "fill in all fields");

  try {
    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    showMsg(msg, "account created — sign in now", "success");
    setTimeout(() => switchTab("login"), 1200);
  } catch (err) {
    showMsg(msg, err.message);
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("token");
  document.getElementById("nav-user").textContent = "";
  document.getElementById("btn-logout").style.display = "none";
  setAdminMode(false);
  showPage("auth");
}


// ── dashboard ─────────────────────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const me = await apiFetch("/users/me");
    currentUser = me;
    document.getElementById("nav-user").textContent = `${me.username} (${me.role})`;
    document.getElementById("btn-logout").style.display = "block";
    setAdminMode(me.role === "admin");
    showPage("dashboard");
    if (me.role === "admin") {
      await fetchAdminUsers();
      await fetchAdminTasks();
    } else {
      await fetchTasks();
    }
  } catch {
    logout();
  }
}

function setAdminMode(isAdmin) {
  const adminPanel   = document.getElementById("admin-panel");
  const taskForm     = document.getElementById("user-task-form");
  const filterRow    = document.getElementById("user-filter-row");
  const taskList     = document.getElementById("task-list");
  const loading      = document.getElementById("loading");
  const title        = document.getElementById("dashboard-title");

  if (adminPanel)  adminPanel.style.display  = isAdmin ? "block" : "none";
  if (taskForm)    taskForm.style.display     = isAdmin ? "none"  : "block";
  if (filterRow)   filterRow.style.display    = isAdmin ? "none"  : "flex";
  if (taskList)    taskList.style.display     = isAdmin ? "none"  : "flex";
  if (loading)     loading.style.display      = "none";
  if (title)       title.textContent          = isAdmin ? "admin dashboard" : "my tasks";

  if (!isAdmin) {
    const usersEl = document.getElementById("admin-users");
    const tasksEl = document.getElementById("admin-tasks");
    const msgEl   = document.getElementById("admin-msg");
    if (usersEl) usersEl.innerHTML = "";
    if (tasksEl) tasksEl.innerHTML = "";
    if (msgEl)   clearMsg(msgEl);
  }
}

async function fetchAdminUsers() {
  if (!currentUser || currentUser.role !== "admin") return;

  const usersEl = document.getElementById("admin-users");
  const msgEl = document.getElementById("admin-msg");

  try {
    const users = await apiFetch("/admin/users");
    renderAdminUsers(users);
    clearMsg(msgEl);
  } catch (err) {
    usersEl.innerHTML = `<div class="admin-item"><div class="admin-item-meta">${escHtml(err.message)}</div></div>`;
    showMsg(msgEl, err.message);
  }
}

async function fetchAdminTasks() {
  if (!currentUser || currentUser.role !== "admin") return;

  const tasksEl = document.getElementById("admin-tasks");
  const msgEl = document.getElementById("admin-msg");

  try {
    const tasks = await apiFetch("/admin/tasks");
    renderAdminTasks(tasks);
    clearMsg(msgEl);
  } catch (err) {
    tasksEl.innerHTML = `<div class="admin-item"><div class="admin-item-meta">${escHtml(err.message)}</div></div>`;
    showMsg(msgEl, err.message);
  }
}

function renderAdminUsers(users) {
  const usersEl = document.getElementById("admin-users");

  if (!users.length) {
    usersEl.innerHTML = `<div class="admin-item"><div class="admin-item-meta">no users found</div></div>`;
    return;
  }

  usersEl.innerHTML = users.map(user => {
    const userState = user.is_active ? "active" : "inactive";
    const actions = [];

    if (user.role !== "admin") {
      actions.push(`<button class="btn btn-sm promote-user-btn" data-id="${user.id}">promote</button>`);
    }

    if (user.is_active && currentUser && user.id !== currentUser.id) {
      actions.push(`<button class="btn btn-sm btn-danger deactivate-user-btn" data-id="${user.id}">deactivate</button>`);
    }

    return `
      <div class="admin-item">
        <div class="admin-item-title">${escHtml(user.username)}</div>
        <div class="admin-item-meta">${escHtml(user.email)} · ${user.role} · ${userState}</div>
        ${actions.length ? `<div class="admin-item-actions">${actions.join("")}</div>` : ""}
      </div>
    `;
  }).join("");

  usersEl.querySelectorAll(".promote-user-btn").forEach(btn => {
    btn.addEventListener("click", () => promoteUser(btn.dataset.id));
  });

  usersEl.querySelectorAll(".deactivate-user-btn").forEach(btn => {
    btn.addEventListener("click", () => deactivateUser(btn.dataset.id));
  });
}

function renderAdminTasks(tasks) {
  const tasksEl = document.getElementById("admin-tasks");

  if (!tasks.length) {
    tasksEl.innerHTML = `<div class="admin-item"><div class="admin-item-meta">no tasks found</div></div>`;
    return;
  }

  tasksEl.innerHTML = tasks.map(task => `
    <div class="admin-item">
      <div class="admin-item-title">${escHtml(task.title)}</div>
      <div class="admin-item-meta">owner: ${escHtml(task.owner_id)} · ${statusLabel(task.status)}</div>
    </div>
  `).join("");
}

async function promoteUser(userId) {
  const msgEl = document.getElementById("admin-msg");

  try {
    await apiFetch(`/admin/users/${userId}/promote`, { method: "PATCH" });
    showMsg(msgEl, "user promoted", "success");
    await fetchAdminUsers();
  } catch (err) {
    showMsg(msgEl, err.message);
  }
}

async function deactivateUser(userId) {
  const msgEl = document.getElementById("admin-msg");

  try {
    await apiFetch(`/admin/users/${userId}/deactivate`, { method: "PATCH" });
    showMsg(msgEl, "user deactivated", "success");
    await fetchAdminUsers();
  } catch (err) {
    showMsg(msgEl, err.message);
  }
}

async function fetchTasks() {
  const loading = document.getElementById("loading");
  const listEl  = document.getElementById("task-list");

  loading.style.display = "block";
  listEl.innerHTML = "";

  try {
    const tasks = await apiFetch("/tasks/");
    loading.style.display = "none";
    renderTasks(tasks);
  } catch (err) {
    loading.style.display = "none";
    listEl.innerHTML = `<p style="color:#b91c1c;font-size:.85rem">${err.message}</p>`;
  }
}

function renderTasks(tasks) {
  const listEl = document.getElementById("task-list");
  listEl.innerHTML = "";

  const filtered = currentFilter === "all"
    ? tasks
    : tasks.filter(t => t.status === currentFilter);

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state">${
      currentFilter === "all" ? "no tasks yet — add one above" : `no ${statusLabel(currentFilter)} tasks`
    }</div>`;
    return;
  }

  filtered.forEach(task => listEl.appendChild(buildTaskCard(task)));
}

function buildTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  card.dataset.id = task.id;

  card.innerHTML = `
    <div class="task-info">
      <div class="task-title">${escHtml(task.title)}</div>
      ${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ""}
      <div class="task-meta">
        <span class="badge ${badgeClass(task.status)}">${statusLabel(task.status)}</span>
      </div>
      <div class="inline-edit-form" id="edit-${task.id}">
        <div class="form-group" style="margin-top:.75rem">
          <label>title</label>
          <input type="text" class="edit-title" value="${escHtml(task.title)}" />
        </div>
        <div class="form-group">
          <label>description</label>
          <textarea class="edit-desc">${escHtml(task.description || "")}</textarea>
        </div>
        <div class="form-group">
          <label>status</label>
          <select class="edit-status">
            <option value="todo"        ${task.status === "todo"        ? "selected" : ""}>todo</option>
            <option value="in_progress" ${task.status === "in_progress" ? "selected" : ""}>in progress</option>
            <option value="done"        ${task.status === "done"        ? "selected" : ""}>done</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn btn-sm save-btn"   data-id="${task.id}">save</button>
          <button class="btn btn-sm btn-ghost cancel-btn" data-id="${task.id}">cancel</button>
        </div>
      </div>
    </div>
    <div class="task-actions">
      <button class="btn btn-sm btn-ghost edit-btn"   data-id="${task.id}">edit</button>
      <button class="btn btn-sm btn-danger delete-btn" data-id="${task.id}">delete</button>
    </div>
  `;

  card.querySelector(".edit-btn").addEventListener("click",   () => toggleEdit(task.id));
  card.querySelector(".cancel-btn").addEventListener("click", () => toggleEdit(task.id));
  card.querySelector(".save-btn").addEventListener("click",   () => saveEdit(task.id));
  card.querySelector(".delete-btn").addEventListener("click", () => deleteTask(task.id));

  return card;
}

function toggleEdit(taskId) {
  document.getElementById(`edit-${taskId}`).classList.toggle("open");
}

async function saveEdit(taskId) {
  const form   = document.getElementById(`edit-${taskId}`);
  const title  = form.querySelector(".edit-title").value.trim();
  const desc   = form.querySelector(".edit-desc").value.trim();
  const status = form.querySelector(".edit-status").value;

  if (!title) { alert("title cannot be blank"); return; }

  try {
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ title, description: desc || null, status }),
    });
    await fetchTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteTask(taskId) {
  if (!confirm("delete this task?")) return;
  try {
    await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
    await fetchTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function createTask() {
  const msg    = document.getElementById("task-create-msg");
  const title  = document.getElementById("task-title").value.trim();
  const desc   = document.getElementById("task-desc").value.trim();
  const status = document.getElementById("task-status").value;

  clearMsg(msg);
  if (!title) return showMsg(msg, "title is required");

  try {
    await apiFetch("/tasks/", {
      method: "POST",
      body: JSON.stringify({ title, description: desc || null, status }),
    });
    document.getElementById("task-title").value  = "";
    document.getElementById("task-desc").value   = "";
    document.getElementById("task-status").value = "todo";
    showMsg(msg, "task created", "success");
    setTimeout(() => clearMsg(msg), 2000);
    await fetchTasks();
  } catch (err) {
    showMsg(msg, err.message);
  }
}


// ── tab switching ─────────────────────────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.getElementById("tab-login").style.display    = tab === "login"    ? "block" : "none";
  document.getElementById("tab-register").style.display = tab === "register" ? "block" : "none";
}

function bindPasswordToggle(checkboxId, inputId) {
  const checkbox = document.getElementById(checkboxId);
  const input = document.getElementById(inputId);
  if (!checkbox || !input) return;

  checkbox.addEventListener("change", () => {
    input.type = checkbox.checked ? "text" : "password";
  });
}


// ── event wiring ──────────────────────────────────────────────────────────────

document.getElementById("btn-login").addEventListener("click", loginUser);
document.getElementById("btn-register").addEventListener("click", registerUser);
document.getElementById("btn-logout").addEventListener("click", logout);
document.getElementById("btn-create-task").addEventListener("click", createTask);
document.getElementById("btn-admin-refresh-users").addEventListener("click", fetchAdminUsers);
document.getElementById("btn-admin-refresh-tasks").addEventListener("click", fetchAdminTasks);
bindPasswordToggle("login-show-password", "login-password");
bindPasswordToggle("reg-show-password", "reg-password");

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    await fetchTasks();
  });
});

document.getElementById("login-password").addEventListener("keydown", e => {
  if (e.key === "Enter") loginUser();
});
document.getElementById("reg-password").addEventListener("keydown", e => {
  if (e.key === "Enter") registerUser();
});


// ── init ──────────────────────────────────────────────────────────────────────

if (token) loadDashboard();
