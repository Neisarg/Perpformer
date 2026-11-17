/* Prepformer core: helpers, data, state, routing and shared widgets. */
"use strict";

const P = {
  bank: null, env: {}, profiles: [], profile: null, state: {}, routes: [], cleanup: null,
  q: {}, qTopic: {}, prob: {}, mod: {}, mcqTopics: [], probTopics: [],
};

/* Which coding topics go with which lesson topic, and back. */
P.LESSON_TO_CODE = {
  linalg: ["tensors"], prob: ["losses"], optim: ["optim"], linear: ["classical"], trees: ["classical"], classical: ["classical"],
  unsup: ["classical"], general: ["classical"], eval: ["losses"], nn: ["losses", "layers"], blocks: ["layers"], training: ["optim"],
  vision: ["vision"], seq: ["layers", "attention"], transformer: ["attention"], nlp: ["nlp"], llm: ["nlp", "attention"],
  efficient: ["efficient"], agents: ["agents"], llmeval: ["agents"], genmodels: ["genrl"], rl: ["genrl"], recsys: ["agents"],
  mlsys: [], pytorch: ["tensors", "optim"], frontier: [],
};
P.CODE_TO_LESSON = { tensors: "pytorch", losses: "nn", classical: "classical", layers: "blocks", optim: "optim", attention: "transformer",
  nlp: "nlp", efficient: "efficient", vision: "vision", genrl: "genmodels", agents: "agents" };

/* ---------- DOM helpers ---------- */
const $ = (sel, root) => (root || document).querySelector(sel);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  add(el, kids);
  return el;
}
function add(el, kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/* Inline text with `code` and **bold**. Returns an array of nodes. */
function inline(text) {
  const out = [];
  String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/).forEach((part) => {
    if (!part) return;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) out.push(h("code", { text: part.slice(1, -1) }));
    else if (part.startsWith("**") && part.endsWith("**") && part.length > 4) out.push(h("strong", { text: part.slice(2, -2) }));
    else out.push(document.createTextNode(part));
  });
  return out;
}
/* Minimal Markdown: paragraphs, fenced code, bullet lists, inline code and bold. */
function md(text) {
  const root = h("div", { class: "md" });
  const lines = String(text || "").split("\n");
  let i = 0, para = [], list = null;
  const flushPara = () => { if (para.length) { root.append(h("p", null, inline(para.join(" ")))); para = []; } };
  const flushList = () => { if (list) { root.append(list); list = null; } };
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      flushPara(); flushList();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++;
      root.append(h("pre", null, h("code", { text: code.join("\n") })));
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      flushPara();
      if (!list) list = h("ul");
      list.append(h("li", null, inline(line.replace(/^\s*[-*] /, ""))));
    } else if (/^\s*\d+\. /.test(line)) {
      flushPara();
      if (!list) list = h("ol");
      list.append(h("li", null, inline(line.replace(/^\s*\d+\. /, ""))));
    } else if (!line.trim()) { flushPara(); flushList(); }
    else if (/^#{1,4} /.test(line)) { flushPara(); flushList(); root.append(h("h3", null, inline(line.replace(/^#+ /, "")))); }
    else { flushList(); para.push(line.trim()); }
    i++;
  }
  flushPara(); flushList();
  return root;
}
function qText(text) {
  const el = h("div", { class: "qtext" });
  String(text).split("\n").forEach((line, i) => { if (i) el.append(h("br")); add(el, inline(line)); });
  return el;
}

/* ---------- misc helpers ---------- */
const today = () => new Date().toLocaleDateString("en-CA");
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("en-CA"); };
const fmtTime = (s) => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sample = (arr, n) => shuffle(arr).slice(0, n);
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const LETTERS = ["A", "B", "C", "D", "E", "F"];
function diffTag(d) { return h("span", { class: "tag " + String(d || "").toLowerCase(), text: d }); }

