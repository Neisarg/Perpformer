/* Multiple choice: setup, practice mode (hint, then lesson) and exam mode (25 questions, 15 minutes). */
"use strict";

const EXAM_Q = 25, EXAM_SECONDS = 15 * 60;
let practice = null; // the running practice session, kept in memory

function mcqSetup(view) {
  const ui = S("ui", {});
  const cfg = ui.mcq || (ui.mcq = { mode: "practice", topics: [], diff: "Any", count: 10, pool: "all" });
  const resume = local.get("mcqExam");
  const head = h("div", { class: "page-head" }, h("h1", { text: "Multiple choice" }),
    h("p", { text: P.bank.mcq.questions.length + " questions across " + P.mcqTopics.length + " topics. Practice gives a hint after a miss; an exam is " + EXAM_Q + " questions in " + EXAM_SECONDS / 60 + " minutes." }));
  view.append(head);
  if (resume) view.append(h("div", { class: "note warn" }, h("p", null, "An exam is in progress. ", h("a", { href: "#/mcq/exam", text: "Return to it" }), ".")));

  const modeSeg = h("div", { class: "seg", role: "group", "aria-label": "Mode" });
  [["practice", "Practice"], ["exam", "Exam"]].forEach(([id, label]) => modeSeg.append(h("button", {
    type: "button", text: label, "aria-pressed": String(cfg.mode === id), onclick: () => { cfg.mode = id; save("ui"); render(); } })));

  const topicChips = h("div", { class: "chips" });
  const allOn = cfg.topics.length === 0;
  topicChips.append(h("button", { class: "chip", type: "button", "aria-pressed": String(allOn), text: "All topics", onclick: () => { cfg.topics = []; save("ui"); render(); } }));
  P.mcqTopics.forEach((t) => topicChips.append(h("button", {
    class: "chip", type: "button", "aria-pressed": String(cfg.topics.includes(t.id)),
    onclick: () => { cfg.topics = cfg.topics.includes(t.id) ? cfg.topics.filter((x) => x !== t.id) : cfg.topics.concat(t.id); save("ui"); render(); } },
    t.name, h("span", { class: "n", text: String((P.qTopic[t.id] || []).length) }))));

  const panel = h("div", { class: "panel stack" }, h("div", { class: "row" }, h("strong", { text: "Mode" }), modeSeg),
    h("div", null, h("p", { class: "small muted", text: "Topics" }), topicChips));

  const pool = pickPool(cfg);
  if (cfg.mode === "practice") {
    const mk = (key, values, labels) => {
      const seg = h("div", { class: "seg" });
      values.forEach((v, i) => seg.append(h("button", { type: "button", text: labels ? labels[i] : String(v), "aria-pressed": String(cfg[key] === v), onclick: () => { cfg[key] = v; save("ui"); render(); } })));
      return seg;
    };
    panel.append(
      h("div", { class: "row" }, h("span", { class: "small muted", text: "Difficulty" }), mk("diff", ["Any", "Easy", "Medium", "Hard"])),
      h("div", { class: "row" }, h("span", { class: "small muted", text: "Questions" }), mk("count", [10, 20, 30])),
      h("div", { class: "row" }, h("span", { class: "small muted", text: "Draw from" }), mk("pool", ["all", "new", "missed"], ["Everything", "Not answered yet", "Missed before"])),
      h("div", { class: "row" },
        h("button", { class: "btn primary", type: "button", disabled: !pool.length, text: "Start practice", onclick: () => startPractice({ ids: sample(pool, cfg.count).map((q) => q.id), label: "Practice" }) }),
        h("span", { class: "small muted", text: pool.length + " questions match" })));
  } else {
    panel.append(
      h("p", { text: EXAM_Q + " questions, " + EXAM_SECONDS / 60 + " minutes, no feedback until you finish. Afterwards, the topics you missed go on your learning to-do list." }),
      h("div", { class: "row" },
        h("button", { class: "btn primary", type: "button", disabled: pool.length < 5, text: "Start exam", onclick: () => startMcqExam(pool) }),
        h("span", { class: "small muted", text: "Drawn from " + pool.length + " questions" })));
  }
  view.append(panel);
}

