/* Coding: problem list, LeetCode-style workspace, practice mode and exam mode (3 problems, 60 minutes). */
"use strict";

const CODE_EXAM_SECONDS = 60 * 60, CODE_EXAM_N = 3;

function codeEntry(id) { const all = S("code", {}); return all[id] || (all[id] = {}); }
function codeStatus(id) { const e = S("code", {})[id]; return e && e.status ? e.status : "todo"; }

/* ---------- editor (CodeMirror when it loaded, a plain textarea otherwise) ---------- */
function createEditor(host, value, hooks) {
  if (P.editorReady && window.CodeMirror) {
    const run = () => hooks.onRun(), submit = () => hooks.onSubmit();
    const cm = window.CodeMirror(host, {
      value, mode: "python", lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false, matchBrackets: true, autoCloseBrackets: true,
      extraKeys: {
        Tab: (c) => (c.somethingSelected() ? c.indentSelection("add") : c.replaceSelection("    ", "end")),
        "Shift-Tab": (c) => c.indentSelection("subtract"),
        "Cmd-Enter": run, "Ctrl-Enter": run, "Shift-Cmd-Enter": submit, "Shift-Ctrl-Enter": submit,
        "Cmd-/": "toggleComment", "Ctrl-/": "toggleComment",
      },
    });
    cm.on("change", () => hooks.onChange(cm.getValue()));
    setTimeout(() => cm.refresh(), 0);
    return { get: () => cm.getValue(), set: (v) => cm.setValue(v), refresh: () => cm.refresh() };
  }
  const ta = h("textarea", { class: "plain", spellcheck: "false", autocapitalize: "off", autocomplete: "off", "aria-label": "Code editor" });
  ta.value = value;
  ta.addEventListener("input", () => hooks.onChange(ta.value));
  ta.addEventListener("keydown", (e) => {
    const insert = (text) => { const s = ta.selectionStart; ta.setRangeText(text, s, ta.selectionEnd, "end"); hooks.onChange(ta.value); };
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (e.shiftKey) hooks.onSubmit(); else hooks.onRun(); }
    else if (e.key === "Tab") { e.preventDefault(); insert("    "); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const before = ta.value.slice(0, ta.selectionStart), line = before.slice(before.lastIndexOf("\n") + 1);
      const indent = (line.match(/^\s*/) || [""])[0] + (line.trimEnd().endsWith(":") ? "    " : "");
      insert("\n" + indent);
    }
  });
  host.append(ta);
  return { get: () => ta.value, set: (v) => { ta.value = v; }, refresh: () => {} };
}

/* ---------- results ---------- */
function renderRun(result, problem) {
  const box = h("div");
  if (result.status !== "ok") {
    const titles = { env_error: "PyTorch is not available", timeout: "Time limit exceeded", error: "Your code raised an error before the tests ran" };
    box.append(h("div", { class: "verdict no", text: titles[result.status] || "Run failed" }), h("pre", { text: result.error || "" }));
    if (!(result.tests || []).length) return box;
  }
  const tests = result.tests || [], passed = tests.filter((t) => t.passed).length;
  if (result.status === "ok") {
    const all = passed === tests.length && tests.length > 0;
    const text = result.mode === "run"
      ? "Sample cases: " + passed + " of " + tests.length + " passed" + (all ? ". Submit to run all " + result.total + " cases." : "")
      : (all && tests.length === result.total ? "Accepted: " : "") + passed + " of " + result.total + " test cases passed";
    box.append(h("div", { class: "verdict " + (all ? "ok" : "no"), text }));
  }
  tests.forEach((t, i) => {
    const d = h("details", { class: "case" }, h("summary", null,
      h("span", { class: t.passed ? "mark-ok" : "mark-no", text: t.passed ? "Passed" : "Failed" }),
      h("span", { text: "Case " + (i + 1) + ": " + t.title }), h("span", { class: "right small muted", text: t.ms + " ms" })));
    const body = h("div", { class: "body" });
    if (t.error) body.append(h("pre", { text: t.error }));
    if (t.stdout) body.append(h("div", { class: "small muted", text: "Printed output" }), h("pre", { text: t.stdout }));
    if (t.source) body.append(h("div", { class: "small muted", text: "Test code" }), h("pre", { text: t.source }));
    d.append(body);
    if (!t.passed && !box.querySelector("details[open]")) d.open = true;
    box.append(d);
  });
  box.append(h("p", { class: "small muted", text: "Ran in " + result.seconds + " s" + (result.torch ? " with PyTorch " + result.torch : "") }));
  return box;
}