async function api(path, body) {
  const opts = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const res = await fetch(path, opts);
  let data = null;
  try { data = await res.json(); } catch (e) { /* not json */ }
  if (!res.ok || (data && data.error)) throw new Error((data && data.error) || "Request failed (" + res.status + ")");
  return data;
}

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function modal(title, body, actions) {
  const overlay = h("div", { class: "overlay", role: "dialog", "aria-modal": "true", "aria-label": title });
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const row = h("div", { class: "actions" });
  (actions || [{ label: "Close" }]).forEach((a) => row.append(h("button", {
    class: "btn" + (a.primary ? " primary" : ""), type: "button", text: a.label,
    onclick: async () => { if (a.run && (await a.run()) === false) return; close(); },
  })));
  overlay.append(h("div", { class: "dialog" }, h("h2", { text: title }), body, row));
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  const first = overlay.querySelector("input, textarea, select, button");
  if (first) first.focus();
  return close;
}
function confirmBox(title, message, okLabel) {
  return new Promise((resolve) => {
    modal(title, h("p", { text: message }), [
      { label: "Cancel", run: () => resolve(false) },
      { label: okLabel || "Confirm", primary: true, run: () => resolve(true) },
    ]);
  });
}

/* ---------- per-profile state (stored in SQLite through the server) ---------- */
const saveTimers = {};
function S(key, fallback) { if (!(key in P.state)) P.state[key] = fallback; return P.state[key]; }
function save(key) {
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(() => {
    api("/api/state", { profile: P.profile.id, key, value: P.state[key] }).catch((e) => toast("Could not save progress: " + e.message));
  }, 250);
}
function logAttempt(kind, item, topic, correct, mode) {
  api("/api/attempt", { profile: P.profile.id, kind, item_id: item, topic, correct, mode }).catch(() => {});
}
const local = {
  get(key) { try { return JSON.parse(localStorage.getItem("pf:" + P.profile.id + ":" + key)); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem("pf:" + P.profile.id + ":" + key, JSON.stringify(value)); } catch (e) { /* ignore */ } },
  del(key) { try { localStorage.removeItem("pf:" + P.profile.id + ":" + key); } catch (e) { /* ignore */ } },
};

/* ---------- bank lookups ---------- */
function indexBank() {
  P.q = {}; P.qTopic = {}; P.prob = {}; P.mod = {};
  P.mcqTopics = P.bank.mcq.topics; P.probTopics = P.bank.problems.topics;
  P.mcqTopics.forEach((t) => { P.qTopic[t.id] = []; });
  P.bank.mcq.questions.forEach((q) => { P.q[q.id] = q; (P.qTopic[q.topic] = P.qTopic[q.topic] || []).push(q); });
  P.bank.problems.problems.forEach((p) => { P.prob[p.id] = p; });
  P.bank.lessons.modules.forEach((m) => { P.mod[m.id] = m; });
}
const topicName = (id) => { const t = P.mcqTopics.find((x) => x.id === id) || P.probTopics.find((x) => x.id === id); return t ? t.name : id; };
const codeTopicName = (id) => { const t = P.probTopics.find((x) => x.id === id); return t ? t.name : id; };
const lessonFor = (topicId) => (P.mod[topicId] ? topicId : P.CODE_TO_LESSON[topicId] || null);

/* ---------- multiple-choice progress ---------- */
const SRS_DAYS = [1, 2, 4, 8, 16, 32];
function qStatus(id) {
  const s = S("mcq", {})[id];
  if (!s || !s.n) return "u";
  if (!s.ok) return "w";
  return s.streak >= 2 ? "s" : "r";
}
function recordMcq(q, correct, mode) {
  const all = S("mcq", {});
  const s = all[q.id] || (all[q.id] = { n: 0, c: 0, streak: 0 });
  s.n += 1; s.c += correct ? 1 : 0; s.ok = !!correct; s.streak = correct ? (s.streak || 0) + 1 : 0; s.last = today();
  save("mcq");
  const srs = S("srs", {});
  const box = correct ? Math.min((srs[q.id] ? srs[q.id].box : 0) + 1, SRS_DAYS.length - 1) : 0;
  if (!correct || srs[q.id]) { srs[q.id] = { box, due: addDays(SRS_DAYS[box]) }; save("srs"); }
  logAttempt("mcq", q.id, q.topic, correct, mode);
  settleTodos();
}
function topicStats(topicId) {
  const qs = P.qTopic[topicId] || [], st = S("mcq", {});
  let seen = 0, right = 0, n = 0, c = 0;
  qs.forEach((q) => { const s = st[q.id]; if (s && s.n) { seen++; n += s.n; c += s.c; if (s.ok) right++; } });
  return { total: qs.length, seen, right, attempts: n, correct: c };
}

