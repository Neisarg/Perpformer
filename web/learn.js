/* Learn: measure, plan, teach, practice. Modeled on the LearnHarness loop, with written lessons and an optional Claude tutor. */
"use strict";

const GOALS = {
  llm: { name: "LLM research engineer", targets: ["llm", "efficient", "transformer", "llmeval", "frontier", "pytorch"] },
  agents: { name: "Applied AI and agents", targets: ["agents", "llm", "llmeval", "mlsys"] },
  generalist: { name: "ML generalist", targets: ["linear", "trees", "classical", "unsup", "general", "eval", "training", "mlsys"] },
  vision: { name: "Computer vision", targets: ["vision", "genmodels"] },
  recsys: { name: "Ranking and recommenders", targets: ["recsys", "mlsys"] },
  all: { name: "Everything", targets: null },
};
const SHORT = { linalg: "Linear algebra", prob: "Probability", optim: "Optimization", linear: "Linear models", trees: "Trees", classical: "SVM, kNN, NB",
  unsup: "Unsupervised", general: "Generalization", eval: "Evaluation", nn: "Neural nets", blocks: "Building blocks", training: "Training",
  vision: "Vision", seq: "Sequences", transformer: "Transformers", nlp: "NLP", llm: "LLMs", efficient: "PEFT, quantization", agents: "Agents",
  llmeval: "LLM evals", genmodels: "Generative", rl: "RL", recsys: "Recsys", mlsys: "ML systems", pytorch: "PyTorch", frontier: "Frontiers" };
const LEVELS = { solid: "Solid", shaky: "Shaky", new: "New to you" };

function learnState() { return S("learn", { goal: "llm", measure: {}, concepts: {}, notes: {} }); }
function modules() { return P.bank.lessons.modules; }
function modProgress(m) {
  const L = learnState(), done = m.concepts.filter((c) => L.concepts[c.id] && L.concepts[c.id].done).length;
  const level = L.measure[m.id] ? L.measure[m.id].level : null;
  const status = done === m.concepts.length ? "complete" : level === "solid" ? "solid" : done ? "progress" : "todo";
  return { done, total: m.concepts.length, level, status };
}
function planFor(goalId) {
  const targets = (GOALS[goalId] || GOALS.llm).targets || modules().map((m) => m.id);
  const order = [], seen = new Set();
  const visit = (id) => { if (seen.has(id) || !P.mod[id]) return; seen.add(id); P.mod[id].requires.forEach(visit); order.push(id); };
  targets.forEach(visit);
  return { order, targets: new Set(targets) };
}
function statusTag(pr) {
  if (pr.status === "complete") return h("span", { class: "tag done", text: "Lessons done" });
  if (pr.status === "solid") return h("span", { class: "tag done", text: "Measured solid" });
  if (pr.status === "progress") return h("span", { class: "tag info", text: pr.done + " of " + pr.total + " ideas" });
  return h("span", { class: "tag", text: pr.level ? LEVELS[pr.level] : "Not started" });
}
function dueReviews() { const srs = S("srs", {}), t = today(); return Object.keys(srs).filter((id) => P.q[id] && srs[id].due <= t); }

