/* Overview, topics, profile and "add material" pages. */
"use strict";

function streakFrom(days) {
  const set = new Set(days.map((d) => d.day));
  let n = 0;
  const d = new Date();
  if (!set.has(d.toLocaleDateString("en-CA"))) d.setDate(d.getDate() - 1);
  while (set.has(d.toLocaleDateString("en-CA"))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function totals() {
  const st = S("mcq", {});
  let seen = 0, n = 0, c = 0;
  P.bank.mcq.questions.forEach((q) => { const s = st[q.id]; if (s && s.n) { seen++; n += s.n; c += s.c; } });
  const solved = P.bank.problems.problems.filter((p) => codeStatus(p.id) === "solved").length;
  return { seen, attempts: n, correct: c, solved };
}
function stat(value, label) { return h("div", { class: "stat" }, h("b", { text: String(value) }), h("span", { text: label })); }

function masteryMap() {
  const map = h("div", { class: "map" });
  const labels = { u: "not answered", w: "missed last time", r: "right last time", s: "right twice running" };
  P.mcqTopics.forEach((t) => {
    const qs = P.qTopic[t.id] || [];
    const cells = h("div", { class: "cells" });
    let good = 0;
    qs.forEach((q, i) => { const s = qStatus(q.id); if (s === "r" || s === "s") good++; cells.append(h("i", { class: s === "u" ? "" : s, title: "Question " + (i + 1) + ": " + labels[s] })); });
    map.append(h("a", { class: "lab", href: lessonFor(t.id) ? "#/learn/" + t.id : "#/topics", text: t.name, title: t.name }), cells, h("span", { class: "pct", text: pct(good, qs.length) + "%" }));
  });
  return map;
}
function codeMap() {
  const map = h("div", { class: "map" });
  P.probTopics.forEach((t) => {
    const ps = P.bank.problems.problems.filter((p) => p.topic === t.id);
    const cells = h("div", { class: "cells" });
    let solved = 0;
    ps.forEach((p) => { const s = codeStatus(p.id); if (s === "solved") solved++; cells.append(h("i", { class: s === "solved" ? "s" : s === "attempted" ? "a" : "", title: p.title + ": " + (s === "todo" ? "not started" : s) })); });
    map.append(h("a", { class: "lab", href: "#/code", text: t.name, title: t.name, onclick: () => { const ui = S("ui", {}); ui.code = Object.assign({ diff: "Any", status: "all", search: "" }, ui.code, { mode: "practice", topics: [t.id] }); save("ui"); } }),
      cells, h("span", { class: "pct", text: solved + " / " + ps.length }));
  });
  return map;
}

function overview(view) {
  const t = totals(), due = dueReviews().length;
  const L = learnState(), plan = planFor(L.goal);
  const next = plan.order.map((id) => P.mod[id]).find((m) => ["todo", "progress"].includes(modProgress(m).status));
  const streak = h("b", { text: "0" });
  api("/api/activity?profile=" + P.profile.id).then((a) => { streak.textContent = String(streakFrom(a.days)); }).catch(() => {});
  view.append(h("div", { class: "page-head" }, h("h1", { text: "Where you stand, " + P.profile.name }),
    h("p", { text: "Every square is one question. The map fills in as you practise; aim to turn each row yellow." })));
  view.append(h("div", { class: "statline" }, h("div", { class: "stat" }, streak, h("span", { text: "day streak" })),
    stat(t.seen + " / " + P.bank.mcq.questions.length, "questions answered"), stat(pct(t.correct, t.attempts) + "%", "answers correct"),
    stat(t.solved + " / " + P.bank.problems.problems.length, "problems solved"), stat(due, "reviews due")));
  view.append(h("div", { class: "row", style: "margin-top:1.5rem" },
    next ? h("a", { class: "btn primary", href: "#/learn/" + next.id, text: "Continue learning: " + topicName(next.id) }) : null,
    h("a", { class: "btn", href: "#/mcq", text: "Practise questions" }), h("a", { class: "btn", href: "#/code", text: "Solve a problem" }),
    due ? h("a", { class: "btn", href: "#/review", text: "Review " + due + " due" }) : null));
  view.append(h("div", { class: "section" }, h("h2", { text: "Multiple choice" }), h("div", { class: "panel" }, masteryMap(),
    h("div", { class: "legend" }, h("span", null, h("i"), "Not answered"), h("span", null, h("i", { style: "background:var(--v0)" }), "Missed last time"),
      h("span", null, h("i", { style: "background:var(--v2)" }), "Right last time"), h("span", null, h("i", { style: "background:var(--v4)" }), "Right twice running")))));
  view.append(h("div", { class: "section" }, h("h2", { text: "Coding" }), h("div", { class: "panel" }, codeMap(),
    h("div", { class: "legend" }, h("span", null, h("i"), "Not started"), h("span", null, h("i", { style: "background:var(--v1)" }), "Attempted"), h("span", null, h("i", { style: "background:var(--v4)" }), "Solved")))));
  view.append(h("div", { class: "section" }, h("h2", { text: "Learning to-do list" }), h("div", { class: "panel" }, todoList(6))));
}

function topicsPage(view) {
  view.append(h("div", { class: "page-head" }, h("h1", { text: "Topics" }),
    h("p", { text: "What ML research and engineering interviews draw on, and what this bank covers for each: " + P.bank.mcq.questions.length + " multiple-choice questions and " + P.bank.problems.problems.length + " coding problems." })));
  const sec = h("div", { class: "section" }, h("h2", { text: "Concept topics" }));
  const ul = h("ul", { class: "list" });
  P.mcqTopics.forEach((t) => {
    const s = topicStats(t.id);
    ul.append(h("li", null, h("div", { class: "grow" }, h("strong", { text: t.name }), t.custom ? h("span", { class: "tag info", style: "margin-left:0.5rem", text: "From your material" }) : null,
      h("div", { class: "small muted", text: t.subtopics.length ? t.subtopics.join("; ") : "Questions generated from material you added" })),
      h("span", { class: "small muted", text: s.seen + " of " + s.total + " answered" }),
      P.mod[t.id] ? h("a", { class: "btn sm", href: "#/learn/" + t.id, text: "Lesson" }) : null,
      h("button", { class: "btn sm", type: "button", text: "Practise", onclick: () => startPractice({ ids: sample(P.qTopic[t.id] || [], 10).map((q) => q.id), label: t.name, back: "#/topics" }) })));
  });
  sec.append(h("div", { class: "panel" }, ul));
  const sec2 = h("div", { class: "section" }, h("h2", { text: "Coding topics" }));
  const ul2 = h("ul", { class: "list" });
  P.probTopics.forEach((t) => {
    const ps = P.bank.problems.problems.filter((p) => p.topic === t.id);
    ul2.append(h("li", null, h("div", { class: "grow" }, h("strong", { text: t.name }), h("div", { class: "small muted", text: (t.subtopics || []).join("; ") })),
      h("span", { class: "small muted", text: ps.filter((p) => codeStatus(p.id) === "solved").length + " of " + ps.length + " solved" }),
      h("button", { class: "btn sm", type: "button", text: "Open problems", onclick: () => { const ui = S("ui", {}); ui.code = Object.assign({ diff: "Any", status: "all", search: "" }, ui.code, { mode: "practice", topics: [t.id] }); save("ui"); go("#/code"); } })));
  });
  sec2.append(h("div", { class: "panel" }, ul2));
  view.append(sec, sec2);
}

function profilePage(view) {
  const t = totals();
  view.append(h("div", { class: "page-head" }, h("h1", { text: P.profile.name }), h("p", { text: "Profile created " + String(P.profile.created_at).slice(0, 10) + ". Everything here is stored on this computer." })));
  const sel = h("select", { "aria-label": "Switch profile", style: "max-width:220px" }, P.profiles.map((p) => h("option", { value: String(p.id), text: p.name })));
  sel.value = String(P.profile.id);
  sel.addEventListener("change", async () => { await loadProfile(Number(sel.value)); render(); toast("Switched to " + P.profile.name); });
  const ask = (title, label, initial, run) => { const input = h("input", { type: "text", value: initial });
    modal(title, h("label", { class: "field" }, h("span", { text: label }), input), [{ label: "Cancel" }, { label: "Save", primary: true, run: async () => {
      try { await run(input.value.trim()); } catch (e) { toast(e.message); return false; } } }]); };
  view.append(h("div", { class: "panel row" }, h("span", { class: "small muted", text: "Profile" }), sel,
    h("button", { class: "btn sm", type: "button", text: "New profile", onclick: () => ask("New profile", "Name", "", async (name) => { const p = await api("/api/profiles", { name }); P.profiles = await api("/api/profiles"); await loadProfile(p.id); render(); }) }),
    h("button", { class: "btn sm", type: "button", text: "Rename", onclick: () => ask("Rename profile", "Name", P.profile.name, async (name) => { await api("/api/profiles", { id: P.profile.id, name }); P.profiles = await api("/api/profiles"); await loadProfile(P.profile.id); render(); }) })));

  const streak = h("b", { text: "0" }), chart = h("div", { class: "act" }), examBody = h("tbody");
  view.append(h("div", { class: "section statline" }, h("div", { class: "stat" }, streak, h("span", { text: "day streak" })),
    stat(t.seen, "questions answered"), stat(pct(t.correct, t.attempts) + "%", "answers correct"), stat(t.solved, "problems solved"),
    stat(modules().filter((m) => ["complete", "solid"].includes(modProgress(m).status)).length + " / " + modules().length, "topics learned")));
  view.append(h("div", { class: "section" }, h("h2", { text: "Activity, last 8 weeks" }), h("div", { class: "panel" }, chart, h("p", { class: "small muted", style: "margin:0.5rem 0 0", text: "Questions answered and code submissions per day." }))));
  view.append(h("div", { class: "section" }, h("h2", { text: "Exams" }), h("div", { class: "panel" },
    h("table", null, h("thead", null, h("tr", null, h("th", { text: "Date" }), h("th", { text: "Exam" }), h("th", { class: "num", text: "Score" }), h("th", { class: "num", text: "Time" }), h("th", { text: "Missed topics" }))), examBody))));
  api("/api/activity?profile=" + P.profile.id).then((a) => {
    streak.textContent = String(streakFrom(a.days));
    const byDay = Object.fromEntries(a.days.map((d) => [d.day, (d.mcq || 0) + (d.code || 0)]));
    const vals = [];
    for (let i = 55; i >= 0; i--) { const d = addDays(-i); vals.push([d, byDay[d] || 0]); }
    const max = Math.max(1, ...vals.map((v) => v[1]));
    vals.forEach(([d, v]) => chart.append(h("i", { class: v ? "" : "zero", style: "height:" + Math.max(3, (100 * v) / max) + "%", title: d + ": " + v })));
    if (!a.exams.length) examBody.append(h("tr", null, h("td", { colspan: "5", class: "muted", text: "No exams yet. Start one from Multiple choice or Coding." })));
    a.exams.forEach((e) => {
      const missed = e.kind === "mcq" ? Object.entries(e.detail.topics || {}).filter(([, v]) => v.right < v.total).map(([k]) => topicName(k))
        : (e.detail.problems || []).filter((p) => !p.ok && P.prob[p.id]).map((p) => P.prob[p.id].title);
      examBody.append(h("tr", null, h("td", { text: String(e.ts).slice(0, 16).replace("T", " ") }), h("td", { text: e.kind === "mcq" ? "Multiple choice" : "Coding" }),
        h("td", { class: "num", text: e.score + " / " + e.total }), h("td", { class: "num", text: fmtTime(e.duration_s || 0) }), h("td", { class: "small muted", text: missed.join(", ") || "None" })));
    });
  }).catch((e) => chart.append(h("p", { class: "muted", text: e.message })));

  const tb = h("tbody");
  P.mcqTopics.forEach((tp) => {
    const s = topicStats(tp.id), m = P.mod[tp.id], pr = m ? modProgress(m) : null;
    tb.append(h("tr", null, h("td", null, m ? h("a", { href: "#/learn/" + tp.id, text: tp.name }) : tp.name), h("td", { class: "num", text: s.seen + " / " + s.total }),
      h("td", { class: "num", text: s.attempts ? pct(s.correct, s.attempts) + "%" : "" }), h("td", null, h("div", { class: "bar" }, h("i", { style: "width:" + pct(s.right, s.total) + "%" }))),
      h("td", null, pr ? statusTag(pr) : null)));
  });
  view.append(h("div", { class: "section" }, h("h2", { text: "By topic" }), h("div", { class: "panel" },
    h("table", null, h("thead", null, h("tr", null, h("th", { text: "Topic" }), h("th", { class: "num", text: "Answered" }), h("th", { class: "num", text: "Accuracy" }), h("th", { text: "Right last time" }), h("th", { text: "Lesson" }))), tb))));
  view.append(h("div", { class: "section" }, h("h2", { text: "Learning to-do list" }), h("div", { class: "panel" }, todoList())));
}

/* ---------- add material: generate questions from a paper, chapter, post or notes ---------- */
function importPage(view) {
  view.append(h("div", { class: "page-head" }, h("h1", { text: "Add material" }),
    h("p", { text: "Give Prepformer a paper, book chapter, blog post or your own notes. Claude drafts multiple-choice and coding questions from it and files them under a matching topic, or a new one. You review everything before it joins your bank." })));
  if (!P.env.ai) view.append(needKeyNote("generate questions from your material"));
  const title = h("input", { type: "text", placeholder: "For example: Attention Is All You Need" });
  const text = h("textarea", { rows: "8", placeholder: "Paste text here" });
  const url = h("input", { type: "url", placeholder: "https://..." });
  const file = h("input", { type: "file", accept: ".pdf,.txt,.md,.markdown,.tex,.rst" });
  const nq = h("select", null, [5, 8, 12, 16, 20].map((n) => h("option", { value: String(n), text: String(n) })));
  nq.value = "8";
  const nc = h("select", null, [0, 1, 2, 3].map((n) => h("option", { value: String(n), text: String(n) })));
  nc.value = "1";
  const topicSel = h("select", null, h("option", { value: "", text: "Let Claude decide" }), P.mcqTopics.map((t) => h("option", { value: t.name, text: t.name })), h("option", { value: "a new topic", text: "A new topic" }));
  const out = h("div", { class: "section" });
  const btn = h("button", { class: "btn primary", type: "button", text: "Draft questions", disabled: !P.env.ai, onclick: generate });
  view.append(h("div", { class: "panel" },
    h("label", { class: "field" }, h("span", { text: "Title" }), title),
    h("div", { class: "grid2" }, h("label", { class: "field" }, h("span", { text: "Link to a post or PDF" }), url), h("label", { class: "field" }, h("span", { text: "Or a file (PDF, text or Markdown)" }), file)),
    h("label", { class: "field" }, h("span", { text: "Or paste the text" }), text),
    h("div", { class: "grid2" }, h("label", { class: "field" }, h("span", { text: "Multiple-choice questions" }), nq), h("label", { class: "field" }, h("span", { text: "Coding problems" }), nc)),
    h("label", { class: "field" }, h("span", { text: "File under" }), topicSel),
    h("div", { class: "row" }, btn, h("span", { class: "small muted", text: "Drafting takes a minute or two. Coding problems are kept only if their reference solution passes their own tests here." }))));
  view.append(out);

  const sourcesBox = h("div", { class: "section" });
  view.append(sourcesBox);
  const drawSources = async () => {
    clear(sourcesBox).append(h("h2", { text: "Material you have added" }));
    try {
      const list = await api("/api/sources");
      if (!list.length) { sourcesBox.append(h("p", { class: "muted", text: "Nothing yet." })); return; }
      const ul = h("ul", { class: "list" });
      list.forEach((s) => ul.append(h("li", null, h("div", { class: "grow" }, h("strong", { text: s.title }), h("div", { class: "small muted", text: s.mcqs + " questions, " + s.problems + " coding problems, added " + String(s.created_at).slice(0, 10) })),
        h("button", { class: "btn sm", type: "button", text: "Remove", onclick: async () => {
          if (!(await confirmBox("Remove this material?", "Its " + s.mcqs + " questions and " + s.problems + " coding problems will be deleted from your bank. This cannot be undone.", "Remove"))) return;
          await api("/api/custom/delete", { source_id: s.id }); await reloadBank(); drawSources(); toast("Removed");
        } }))));
      sourcesBox.append(h("div", { class: "panel" }, ul));
    } catch (e) { sourcesBox.append(h("p", { class: "muted", text: e.message })); }
  };
  drawSources();

  async function generate() {
    const req = { title: title.value.trim() || (file.files[0] ? file.files[0].name : url.value.trim() || "Imported material"), n_mcq: Number(nq.value), n_code: Number(nc.value), topic_hint: topicSel.value };
    const f = file.files[0];
    try {
      if (f && /\.pdf$/i.test(f.name)) {
        const buf = new Uint8Array(await f.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        req.pdf_base64 = btoa(bin); req.kind = "pdf";
      } else if (f) { req.text = await f.text(); req.kind = "file"; }
      else if (text.value.trim()) { req.text = text.value; req.kind = "text"; }
      else if (url.value.trim()) { req.url = url.value.trim(); req.kind = "url"; }
      else { toast("Add a link, a file or some text first"); return; }
    } catch (e) { toast("Could not read the file: " + e.message); return; }
    btn.disabled = true;
    clear(out).append(h("p", { class: "muted" }, h("span", { class: "spinner" }), " Reading the material and drafting questions. Keep this page open."));
    try { review(await api("/api/generate", req), req); }
    catch (e) { clear(out).append(h("div", { class: "note bad" }, h("p", { text: e.message }))); }
    btn.disabled = false;
  }

  function review(draft, req) {
    clear(out).append(h("h2", { text: "Review the draft" }));
    const name = h("input", { type: "text", value: draft.topic.name, disabled: draft.topic.mode === "existing" });
    out.append(h("div", { class: "panel" }, h("label", { class: "field" }, h("span", { text: draft.topic.mode === "existing" ? "Filed under the existing topic" : "New topic name" }), name),
      h("p", { class: "small muted", text: "Untick anything you do not want to keep. Check the facts: generated questions can be wrong." })));
    const keepQ = draft.mcqs.map(() => true), keepP = draft.problems.map((p) => p.verified);
    draft.mcqs.forEach((q, i) => {
      const cb = h("input", { type: "checkbox", checked: true, "aria-label": "Keep question " + (i + 1), onchange: (e) => { keepQ[i] = e.target.checked; } });
      const item = reviewItem(Object.assign({ topic: draft.topic.id }, q), null);
      item.prepend(h("label", { class: "row small" }, cb, "Keep this question"));
      out.append(item);
    });
    draft.problems.forEach((p, i) => {
      const cb = h("input", { type: "checkbox", checked: p.verified, disabled: !p.verified, onchange: (e) => { keepP[i] = e.target.checked; } });
      out.append(h("div", { class: "review-item" }, h("label", { class: "row small" }, cb, "Keep this coding problem"), h("h3", { text: p.title, style: "margin:0.5rem 0" }),
        h("div", { class: "row" }, diffTag(p.difficulty), h("span", { class: "tag " + (p.verified ? "done" : "hard"), text: p.verified ? "Verified" : "Not kept" })),
        h("p", { class: "small muted", style: "margin-top:0.5rem", text: p.verify_note }), h("details", null, h("summary", { class: "small", text: "Show the problem" }), md(p.description), h("pre", null, h("code", { text: p.solution })))));
    });
    if (!draft.mcqs.length && !draft.problems.length) { out.append(h("div", { class: "note warn" }, h("p", { text: "Nothing usable came back. Try a longer excerpt or fewer questions." }))); return; }
    out.append(h("div", { class: "row", style: "margin-top:1rem" }, h("button", { class: "btn primary", type: "button", text: "Add to my bank", onclick: async (e) => {
      const self = e.currentTarget;
      self.disabled = true;
      const topic = Object.assign({}, draft.topic, { name: name.value.trim() || draft.topic.name });
      try {
        const res = await api("/api/custom/save", { title: req.title, kind: req.kind, topic, mcqs: draft.mcqs.filter((_, i) => keepQ[i]), problems: draft.problems.filter((_, i) => keepP[i]) });
        await reloadBank();
        clear(out).append(h("div", { class: "note good" }, h("p", { text: "Added " + res.mcqs + " questions and " + res.problems + " coding problems under " + topic.name + "." }),
          h("p", null, h("a", { href: "#/topics", text: "See them under Topics" }))));
        drawSources();
      } catch (err) { toast(err.message); self.disabled = false; }
    } }), h("button", { class: "btn", type: "button", text: "Discard", onclick: () => clear(out) })));
  }
}

route("/", "home", overview);
route("/topics", "topics", topicsPage);
route("/profile", "", profilePage);
route("/import", "import", importPage);