/* ---------- learning to-do list ---------- */
function addTodo(topic, qids, source) {
  if (!topic) return;
  const todos = S("todo", []);
  let item = todos.find((t) => t.topic === topic && !t.done);
  if (!item) { item = { id: Date.now() + "-" + topic, topic, qids: [], created: today(), source, done: false }; todos.push(item); }
  (qids || []).forEach((id) => { if (!item.qids.includes(id)) item.qids.push(id); });
  item.source = item.source === source ? source : "mixed";
  save("todo");
}
function settleTodos() {
  const todos = S("todo", []), st = S("mcq", {});
  let changed = false;
  todos.forEach((t) => {
    if (!t.done && t.qids.length && t.qids.every((id) => !P.q[id] || (st[id] && st[id].ok && st[id].last >= t.created && st[id].n > 1))) {
      t.done = true; t.doneOn = today(); changed = true;
    }
  });
  if (changed) save("todo");
}
function todoList(limit) {
  const todos = S("todo", []).filter((t) => !t.done);
  if (!todos.length) return h("p", { class: "muted", text: "Nothing on the list. Topics you miss in practice or exams are added here." });
  const ul = h("ul", { class: "list" });
  todos.slice(0, limit || 99).forEach((t) => {
    const lesson = lessonFor(t.topic);
    const missed = t.qids.filter((id) => P.q[id]);
    ul.append(h("li", null,
      h("div", { class: "grow" }, h("strong", { text: topicName(t.topic) }),
        h("div", { class: "todo-reason", text: (missed.length ? missed.length + " missed question" + (missed.length > 1 ? "s" : "") : "Coding problem not solved") +
          " in " + (t.source === "exam" ? "an exam" : t.source === "practice" ? "practice" : "practice and exams") + ", added " + t.created })),
      lesson ? h("a", { class: "btn sm", href: "#/learn/" + lesson, text: "Open lesson" }) : null,
      missed.length ? h("button", { class: "btn sm", type: "button", text: "Retry missed questions", onclick: () => startPractice({ ids: missed, label: "Missed questions: " + topicName(t.topic) }) }) : null,
      h("button", { class: "btn sm quiet", type: "button", text: "Mark done", onclick: () => { t.done = true; t.doneOn = today(); save("todo"); render(); } })));
  });
  return ul;
}

/* ---------- routing ---------- */
function route(pattern, nav, fn) { P.routes.push({ re: new RegExp("^" + pattern + "$"), nav, fn }); }
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
function render() {
  if (!P.bank || !P.profile) return;
  if (P.cleanup) { try { P.cleanup(); } catch (e) { /* ignore */ } P.cleanup = null; }
  const path = (location.hash || "#/").slice(1) || "/";
  const view = $("#view");
  view.className = "";
  clear(view);
  for (const r of P.routes) {
    const m = path.match(r.re);
    if (m) {
      document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.nav === r.nav));
      try { r.fn(view, ...m.slice(1).map(decodeURIComponent)); }
      catch (e) { console.error(e); view.append(h("div", { class: "note bad" }, h("p", { text: "This page hit an error: " + e.message }))); }
      window.scrollTo(0, 0);
      return;
    }
  }
  view.append(h("div", { class: "page-head" }, h("h1", { text: "Page not found" }), h("p", null, h("a", { href: "#/", text: "Back to the overview" }))));
}
window.addEventListener("hashchange", render);