/* ---------- hub ---------- */
function learnHub(view) {
  const L = learnState();
  const plan = planFor(L.goal);
  view.append(h("div", { class: "page-head" }, h("h1", { text: "Learn" }),
    h("p", { text: "Pick a goal. The plan orders the topics so each builds on the ones before it. For each topic: measure what you already know, work through the ideas (predict, read, check), then keep them with spaced review." })));
  const goalSeg = h("div", { class: "chips" });
  Object.entries(GOALS).forEach(([id, g]) => goalSeg.append(h("button", { class: "chip", type: "button", "aria-pressed": String(L.goal === id), text: g.name, onclick: () => { L.goal = id; save("learn"); render(); } })));
  const next = plan.order.map((id) => P.mod[id]).find((m) => ["todo", "progress"].includes(modProgress(m).status));
  const due = dueReviews();
  view.append(h("div", { class: "panel stack" }, h("div", null, h("p", { class: "small muted", text: "Goal" }), goalSeg),
    h("div", { class: "row" },
      next ? h("a", { class: "btn primary", href: "#/learn/" + next.id, text: (modProgress(next).done ? "Continue: " : "Start: ") + topicName(next.id) }) : h("span", { class: "tag done", text: "Plan complete" }),
      h("a", { class: "btn", href: "#/review", text: due.length ? "Review " + due.length + " due question" + (due.length > 1 ? "s" : "") : "Mixed review" }))));

  view.append(h("div", { class: "section" }, h("h2", { text: "To-do list" }), h("div", { class: "panel" }, todoList())));

  const ol = h("ol", { class: "plan" });
  plan.order.forEach((id, n) => {
    const m = P.mod[id], pr = modProgress(m);
    ol.append(h("li", { class: next && next.id === id ? "next" : "" }, h("span", { class: "ord", text: String(n + 1).padStart(2, "0") }),
      h("div", null, h("a", { href: "#/learn/" + id, text: topicName(id), style: "font-weight:500;color:inherit" }),
        h("div", { class: "small muted", text: m.requires.length ? "Builds on " + m.requires.map((r) => SHORT[r] || r).join(", ") : "No prerequisites" })),
      h("div", { class: "row" }, plan.targets.has(id) ? h("span", { class: "tag info", text: "Goal topic" }) : null, statusTag(pr))));
  });
  view.append(h("div", { class: "section" }, h("h2", { text: "Your plan: " + plan.order.length + " topics" }), h("div", { class: "panel" }, ol)));
  view.append(h("div", { class: "section" }, h("h2", { text: "Prerequisite map" }),
    h("p", { class: "muted small", text: "Topics to the right build on topics to the left. Outlined topics are your goal; faded ones are outside this plan." }),
    h("div", { class: "panel", style: "overflow-x:auto" }, depMap(plan))));
}

function depMap(plan) {
  const depth = {};
  const d = (id) => (id in depth ? depth[id] : (depth[id] = P.mod[id].requires.length ? 1 + Math.max(...P.mod[id].requires.map(d)) : 0));
  modules().forEach((m) => d(m.id));
  const cols = [];
  modules().forEach((m) => (cols[depth[m.id]] = cols[depth[m.id]] || []).push(m.id));
  const colW = 124, w = 112, hh = 26, gap = 36, rows = Math.max(...cols.map((c) => c.length));
  const pos = {};
  cols.forEach((col, ci) => col.forEach((id, ri) => { pos[id] = { x: 6 + ci * colW, y: 8 + ri * gap + ((rows - col.length) * gap) / 2 }; }));
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  const svg = el("svg", { class: "depmap", viewBox: "0 0 " + (cols.length * colW + 4) + " " + (rows * gap + 12), role: "img", "aria-label": "Topic prerequisite map" });
  svg.style.minWidth = "900px";
  modules().forEach((m) => m.requires.forEach((r) => {
    const a = pos[r], b = pos[m.id], x1 = a.x + w, y1 = a.y + hh / 2, x2 = b.x, y2 = b.y + hh / 2, mx = (x1 + x2) / 2;
    svg.append(el("path", { class: "edge", d: "M" + x1 + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + x2 + " " + y2 }));
  }));
  modules().forEach((m) => {
    const p = pos[m.id], pr = modProgress(m), inPlan = plan.order.includes(m.id);
    const g = el("g", { class: "t" + (plan.targets.has(m.id) ? " goal" : "") + (["complete", "solid"].includes(pr.status) ? " done" : "") + (inPlan ? "" : " off"), tabindex: "0", role: "link" });
    g.append(el("rect", { x: p.x, y: p.y, width: w, height: hh, rx: 4 }));
    const t = el("text", { x: p.x + w / 2, y: p.y + 17, "text-anchor": "middle" });
    t.textContent = SHORT[m.id] || m.id;
    const title = el("title", {});
    title.textContent = topicName(m.id);
    g.append(t, title);
    g.addEventListener("click", () => go("#/learn/" + m.id));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter") go("#/learn/" + m.id); });
    svg.append(g);
  });
  return svg;
}

/* ---------- a self-contained question used inside lessons and review ---------- */
function miniQuestion(q, opts) {
  opts = opts || {};
  const box = h("div", { class: "stack" });
  const meta = h("div", { class: "qmeta" });
  if (!opts.hideTopic) meta.append(h("span", { class: "tag", text: topicName(q.topic) }));
  meta.append(diffTag(q.difficulty));
  const text = qText(q.q);
  text.style.fontSize = "1.12rem";
  const optsEl = h("div", { class: "opts" });
  const fb = h("div");
  let done = false;
  const buttons = q.options.map((t, idx) => {
    const b = h("button", { class: "opt", type: "button", onclick: () => {
      if (done) return;
      done = true;
      const ok = idx === q.answer;
      buttons.forEach((x) => { x.disabled = true; });
      buttons[q.answer].classList.add("ok");
      if (!ok) b.classList.add("no");
      fb.append(h("div", { class: "note " + (ok ? "good" : "bad") }, h("p", null, h("strong", { text: ok ? "Correct. " : "Not quite. " }), inline(q.explanation))));
      if (opts.onDone) opts.onDone(ok);
    } }, h("span", { class: "k", text: LETTERS[idx] }), h("span", null, inline(t)));
    optsEl.append(b);
    return b;
  });
  box.append(meta, text, optsEl, fb);
  box.buttons = buttons; box.meta = meta;
  return box;
}