/* ---------- workspace ---------- */
function workspace(view, problem, opts) {
  opts = opts || {};
  view.className = "wide";
  const entry = opts.exam ? null : codeEntry(problem.id);
  const getCode = () => (opts.exam ? opts.codes[problem.id] : entry.code) || problem.starter;
  const setCode = (v) => { if (opts.exam) { opts.codes[problem.id] = v; opts.persist(); } else { entry.code = v; save("code"); } };
  let lastResult = null, busy = false;

  const ws = h("div", { class: "ws" + ($("#banner").hidden ? "" : " has-banner") });
  /* left pane */
  const leftBody = h("div", { class: "pane-body" });
  const tabNames = [["desc", "Description"], ["strategy", "Strategy"], ["solution", "Solution"], ["tutor", "Tutor"]];
  const tabs = h("div", { class: "tabs", role: "tablist" });
  let tab = "desc";
  tabNames.forEach(([id, label]) => tabs.append(h("button", { type: "button", role: "tab", text: label, "data-tab": id,
    disabled: opts.exam && id !== "desc", title: opts.exam && id !== "desc" ? "Locked during the exam" : null, onclick: () => { tab = id; drawLeft(); } })));
  const left = h("div", { class: "pane" }, h("div", { class: "pane-head" }, opts.lead || h("a", { class: "btn sm quiet", href: "#/code", text: "All problems" }), tabs), leftBody);

  function drawLeft() {
    tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    clear(leftBody);
    if (tab === "desc") {
      leftBody.append(h("h1", { class: "prob-title", text: problem.number + ". " + problem.title }),
        h("div", { class: "row", style: "margin-bottom:1rem" }, diffTag(problem.difficulty), h("span", { class: "tag", text: codeTopicName(problem.topic) }),
          h("span", { class: "tag", text: problem.test_count + " test cases" }),
          !opts.exam && codeStatus(problem.id) === "solved" ? h("span", { class: "tag done", text: "Solved" }) : null),
        md(problem.description),
        h("p", { class: "small muted", style: "margin-top:1.5rem", text: "Run checks the first two cases. Submit runs every case, including edge cases. Shortcuts: Ctrl or Cmd + Enter to run, add Shift to submit." }));
    } else if (tab === "strategy") {
      const hints = problem.hints || [];
      const shown = Math.max(1, Math.min(hints.length, entry.steps || 1));
      leftBody.append(h("h2", { text: "Strategy" }), h("p", { class: "muted", text: "The approach, one step at a time. Try each step before revealing the next." }));
      const ol = h("ol", { class: "steps" });
      hints.slice(0, shown).forEach((s) => ol.append(h("li", null, inline(s))));
      leftBody.append(ol);
      if (shown < hints.length) leftBody.append(h("button", { class: "btn", type: "button", style: "margin-top:1rem", text: "Show the next step", onclick: () => { entry.steps = shown + 1; save("code"); drawLeft(); } }));
      else leftBody.append(h("p", { class: "small muted", style: "margin-top:1rem" }, "That is the whole strategy. Still stuck? ",
        h("a", { href: "#", text: "Look at the reference solution", onclick: (e) => { e.preventDefault(); tab = "solution"; drawLeft(); } }), "."));
      if (!entry.steps) { entry.steps = 1; save("code"); }
    } else if (tab === "solution") {
      leftBody.append(h("h2", { text: "Reference solution" }));
      if (!entry.peeked) {
        leftBody.append(h("p", { class: "muted", text: entry.steps ? "You have read the strategy. Reveal the code when you are ready to compare." : "Read the strategy first if you have not: working from the approach teaches more than reading the code." }),
          h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", text: "Reveal the solution", onclick: () => { entry.peeked = true; save("code"); drawLeft(); } }),
            !entry.steps ? h("button", { class: "btn", type: "button", text: "Open the strategy", onclick: () => { tab = "strategy"; drawLeft(); } }) : null));
      } else {
        leftBody.append(h("pre", null, h("code", { text: problem.solution })),
          h("button", { class: "btn sm", type: "button", text: "Copy into the editor", onclick: async () => {
            if (await confirmBox("Replace your code?", "The editor's contents will be replaced by the reference solution.", "Replace")) { editor.set(problem.solution); setCode(problem.solution); }
          } }));
      }
    } else {
      leftBody.append(h("h2", { text: "Tutor" }));
      if (!P.env.ai) { leftBody.append(needKeyNote("get hints on your code and a review of your solution")); return; }
      const log = h("div", { class: "chat" });
      const ask = async (kind, label) => {
        const ctx = { problem: problem.title, description: problem.description, code: editor.get() };
        if (lastResult) ctx.last_run = { status: lastResult.status, error: lastResult.error, failed: (lastResult.tests || []).filter((t) => !t.passed).map((t) => ({ test: t.title, error: t.error })) };
        log.append(h("div", { class: "msg user", text: label }));
        const wait = h("div", { class: "msg assistant" }, h("span", { class: "spinner" }));
        log.append(wait);
        try { wait.textContent = await askTutor(kind, ctx); } catch (e) { wait.textContent = e.message; }
      };
      leftBody.append(h("p", { class: "muted", text: "The tutor reads your current code and latest test results." }), log,
        h("div", { class: "row" }, h("button", { class: "btn", type: "button", text: "Give me a hint", onclick: () => ask("code_hint", "Give me a hint") }),
          h("button", { class: "btn", type: "button", text: "Review my solution", onclick: () => ask("code_review", "Review my solution") })));
    }
  }

  /* right pane */
  const consoleBody = h("div", { class: "pane-body" }, h("p", { class: "muted", text: "Run your code to see the sample cases here." }));
  const runBtn = h("button", { class: "btn sm", type: "button", text: "Run", onclick: () => execute("run") });
  const submitBtn = h("button", { class: "btn sm primary", type: "button", text: "Submit", onclick: () => execute("submit") });
  const editorHost = h("div", { class: "editor-wrap" });
  const right = h("div", { class: "pane" },
    h("div", { class: "pane-head" }, h("span", { class: "small muted", text: "Python 3 with PyTorch" }),
      h("div", { class: "row right" }, opts.extra || null,
        h("button", { class: "btn sm quiet", type: "button", text: "Reset code", onclick: async () => {
          if (await confirmBox("Reset your code?", "Your code for this problem will be replaced by the starter code.", "Reset")) { editor.set(problem.starter); setCode(problem.starter); }
        } }), runBtn, submitBtn)),
    editorHost,
    h("div", { class: "console" }, h("div", { class: "pane-head" }, h("strong", { class: "small", text: "Test results" })), consoleBody));
  const editor = createEditor(editorHost, getCode(), { onChange: setCode, onRun: () => execute("run"), onSubmit: () => execute("submit") });

  async function execute(mode) {
    if (busy) return;
    busy = true; runBtn.disabled = submitBtn.disabled = true;
    clear(consoleBody).append(h("p", { class: "muted" }, h("span", { class: "spinner" }), mode === "run" ? " Running the sample cases" : " Running every test case"));
    try {
      const result = await api("/api/run", { problem_id: problem.id, code: editor.get(), mode });
      lastResult = result;
      clear(consoleBody).append(renderRun(result, problem));
      const tests = result.tests || [];
      const accepted = mode === "submit" && result.status === "ok" && tests.length === result.total && tests.every((t) => t.passed);
      if (mode === "submit") {
        if (opts.exam) opts.onSubmit(problem, { ok: accepted, passed: tests.filter((t) => t.passed).length, total: result.total });
        else {
          if (accepted) { entry.status = "solved"; entry.solvedOn = entry.solvedOn || today(); }
          else if (entry.status !== "solved") entry.status = "attempted";
          save("code");
          logAttempt("code", problem.id, problem.topic, accepted, "practice");
          if (tab === "desc") drawLeft();
        }
      }
    } catch (e) {
      clear(consoleBody).append(h("div", { class: "note bad" }, h("p", { text: e.message })));
    }
    busy = false; runBtn.disabled = submitBtn.disabled = false;
  }

  /* draggable divider */
  const drag = h("div", { class: "drag", role: "separator", "aria-orientation": "vertical", "aria-label": "Resize panes" });
  drag.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const move = (ev) => { const r = ws.getBoundingClientRect(); ws.style.setProperty("--left", Math.min(75, Math.max(22, (100 * (ev.clientX - r.left)) / r.width)) + "%"); editor.refresh(); };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
  ws.append(left, drag, right);
  view.append(ws);
  drawLeft();
}