/* ---------- shell: banner, profile chip, settings ---------- */
function refreshShell() {
  const name = P.env.app_name || "Prepformer";
  $("#brand-name").textContent = name;
  document.title = name;
  $("#profile-chip").textContent = P.profile ? P.profile.name : "Profile";
  const banner = $("#banner");
  if (P.env.checked && !P.env.torch) {
    banner.hidden = false;
    banner.textContent = "No Python with PyTorch was found, so code cannot be run yet. Run \"uv sync\" in the app folder, then open Settings and choose Detect again.";
  } else banner.hidden = true;
}
function applyTheme() {
  const t = localStorage.getItem("pf:theme") || "light";
  document.documentElement.dataset.theme = t;
}
async function loadEnv(refresh) {
  try { P.env = await api("/api/env" + (refresh ? "?refresh=1" : "")); P.env.checked = true; } catch (e) { P.env = {}; }
  refreshShell();
}
function openSettings() {
  const nameIn = h("input", { type: "text", value: P.env.app_name || "Prepformer" });
  const keyIn = h("input", { type: "password", placeholder: P.env.ai ? "A key is saved. Paste a new one to replace it." : "sk-ant-...", autocomplete: "off" });
  const modelIn = h("input", { type: "text", value: P.env.model || "" });
  const theme = localStorage.getItem("pf:theme") || "light";
  const themeSel = h("select", null, h("option", { value: "light", text: "Light" }), h("option", { value: "dark", text: "Dark" }));
  themeSel.value = theme;
  const pyInfo = h("p", { class: "small muted", text: P.env.torch ? "Running code with " + P.env.python + " (PyTorch " + P.env.torch + ")" : "No Python with PyTorch found." });
  const body = h("div", null,
    h("label", { class: "field" }, h("span", { text: "App name" }), nameIn),
    h("label", { class: "field" }, h("span", { text: "Theme" }), themeSel),
    h("label", { class: "field" }, h("span", { text: "Claude API key (for the tutor, hints and question generation)" }), keyIn),
    h("p", { class: "small muted", text: "The key is stored only in user_data/prepformer.db on this computer and sent only to api.anthropic.com." }),
    h("label", { class: "field" }, h("span", { text: "Claude model" }), modelIn),
    pyInfo,
    h("div", { class: "row" },
      h("button", { class: "btn sm", type: "button", text: "Detect Python again", onclick: async () => { pyInfo.textContent = "Looking for PyTorch"; await loadEnv(true); pyInfo.textContent = P.env.torch ? "Running code with " + P.env.python + " (PyTorch " + P.env.torch + ")" : "No Python with PyTorch found."; } }),
      P.env.ai ? h("button", { class: "btn sm", type: "button", text: "Remove saved key", onclick: async () => { await api("/api/settings", { api_key: "" }); await loadEnv(); toast("Key removed"); } }) : null));
  modal("Settings", body, [{ label: "Cancel" }, { label: "Save settings", primary: true, run: async () => {
    const payload = { app_name: nameIn.value.trim() || "Prepformer", model: modelIn.value.trim() };
    if (keyIn.value.trim()) payload.api_key = keyIn.value.trim();
    try { await api("/api/settings", payload); } catch (e) { toast(e.message); return false; }
    localStorage.setItem("pf:theme", themeSel.value);
    applyTheme();
    await loadEnv();
    toast("Settings saved");
    render();
  } }]);
}

/* ---------- tutor (Claude) ---------- */
async function askTutor(kind, context, messages) {
  const res = await api("/api/tutor", { kind, context, messages: messages || [] });
  return res.text;
}
function needKeyNote(what) {
  return h("div", { class: "note" }, h("p", null, "Add a Claude API key in ", h("a", { href: "#", text: "Settings", onclick: (e) => { e.preventDefault(); openSettings(); } }), " to " + what + "."));
}

/* ---------- boot ---------- */
async function loadProfile(id) {
  P.profile = P.profiles.find((p) => p.id === id) || P.profiles[0];
  localStorage.setItem("pf:profile", String(P.profile.id));
  P.state = await api("/api/state?profile=" + P.profile.id);
  refreshShell();
}
async function boot() {
  applyTheme();
  $("#settings-btn").addEventListener("click", openSettings);
  try {
    const [bank, profiles] = await Promise.all([api("/api/bank"), api("/api/profiles")]);
    P.bank = bank; P.profiles = profiles;
    indexBank();
    await loadProfile(Number(localStorage.getItem("pf:profile")));
    render();
    loadEnv();
    loadEditorLibrary();
  } catch (e) {
    clear($("#view")).append(h("div", { class: "note bad" }, h("p", { text: "Could not load the app: " + e.message }), h("p", { text: "Make sure the server is running: uv run server.py" })));
  }
}
/* The code editor (CodeMirror) is fetched in the background; until it arrives, or offline, a plain editor is used. */
function loadEditorLibrary() {
  const base = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/";
  const files = ["codemirror.min.js", "mode/python/python.min.js", "addon/edit/matchbrackets.min.js", "addon/edit/closebrackets.min.js", "addon/comment/comment.min.js"];
  const next = (i) => {
    if (i >= files.length) { P.editorReady = true; return; }
    const s = document.createElement("script");
    s.src = base + files[i];
    s.onload = () => next(i + 1);
    s.onerror = () => { P.editorReady = false; };
    document.head.append(s);
  };
  next(0);
}
async function reloadBank() { P.bank = await api("/api/bank"); indexBank(); }
window.addEventListener("DOMContentLoaded", boot);