/* ---------- module page ---------- */
function learnModule(view, id) {
  const m = P.mod[id];
  if (!m) { view.append(h("div", { class: "page-head" }, h("h1", { text: topicName(id) }), h("p", { text: "There is no written lesson for this topic yet. Practise its questions, or use the tutor." }),
    h("div", { class: "row", style: "margin-top:1rem" }, h("button", { class: "btn primary", type: "button", text: "Practise this topic", onclick: () => startPractice({ ids: sample(P.qTopic[id] || [], 10).map((q) => q.id), label: topicName(id) }) })))); return; }
  const L = learnState(), topic = P.mcqTopics.find((t) => t.id === id), pr = modProgress(m), meas = L.measure[id];
  view.append(h("div", { class: "page-head" }, h("p", { class: "small" }, h("a", { href: "#/learn", text: "Learn" })), h("h1", { text: topic.name }), h("p", { text: m.summary }),
    h("div", { class: "row", style: "margin-top:0.8rem" }, statusTag(pr), meas ? h("span", { class: "tag", text: "Measured " + LEVELS[meas.level].toLowerCase() + ", " + meas.score + " of " + meas.total + " on " + meas.date }) : null,
      m.requires.map((r) => h("a", { class: "tag", href: "#/learn/" + r, text: "Builds on " + (SHORT[r] || r) })))));
  const related = (P.LESSON_TO_CODE[id] || []).filter((t) => P.probTopics.some((x) => x.id === t));
  view.append(h("div", { class: "row" },
    h("a", { class: "btn" + (meas ? "" : " primary"), href: "#/learn/" + id + "/measure", text: meas ? "Measure again" : "Measure what you know" }),
    h("button", { class: "btn", type: "button", text: "Practise questions", onclick: () => startPractice({ ids: sample(P.qTopic[id], 10).map((q) => q.id), label: topic.name, back: "#/learn/" + id }) }),
    related.length ? h("button", { class: "btn", type: "button", text: "Related coding problems", onclick: () => { const ui = S("ui", {}); ui.code = Object.assign({ diff: "Any", status: "all", search: "" }, ui.code, { mode: "practice", topics: related }); save("ui"); go("#/code"); } }) : null));
  if (topic.subtopics.length) view.append(h("p", { class: "small muted", style: "margin-top:1rem", text: "Covers: " + topic.subtopics.join("; ") + "." }));

  const sec = h("div", { class: "section" }, h("h2", { text: "Ideas" }));
  const firstOpen = m.concepts.find((c) => !(L.concepts[c.id] && L.concepts[c.id].done));
  m.concepts.forEach((c, n) => sec.append(conceptCard(m, c, n, firstOpen === c)));
  view.append(sec);

  const notes = L.notes[id];
  if (notes && (notes.learned.length || notes.review.length)) {
    view.append(h("div", { class: "section" }, h("h2", { text: "Your record for this topic" }), h("div", { class: "panel" },
      notes.learned.length ? h("div", null, h("p", { class: "small muted", text: "Shown in tutoring on " + notes.date }), h("ul", null, notes.learned.map((x) => h("li", { text: x })))) : null,
      notes.review.length ? h("div", null, h("p", { class: "small muted", text: "Still to firm up" }), h("ul", null, notes.review.map((x) => h("li", { text: x })))) : null)));
  }
  view.append(h("div", { class: "section" }, h("h2", { text: "Tutor session" }),
    h("p", { class: "muted", text: "A live session with Claude: it finds where your understanding ends, teaches one step at a time and has you predict before it explains." }), tutorPanel(m, topic)));
}