/* ---------- problem list ---------- */
function codeList(view) {
  const ui = S("ui", {});
  const cfg = ui.code || (ui.code = { mode: "practice", topics: [], diff: "Any", status: "all", search: "" });
  const problems = P.bank.problems.problems;
  const solved = problems.filter((p) => codeStatus(p.id) === "solved").length;
  view.append(h("div", { class: "page-head" }, h("h1", { text: "Coding" }),
    h("p", { text: problems.length + " problems in Python with PyTorch, each checked against hidden test cases. You have solved " + solved + "." })));
  if (local.get("codeExam")) view.append(h("div", { class: "note warn" }, h("p", null, "A coding exam is in progress. ", h("a", { href: "#/code/exam", text: "Return to it" }), ".")));
  const seg = (key, values, labels) => {
    const s = h("div", { class: "seg" });
    values.forEach((v, i) => s.append(h("button", { type: "button", text: labels ? labels[i] : v, "aria-pressed": String(cfg[key] === v), onclick: () => { cfg[key] = v; save("ui"); render(); } })));
    return s;
  };
  const chips = h("div", { class: "chips" });
  chips.append(h("button", { class: "chip", type: "button", "aria-pressed": String(!cfg.topics.length), text: "All topics", onclick: () => { cfg.topics = []; save("ui"); render(); } }));
  P.probTopics.forEach((t) => chips.append(h("button", { class: "chip", type: "button", "aria-pressed": String(cfg.topics.includes(t.id)),
    onclick: () => { cfg.topics = cfg.topics.includes(t.id) ? cfg.topics.filter((x) => x !== t.id) : cfg.topics.concat(t.id); save("ui"); render(); } },
    t.name, h("span", { class: "n", text: String(t.count) }))));
  const panel = h("div", { class: "panel stack" }, h("div", { class: "row" }, h("strong", { text: "Mode" }), seg("mode", ["practice", "exam"], ["Practice", "Exam"])),
    h("div", null, h("p", { class: "small muted", text: "Topics" }), chips));
  view.append(panel);
  const inTopics = problems.filter((p) => !cfg.topics.length || cfg.topics.includes(p.topic));

  if (cfg.mode === "exam") {
    panel.append(h("p", { text: CODE_EXAM_N + " problems in " + CODE_EXAM_SECONDS / 60 + " minutes: one easier, one medium and one harder, drawn from the topics above. The strategy, solution and tutor are locked until you finish." }),
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", disabled: inTopics.length < CODE_EXAM_N, text: "Start coding exam", onclick: () => startCodeExam(inTopics) }),
        h("span", { class: "small muted", text: "Drawn from " + inTopics.length + " problems" })));
    return;
  }
  const search = h("input", { type: "search", placeholder: "Search problems", value: cfg.search, "aria-label": "Search problems", style: "max-width:260px" });
  panel.append(h("div", { class: "row" }, h("span", { class: "small muted", text: "Difficulty" }), seg("diff", ["Any", "Easy", "Medium", "Hard"]),
    h("span", { class: "small muted", text: "Status" }), seg("status", ["all", "todo", "solved"], ["All", "Unsolved", "Solved"]), search));
  const tbody = h("tbody");
  const table = h("table", null, h("thead", null, h("tr", null, h("th", { text: "" }), h("th", { text: "Problem" }), h("th", { text: "Topic" }), h("th", { text: "Difficulty" }), h("th", { class: "num", text: "Cases" }))), tbody);
  const fill = () => {
    clear(tbody);
    const term = cfg.search.trim().toLowerCase();
    const rows = inTopics.filter((p) => (cfg.diff === "Any" || p.difficulty === cfg.diff) &&
      (cfg.status === "all" || (cfg.status === "solved") === (codeStatus(p.id) === "solved")) && (!term || p.title.toLowerCase().includes(term)));
    rows.forEach((p) => {
      const st = codeStatus(p.id);
      tbody.append(h("tr", { class: "click", tabindex: "0", onclick: () => go("#/code/p/" + p.id), onkeydown: (e) => { if (e.key === "Enter") go("#/code/p/" + p.id); } },
        h("td", null, h("span", { class: "dot " + st, title: st === "solved" ? "Solved" : st === "attempted" ? "Attempted" : "Not started" })),
        h("td", null, h("a", { href: "#/code/p/" + p.id, text: p.number + ". " + p.title, style: "color:inherit;text-decoration:none;font-weight:500" })),
        h("td", { class: "muted", text: codeTopicName(p.topic) }), h("td", null, diffTag(p.difficulty)), h("td", { class: "num muted", text: String(p.test_count) })));
    });
    if (!rows.length) tbody.append(h("tr", null, h("td", { colspan: "5", class: "muted", text: "No problems match these filters." })));
  };
  search.addEventListener("input", () => { cfg.search = search.value; save("ui"); fill(); });
  fill();
  view.append(h("div", { class: "panel", style: "margin-top:1rem;padding:0.4rem 0.6rem" }, table));
}