function pickPool(cfg) {
  const st = S("mcq", {});
  return P.bank.mcq.questions.filter((q) => {
    if (cfg.topics.length && !cfg.topics.includes(q.topic)) return false;
    if (cfg.mode === "exam") return true;
    if (cfg.diff !== "Any" && q.difficulty !== cfg.diff) return false;
    const s = st[q.id];
    if (cfg.pool === "new") return !s || !s.n;
    if (cfg.pool === "missed") return s && s.n && !s.ok;
    return true;
  });
}

/* ---------- practice ---------- */
function startPractice(opts) {
  const ids = (opts.ids || []).filter((id) => P.q[id]);
  if (!ids.length) { toast("No questions to practise"); return; }
  practice = { ids, i: 0, label: opts.label || "Practice", right: 0, missed: [], back: opts.back || "#/mcq" };
  go("#/mcq/practice");
}

function practiceView(view) {
  if (!practice) { go("#/mcq"); return; }
  if (practice.i >= practice.ids.length) return practiceSummary(view);
  const q = P.q[practice.ids[practice.i]];
  const st = { tries: 0, sel: null, done: false, gone: new Set() };
  const wrap = h("div", { class: "qwrap" });
  const bar = h("div", { class: "progress" }, h("i", { style: "width:" + pct(practice.i, practice.ids.length) + "%" }));
  const meta = h("div", { class: "qmeta" }, h("span", { text: practice.label }), h("span", { text: "Question " + (practice.i + 1) + " of " + practice.ids.length }),
    h("span", { class: "tag", text: topicName(q.topic) }), diffTag(q.difficulty));
  const opts = h("div", { class: "opts" });
  const feedback = h("div", { class: "stack", style: "margin-top:1.2rem" });
  const checkBtn = h("button", { class: "btn primary", type: "button", text: "Check answer", disabled: true, onclick: check });
  const foot = h("div", { class: "qfoot" }, checkBtn, h("button", { class: "btn quiet", type: "button", text: "End session", onclick: () => { practice.ids = practice.ids.slice(0, practice.i); render(); } }));
  const buttons = q.options.map((text, idx) => {
    const b = h("button", { class: "opt", type: "button", onclick: () => choose(idx) }, h("span", { class: "k", text: LETTERS[idx] }), h("span", null, inline(text)));
    opts.append(b);
    return b;
  });
  wrap.append(bar, meta, qText(q.q), opts, foot, feedback);
  view.append(wrap);

  function choose(idx) {
    if (st.done || st.gone.has(idx)) return;
    st.sel = idx;
    buttons.forEach((b, i) => b.classList.toggle("sel", i === idx));
    checkBtn.disabled = false;
  }
  function finish(correctFirstTry) {
    st.done = true;
    buttons.forEach((b) => { b.disabled = true; });
    buttons[q.answer].classList.add("ok");
    recordMcq(q, correctFirstTry, "practice");
    if (correctFirstTry) practice.right++; else practice.missed.push(q.id);
    clear(foot).append(h("button", { class: "btn primary", type: "button", text: practice.i + 1 < practice.ids.length ? "Next question" : "See results", onclick: next }));
    foot.firstChild.focus();
  }
  function next() { practice.i++; render(); }
  function check() {
    if (st.sel === null || st.done) return;
    if (st.sel === q.answer) {
      clear(feedback).append(h("div", { class: "note good" }, h("p", null, h("strong", { text: st.tries ? "Correct on the second try. " : "Correct. " }), inline(q.explanation))));
      finish(st.tries === 0);
      return;
    }
    buttons[st.sel].classList.remove("sel");
    buttons[st.sel].classList.add("no");
    buttons[st.sel].disabled = true;
    st.gone.add(st.sel);
    st.tries++;
    st.sel = null;
    checkBtn.disabled = true;
    if (st.tries === 1) return showHint();
    // second miss: explain and point to the lesson
    const lesson = lessonFor(q.topic);
    addTodo(q.topic, [q.id], "practice");
    clear(feedback).append(h("div", { class: "note bad" },
      h("p", null, h("strong", { text: "Not quite. The answer is " + LETTERS[q.answer] + ". " }), inline(q.explanation)),
      h("p", null, "This is worth revisiting. ", lesson ? h("a", { href: "#/learn/" + lesson, text: "Study " + topicName(q.topic) }) : "Review " + topicName(q.topic),
        ". It has been added to your learning to-do list.")));
    finish(false);
  }
  function showHint() {
    const others = q.options.map((_, i) => i).filter((i) => i !== q.answer && !st.gone.has(i));
    const drop = others[Math.floor(Math.random() * others.length)];
    if (drop !== undefined) { st.gone.add(drop); buttons[drop].classList.add("gone"); buttons[drop].disabled = true; }
    const mod = P.mod[q.topic];
    const text = h("p", null, h("strong", { text: "Not that one. Here is a hint: " }),
      "one more wrong option is crossed out. The question is about " + topicName(q.topic) + (mod ? ": " + mod.summary.charAt(0).toLowerCase() + mod.summary.slice(1) : "."));
    const box = h("div", { class: "note warn" }, text, h("p", { class: "small", text: "Pick again from the remaining options." }));
    clear(feedback).append(box);
    if (P.env.ai) {
      const line = h("p", { class: "small" }, h("span", { class: "spinner" }), " Asking the tutor for a sharper hint");
      box.append(line);
      askTutor("mcq_hint", { question: q.q, options: q.options, learner_chose: q.options[[...st.gone][0]], topic: topicName(q.topic) })
        .then((hint) => { clear(line).append(h("strong", { text: "Tutor: " }), hint); })
        .catch(() => line.remove());
    }
  }
  const onKey = (e) => {
    if (e.target.matches("input, textarea")) return;
    const n = "1234abcd".indexOf(e.key.toLowerCase());
    if (n >= 0 && !st.done) choose(n % 4);
    if (e.key === "Enter") { e.preventDefault(); if (st.done) next(); else check(); }
  };
  document.addEventListener("keydown", onKey);
  P.cleanup = () => document.removeEventListener("keydown", onKey);
}