function conceptCard(m, c, n, open) {
  const L = learnState();
  const st = L.concepts[c.id] || (L.concepts[c.id] = {});
  const card = h("div", { class: "concept" });
  const tag = () => (st.done ? h("span", { class: "tag " + (st.shaky ? "medium" : "done"), text: st.shaky ? "Done, revisit" : "Done" }) : h("span", { class: "tag", text: "Idea " + (n + 1) }));
  const head = h("button", { type: "button", "aria-expanded": String(open) }, tag(), h("span", { text: c.title }));
  const inner = h("div", { class: "inner", hidden: !open });
  head.addEventListener("click", () => { inner.hidden = !inner.hidden; head.setAttribute("aria-expanded", String(!inner.hidden)); if (!inner.hidden && !inner.firstChild) build(); });
  card.append(head, inner);

  function build() {
    clear(inner).append(h("div", { class: "stage", text: "Predict before you read" }), h("p", { style: "font-family:var(--serif);font-size:1.1rem", text: c.q }));
    const optsEl = h("div", { class: "opts" });
    const why = h("textarea", { placeholder: "Optional: why do you think so? Writing your reasoning down makes the explanation stick.", rows: "2", "aria-label": "Your reasoning" });
    why.value = st.note || "";
    why.addEventListener("change", () => { st.note = why.value; save("learn"); });
    const rest = h("div");
    const buttons = c.options.map((t, idx) => {
      const b = h("button", { class: "opt", type: "button", onclick: () => reveal(idx) }, h("span", { class: "k", text: LETTERS[idx] }), h("span", null, inline(t)));
      optsEl.append(b);
      return b;
    });
    inner.append(optsEl, h("div", { style: "margin-top:0.7rem" }, why), rest);
    if (st.done) reveal(st.pick === undefined ? c.answer : st.pick, true);

    function reveal(idx, replay) {
      buttons.forEach((b) => { b.disabled = true; });
      buttons[c.answer].classList.add("ok");
      if (idx !== c.answer) buttons[idx].classList.add("no");
      if (!replay) { st.pick = idx; st.predicted = idx === c.answer; save("learn"); }
      clear(rest).append(h("div", { class: "stage", text: idx === c.answer ? "You predicted correctly. Here is why" : "Not what you predicted. Here is why" }), h("p", null, inline(c.explanation)));
      if (st.done) { rest.append(h("p", { class: "small muted", text: "You have completed this idea." })); return; }
      const pool = (P.qTopic[m.id] || []).filter((q) => q.difficulty !== "Hard");
      const unseen = pool.filter((q) => qStatus(q.id) === "u");
      const checks = sample(unseen.length >= 2 ? unseen : pool, 2);
      let answered = 0, wrong = 0;
      rest.append(h("div", { class: "stage", text: "Check: two questions from this topic" }));
      checks.forEach((q) => rest.append(h("div", { style: "margin-bottom:1.2rem" }, miniQuestion(q, { onDone: (ok) => {
        recordMcq(q, ok, "lesson");
        answered++; if (!ok) wrong++;
        if (answered === checks.length) {
          st.done = true; st.shaky = wrong > 0; st.on = today(); save("learn");
          head.replaceChild(tag(), head.firstChild);
          rest.append(h("div", { class: "note " + (wrong ? "warn" : "good") }, h("p", { text: wrong ? "Idea covered, but a check was missed. The missed question will come back in review." : "Idea covered. On to the next one." })));
        }
      } }))));
    }
  }
  if (open) build();
  return card;
}

function tutorPanel(m, topic) {
  if (!P.env.ai) return needKeyNote("start a tutoring session");
  const L = learnState();
  const messages = [];
  const log = h("div", { class: "chat" });
  const input = h("textarea", { rows: "2", placeholder: "Your answer or question. Write \"done\" to wrap up.", "aria-label": "Message to the tutor" });
  const send = h("button", { class: "btn primary", type: "button", text: "Start session", onclick: () => turn() });
  const context = { topic: topic.name, covers: topic.subtopics, ideas: m.concepts.map((c) => c.title),
    learner: { measured_level: L.measure[m.id] ? L.measure[m.id].level : null, ideas_completed: m.concepts.filter((c) => L.concepts[c.id] && L.concepts[c.id].done).map((c) => c.title), earlier_notes: L.notes[m.id] || null } };
  async function turn() {
    const text = input.value.trim();
    if (messages.length && !text) return;
    if (text) { messages.push({ role: "user", content: text }); log.append(h("div", { class: "msg user", text })); input.value = ""; }
    const wait = h("div", { class: "msg assistant" }, h("span", { class: "spinner" }));
    log.append(wait); log.scrollTop = log.scrollHeight;
    send.disabled = true;
    try {
      const reply = await askTutor("tutor", context, messages);
      messages.push({ role: "assistant", content: reply });
      wait.textContent = reply;
      const learned = (reply.match(/^LEARNED:(.*)$/m) || [])[1], review = (reply.match(/^REVIEW:(.*)$/m) || [])[1];
      if (learned !== undefined || review !== undefined) {
        const split = (s) => (s || "").split(/;|•|\s-\s/).map((x) => x.trim()).filter((x) => x && !/^none\.?$/i.test(x));
        L.notes[m.id] = { learned: split(learned), review: split(review), date: today() };
        save("learn");
        toast("Session notes saved to your record");
      }
    } catch (e) { wait.textContent = e.message; }
    send.disabled = false; send.textContent = "Send";
    log.scrollTop = log.scrollHeight;
  }
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) turn(); });
  return h("div", { class: "panel" }, log, input, h("div", { class: "row", style: "margin-top:0.6rem" }, send, h("span", { class: "small muted", text: "Ctrl or Cmd + Enter sends" })));
}