function codeProblem(view, id) {
  const p = P.prob[id];
  if (!p) { view.append(h("div", { class: "page-head" }, h("h1", { text: "Problem not found" }), h("p", null, h("a", { href: "#/code", text: "All problems" })))); return; }
  const list = P.bank.problems.problems, i = list.indexOf(p);
  const nav = h("span", { class: "row" },
    h("a", { class: "btn sm quiet", href: i > 0 ? "#/code/p/" + list[i - 1].id : null, text: "Previous", "aria-disabled": i > 0 ? null : "true" }),
    h("a", { class: "btn sm quiet", href: i < list.length - 1 ? "#/code/p/" + list[i + 1].id : null, text: "Next", "aria-disabled": i < list.length - 1 ? null : "true" }));
  workspace(view, p, { extra: nav });
}

/* ---------- exam ---------- */
function startCodeExam(pool) {
  const fresh = pool.filter((p) => codeStatus(p.id) !== "solved");
  const from = fresh.length >= CODE_EXAM_N ? fresh : pool;
  const pick = (diffs, taken) => sample(from.filter((p) => diffs.includes(p.difficulty) && !taken.includes(p)), 1)[0];
  const chosen = [];
  [["Easy"], ["Medium"], ["Hard", "Medium"]].forEach((d) => { const p = pick(d, chosen) || sample(from.filter((x) => !chosen.includes(x)), 1)[0]; if (p) chosen.push(p); });
  local.set("codeExam", { ids: chosen.map((p) => p.id), start: Date.now(), i: 0, codes: {}, results: {} });
  go("#/code/exam");
}