function practiceSummary(view) {
  const n = practice.ids.length;
  view.append(h("div", { class: "page-head" }, h("h1", { text: n ? practice.right + " of " + n + " right first time" : "Session ended" }),
    h("p", { text: practice.missed.length ? "The topics behind the questions you missed twice are on your to-do list." : "Nothing missed. Try a harder set or an exam." })));
  const missed = practice.missed.slice();
  view.append(h("div", { class: "row" },
    missed.length ? h("button", { class: "btn primary", type: "button", text: "Retry the " + missed.length + " you missed", onclick: () => startPractice({ ids: missed, label: "Retry" }) }) : null,
    h("a", { class: "btn", href: "#/mcq", text: "New session" }), h("a", { class: "btn", href: "#/learn", text: "Go to Learn" })));
  if (missed.length) {
    const sec = h("div", { class: "section" }, h("h2", { text: "Missed questions" }));
    missed.forEach((id) => sec.append(reviewItem(P.q[id], null)));
    view.append(sec);
  }
}

function reviewItem(q, chosen) {
  const item = h("div", { class: "review-item" }, h("div", { class: "qmeta" }, h("span", { class: "tag", text: topicName(q.topic) }), diffTag(q.difficulty)), qText(q.q));
  const ul = h("div", { class: "opts" });
  q.options.forEach((text, i) => ul.append(h("div", { class: "opt" + (i === q.answer ? " ok" : i === chosen ? " no" : "") },
    h("span", { class: "k", text: LETTERS[i] }), h("span", null, inline(text), i === chosen && i !== q.answer ? h("em", { class: "muted", text: "  (your answer)" }) : null))));
  item.append(ul, h("p", { class: "small", style: "margin-top:0.6rem" }, inline(q.explanation)));
  const lesson = lessonFor(q.topic);
  if (lesson) item.append(h("a", { class: "small", href: "#/learn/" + lesson, text: "Study " + topicName(q.topic) }));
  return item;
}