/* ---------- measure ---------- */
function learnMeasure(view, id) {
  const topic = P.mcqTopics.find((t) => t.id === id), pool = P.qTopic[id] || [];
  if (!topic || pool.length < 5) { go("#/learn"); return; }
  const by = (d) => shuffle(pool.filter((q) => q.difficulty === d));
  let qs = by("Easy").slice(0, 2).concat(by("Medium").slice(0, 2), by("Hard").slice(0, 1));
  if (qs.length < 5) qs = qs.concat(sample(pool.filter((q) => !qs.includes(q)), 5 - qs.length));
  const answers = [];
  let i = 0;
  const wrap = h("div", { class: "qwrap" });
  view.append(wrap);
  const draw = () => {
    clear(wrap);
    if (i >= qs.length) return result();
    const q = qs[i];
    let pick = null, conf = null;
    const nextBtn = h("button", { class: "btn primary", type: "button", text: i === qs.length - 1 ? "See where you stand" : "Next", disabled: true, onclick: () => { answers.push({ q, pick, conf }); i++; draw(); } });
    const optsEl = h("div", { class: "opts" });
    const buttons = q.options.map((t, idx) => { const b = h("button", { class: "opt", type: "button", onclick: () => { pick = idx; buttons.forEach((x, k) => x.classList.toggle("sel", k === idx)); nextBtn.disabled = conf === null; } },
      h("span", { class: "k", text: LETTERS[idx] }), h("span", null, inline(t))); optsEl.append(b); return b; });
    const seg = h("div", { class: "seg" });
    [["sure", "Sure"], ["think", "Fairly sure"], ["guess", "Guessing"]].forEach(([v, label]) => seg.append(h("button", { type: "button", text: label, "aria-pressed": "false",
      onclick: (e) => { conf = v; seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); nextBtn.disabled = pick === null; } })));
    wrap.append(h("div", { class: "progress" }, h("i", { style: "width:" + pct(i, qs.length) + "%" })),
      h("div", { class: "qmeta" }, h("span", { text: "Measuring " + topic.name }), h("span", { text: "Question " + (i + 1) + " of " + qs.length })),
      qText(q.q), optsEl, h("div", { class: "row", style: "margin-top:1rem" }, h("span", { class: "small muted", text: "How confident are you?" }), seg), h("div", { class: "qfoot" }, nextBtn));
  };
  const result = () => {
    const right = answers.filter((a) => a.pick === a.q.answer).length;
    const sureWrong = answers.filter((a) => a.pick !== a.q.answer && a.conf === "sure");
    const lucky = answers.filter((a) => a.pick === a.q.answer && a.conf === "guess").length;
    const level = right >= 4 && !sureWrong.length ? "solid" : right >= 2 ? "shaky" : "new";
    answers.forEach((a) => recordMcq(a.q, a.pick === a.q.answer, "measure"));
    const L = learnState();
    L.measure[id] = { level, score: right, total: qs.length, date: today(), sureWrong: sureWrong.length };
    save("learn");
    const advice = { solid: "You can skim this topic's ideas or skip ahead; spaced review will keep it fresh.", shaky: "Work through the ideas below your level and focus on the ones you missed.", new: "Start with the first idea of the lesson and take them in order." }[level];
    wrap.append(h("div", { class: "page-head" }, h("h1", { text: LEVELS[level] + ": " + right + " of " + qs.length }), h("p", { text: advice })),
      sureWrong.length ? h("div", { class: "note bad" }, h("p", { text: "You were sure about " + sureWrong.length + " answer" + (sureWrong.length > 1 ? "s" : "") + " that turned out wrong. Confident misconceptions are the most valuable thing to fix, so start with those below." })) : null,
      lucky ? h("div", { class: "note warn", style: "margin-top:0.6rem" }, h("p", { text: lucky + " correct answer" + (lucky > 1 ? "s were" : " was") + " a guess, so treat " + (lucky > 1 ? "those ideas" : "that idea") + " as not yet known." })) : null,
      h("div", { class: "row", style: "margin:1rem 0" }, h("a", { class: "btn primary", href: "#/learn/" + lessonFor(id), text: "Open the lesson" }), h("a", { class: "btn", href: "#/learn", text: "Back to the plan" })));
    answers.filter((a) => a.pick !== a.q.answer).forEach((a) => wrap.append(reviewItem(a.q, a.pick)));
  };
  draw();
}