function codeExamView(view) {
  const ex = local.get("codeExam");
  if (!ex) { go("#/code"); return; }
  const remaining = () => CODE_EXAM_SECONDS - (Date.now() - ex.start) / 1000;
  if (remaining() <= 0) return finishCodeExam(ex);
  const persist = () => local.set("codeExam", ex);
  const problem = P.prob[ex.ids[ex.i]];
  const timer = h("span", { class: "timer" });
  const tabs = h("span", { class: "tabs" });
  ex.ids.forEach((id, n) => { const r = ex.results[id]; tabs.append(h("button", { type: "button", "aria-selected": String(n === ex.i),
    text: "Problem " + (n + 1) + (r ? (r.ok ? " (passed)" : " (" + r.passed + "/" + r.total + ")") : ""), onclick: () => { ex.i = n; persist(); render(); } })); });
  const finish = h("button", { class: "btn sm", type: "button", text: "Finish exam", onclick: async () => {
    const open = ex.ids.filter((id) => !(ex.results[id] && ex.results[id].ok)).length;
    if (await confirmBox("Finish the coding exam?", open ? open + " problem" + (open > 1 ? "s have" : " has") + " not passed all tests. Only submitted code counts." : "All three problems passed.", "Finish and grade")) finishCodeExam(ex);
  } });
  workspace(view, problem, { exam: true, codes: ex.codes, persist, lead: tabs, extra: h("span", { class: "row" }, timer, finish),
    onSubmit: (p, r) => { const prev = ex.results[p.id]; if (!prev || !prev.ok) ex.results[p.id] = r; persist();
      const b = tabs.children[ex.ids.indexOf(p.id)]; b.textContent = "Problem " + (ex.ids.indexOf(p.id) + 1) + (ex.results[p.id].ok ? " (passed)" : " (" + ex.results[p.id].passed + "/" + ex.results[p.id].total + ")"); } });
  const tick = () => { const r = remaining(); timer.textContent = fmtTime(r); timer.classList.toggle("low", r < 300); if (r <= 0) finishCodeExam(ex); };
  const iv = setInterval(tick, 1000);
  tick();
  P.cleanup = () => clearInterval(iv);
}