/* ---------- exam ---------- */
function startMcqExam(pool) {
  const ids = sample(pool, EXAM_Q).map((q) => q.id);
  local.set("mcqExam", { ids, answers: {}, flags: {}, start: Date.now(), i: 0 });
  go("#/mcq/exam");
}

function mcqExamView(view) {
  const ex = local.get("mcqExam");
  if (!ex) { go("#/mcq"); return; }
  ex.ids = ex.ids.filter((id) => P.q[id]);
  const remaining = () => EXAM_SECONDS - (Date.now() - ex.start) / 1000;
  if (remaining() <= 0) return finishMcqExam(ex);
  const wrap = h("div", { class: "qwrap" });
  const timer = h("span", { class: "timer", "aria-label": "Time remaining" });
  const bodyEl = h("div");
  const grid = h("div", { class: "qgrid", "aria-label": "Question navigator" });
  wrap.append(h("div", { class: "spread", style: "margin-bottom:1rem" }, h("h2", { text: "Exam" }),
    h("div", { class: "row" }, timer, h("button", { class: "btn primary", type: "button", text: "Finish exam", onclick: async () => {
      const left = ex.ids.length - Object.keys(ex.answers).length;
      if (await confirmBox("Finish the exam?", left ? left + " question" + (left > 1 ? "s are" : " is") + " unanswered and will count as wrong." : "You answered every question.", "Finish and grade")) finishMcqExam(ex);
    } }))), bodyEl, grid);
  view.append(wrap);

  function draw() {
    const q = P.q[ex.ids[ex.i]];
    clear(bodyEl).append(h("div", { class: "qmeta" }, h("span", { text: "Question " + (ex.i + 1) + " of " + ex.ids.length }), diffTag(q.difficulty)), qText(q.q));
    const opts = h("div", { class: "opts" });
    q.options.forEach((text, idx) => opts.append(h("button", { class: "opt" + (ex.answers[q.id] === idx ? " sel" : ""), type: "button",
      onclick: () => { ex.answers[q.id] = idx; local.set("mcqExam", ex); draw(); } }, h("span", { class: "k", text: LETTERS[idx] }), h("span", null, inline(text)))));
    bodyEl.append(opts, h("div", { class: "qfoot" },
      h("button", { class: "btn", type: "button", text: "Previous", disabled: ex.i === 0, onclick: () => move(-1) }),
      h("button", { class: "btn", type: "button", text: "Next", disabled: ex.i === ex.ids.length - 1, onclick: () => move(1) }),
      h("button", { class: "btn quiet", type: "button", text: ex.flags[q.id] ? "Remove flag" : "Flag for review", onclick: () => { ex.flags[q.id] = !ex.flags[q.id]; local.set("mcqExam", ex); draw(); } })));
    clear(grid);
    ex.ids.forEach((id, n) => grid.append(h("button", { type: "button", text: String(n + 1), "aria-label": "Question " + (n + 1),
      class: (ex.answers[id] !== undefined ? "ans " : "") + (n === ex.i ? "cur " : "") + (ex.flags[id] ? "flag" : ""), onclick: () => { ex.i = n; local.set("mcqExam", ex); draw(); } })));
  }
  function move(d) { ex.i = Math.min(ex.ids.length - 1, Math.max(0, ex.i + d)); local.set("mcqExam", ex); draw(); }
  function tick() {
    const r = remaining();
    timer.textContent = fmtTime(r);
    timer.classList.toggle("low", r < 120);
    if (r <= 0) finishMcqExam(ex);
  }
  const onKey = (e) => {
    const n = "1234abcd".indexOf(e.key.toLowerCase());
    if (n >= 0) { ex.answers[ex.ids[ex.i]] = n % 4; local.set("mcqExam", ex); draw(); }
    if (e.key === "ArrowRight" || e.key === "Enter") move(1);
    if (e.key === "ArrowLeft") move(-1);
  };
  document.addEventListener("keydown", onKey);
  const iv = setInterval(tick, 500);
  P.cleanup = () => { clearInterval(iv); document.removeEventListener("keydown", onKey); };
  draw(); tick();
}