/* ---------- spaced, mixed review: the topic is hidden until you ask ---------- */
function reviewView(view) {
  const L = learnState(), srs = S("srs", {});
  let ids = shuffle(dueReviews()).slice(0, 15);
  const fromDue = ids.length;
  if (ids.length < 8) {
    const learned = modules().filter((m) => { const pr = modProgress(m); return pr.done > 0 || pr.level; }).map((m) => m.id);
    const pool = P.bank.mcq.questions.filter((q) => (learned.length ? learned.includes(q.topic) : true) && !srs[q.id] && !ids.includes(q.id));
    ids = ids.concat(sample(pool, 8 - ids.length).map((q) => q.id));
  }
  let i = 0, right = 0;
  const wrap = h("div", { class: "qwrap" });
  view.append(wrap);
  const draw = () => {
    clear(wrap);
    if (i >= ids.length) {
      wrap.append(h("div", { class: "page-head" }, h("h1", { text: right + " of " + ids.length + " recalled" }),
        h("p", { text: "Questions you got right come back after a longer gap; missed ones return tomorrow." })),
        h("div", { class: "row" }, h("a", { class: "btn primary", href: "#/learn", text: "Back to Learn" }), h("button", { class: "btn", type: "button", text: "Another round", onclick: render })));
      return;
    }
    const q = P.q[ids[i]];
    let hints = 0, answered = false;
    const mq = miniQuestion(q, { hideTopic: true, onDone: (ok) => {
      answered = true;
      recordMcq(q, ok && hints < 2, "review");
      if (ok) right++;
      if (!S("srs", {})[q.id]) { S("srs", {})[q.id] = { box: ok ? 1 : 0, due: addDays(ok ? 2 : 1) }; save("srs"); }
      hintRow.replaceChildren(h("button", { class: "btn primary", type: "button", text: i + 1 < ids.length ? "Next" : "Finish", onclick: () => { i++; draw(); } }));
    } });
    const hintRow = h("div", { class: "qfoot" }, h("button", { class: "btn", type: "button", text: "Hint", onclick: (e) => {
      if (answered) return;
      hints++;
      if (hints === 1) { mq.meta.prepend(h("span", { class: "tag info", text: topicName(q.topic) })); e.currentTarget.textContent = "Another hint"; }
      else { shuffle(q.options.map((_, k) => k).filter((k) => k !== q.answer)).slice(0, 2).forEach((k) => { mq.buttons[k].classList.add("gone"); mq.buttons[k].disabled = true; }); e.currentTarget.remove(); }
    } }), h("span", { class: "small muted", text: "The topic is hidden on purpose: recalling which idea applies is part of the practice." }));
    wrap.append(h("div", { class: "progress" }, h("i", { style: "width:" + pct(i, ids.length) + "%" })),
      h("div", { class: "qmeta" }, h("span", { text: "Review " + (i + 1) + " of " + ids.length }), i < fromDue ? h("span", { class: "tag", text: "Due" }) : h("span", { class: "tag", text: "New" })), mq, hintRow);
  };
  if (!ids.length) wrap.append(h("div", { class: "page-head" }, h("h1", { text: "Nothing to review yet" }), h("p", null, "Answer some questions first. ", h("a", { href: "#/learn", text: "Go to Learn" }))));
  else draw();
}

route("/learn", "learn", learnHub);
route("/learn/([^/]+)", "learn", learnModule);
route("/learn/([^/]+)/measure", "learn", learnMeasure);
route("/review", "learn", reviewView);