function finishCodeExam(ex) {
  if (P.cleanup) { P.cleanup(); P.cleanup = null; }
  const duration = Math.min(CODE_EXAM_SECONDS, Math.round((Date.now() - ex.start) / 1000));
  const rows = ex.ids.map((id) => { const r = ex.results[id] || { ok: false, passed: 0, total: P.prob[id].test_count }; return { id, ok: !!r.ok, passed: r.passed, total: r.total }; });
  rows.forEach((r) => {
    const p = P.prob[r.id], e = codeEntry(r.id);
    if (r.ok) { e.status = "solved"; e.solvedOn = e.solvedOn || today(); e.code = ex.codes[r.id] || e.code; }
    else { if (e.status !== "solved") e.status = "attempted"; addTodo(P.CODE_TO_LESSON[p.topic] || p.topic, [], "exam"); }
    logAttempt("code", r.id, p.topic, r.ok, "exam");
  });
  save("code");
  const score = rows.filter((r) => r.ok).length;
  local.set("codeExamResult", { rows, score, duration });
  local.del("codeExam");
  api("/api/exam", { profile: P.profile.id, kind: "code", score, total: rows.length, duration_s: duration, detail: { problems: rows } }).catch(() => {});
  go("#/code/result");
}

function codeResultView(view) {
  const r = local.get("codeExamResult");
  if (!r) { go("#/code"); return; }
  view.append(h("div", { class: "page-head" }, h("h1", { text: r.score + " of " + r.rows.length + " problems solved" }),
    h("p", { text: "Time used: " + fmtTime(r.duration) + ". Open any problem to see its strategy and reference solution." })));
  const ul = h("ul", { class: "list" });
  r.rows.forEach((row) => { const p = P.prob[row.id]; if (!p) return; ul.append(h("li", null,
    h("span", { class: "tag " + (row.ok ? "done" : "hard"), text: row.ok ? "Passed" : row.passed + " of " + row.total + " cases" }),
    h("div", { class: "grow" }, h("strong", { text: p.title }), h("div", { class: "small muted", text: codeTopicName(p.topic) + ", " + p.difficulty })),
    h("a", { class: "btn sm", href: "#/code/p/" + p.id, text: row.ok ? "Review" : "Study and retry" }))); });
  view.append(h("div", { class: "panel" }, ul));
  if (r.rows.some((x) => !x.ok)) view.append(h("div", { class: "section" }, h("h2", { text: "Learning to-do list" }), todoList()));
  view.append(h("div", { class: "section row" }, h("a", { class: "btn", href: "#/code", text: "Back to coding" })));
}

route("/code", "code", codeList);
route("/code/p/([^/]+)", "code", codeProblem);
route("/code/exam", "code", codeExamView);
route("/code/result", "code", codeResultView);