function finishMcqExam(ex) {
  if (P.cleanup) { P.cleanup(); P.cleanup = null; }
  const duration = Math.min(EXAM_SECONDS, Math.round((Date.now() - ex.start) / 1000));
  const byTopic = {}, wrong = [];
  let score = 0;
  ex.ids.forEach((id) => {
    const q = P.q[id], a = ex.answers[id], ok = a === q.answer;
    const t = byTopic[q.topic] || (byTopic[q.topic] = { right: 0, total: 0, wrong: [] });
    t.total++;
    if (ok) { t.right++; score++; } else { t.wrong.push(id); wrong.push(id); }
    if (a !== undefined) recordMcq(q, ok, "exam");
  });
  Object.entries(byTopic).forEach(([topic, t]) => { if (t.wrong.length) addTodo(topic, t.wrong, "exam"); });
  const result = { ids: ex.ids, answers: ex.answers, score, total: ex.ids.length, duration, byTopic, when: new Date().toISOString() };
  local.set("mcqExamResult", result);
  local.del("mcqExam");
  api("/api/exam", { profile: P.profile.id, kind: "mcq", score, total: ex.ids.length, duration_s: duration,
    detail: { topics: Object.fromEntries(Object.entries(byTopic).map(([k, v]) => [k, { right: v.right, total: v.total }])), wrong } }).catch(() => {});
  go("#/mcq/result");
}

function mcqResultView(view) {
  const r = local.get("mcqExamResult");
  if (!r) { go("#/mcq"); return; }
  view.append(h("div", { class: "page-head" }, h("h1", { text: r.score + " of " + r.total + " correct" }),
    h("p", { text: pct(r.score, r.total) + "% in " + fmtTime(r.duration) + ". " + (r.score === r.total ? "A clean sheet." : "The topics below are on your learning to-do list.") })));
  const topics = Object.entries(r.byTopic).sort((a, b) => (a[1].right / a[1].total) - (b[1].right / b[1].total));
  const table = h("table", null, h("thead", null, h("tr", null, h("th", { text: "Topic" }), h("th", { class: "num", text: "Score" }), h("th", { text: "" }), h("th", { text: "" }))));
  const tb = h("tbody");
  topics.forEach(([id, t]) => {
    const lesson = lessonFor(id);
    tb.append(h("tr", null, h("td", { text: topicName(id) }), h("td", { class: "num", text: t.right + " / " + t.total }),
      h("td", null, h("div", { class: "bar" }, h("i", { style: "width:" + pct(t.right, t.total) + "%" }))),
      h("td", null, t.wrong.length && lesson ? h("a", { class: "btn sm", href: "#/learn/" + lesson, text: "Study this topic" }) : t.wrong.length ? h("span", { class: "tag", text: "On your list" }) : h("span", { class: "tag done", text: "All correct" }))));
  });
  table.append(tb);
  view.append(h("div", { class: "panel" }, h("h2", { text: "By topic" }), table));
  const missed = r.ids.filter((id) => P.q[id] && r.answers[id] !== P.q[id].answer);
  if (missed.length) {
    view.append(h("div", { class: "section" }, h("div", { class: "spread" }, h("h2", { text: "Learning to-do list" }),
      h("button", { class: "btn", type: "button", text: "Retry the " + missed.length + " missed questions", onclick: () => startPractice({ ids: missed, label: "Exam review" }) })), todoList()));
    const sec = h("div", { class: "section" }, h("h2", { text: "Review" }));
    missed.forEach((id) => sec.append(reviewItem(P.q[id], r.answers[id])));
    view.append(sec);
  }
  view.append(h("div", { class: "section row" }, h("a", { class: "btn", href: "#/mcq", text: "Back to multiple choice" }), h("a", { class: "btn", href: "#/profile", text: "See exam history" })));
}

route("/mcq", "mcq", mcqSetup);
route("/mcq/practice", "mcq", practiceView);
route("/mcq/exam", "mcq", mcqExamView);
route("/mcq/result", "mcq", mcqResultView);
