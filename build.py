"""Compile the plain-text question banks in content/ into data/*.json.

    python build.py

Run it again after editing or adding questions. The formats are described in
README.md ("Adding your own questions").
"""
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
DATA = ROOT / "data"
DIFF = {"E": "Easy", "M": "Medium", "H": "Hard"}


def fail(msg):
    print("build error: " + msg, file=sys.stderr)
    sys.exit(1)


def parse_header(lines):
    meta = {}
    for line in lines:
        m = re.match(r"#\s*(\w+)\s*:\s*(.*)$", line)
        if m:
            meta[m.group(1)] = m.group(2).strip()
    return meta


# --------------------------------------------------------------------- MCQ
def parse_mcq_file(path):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    meta = parse_header([l for l in lines if l.startswith("#")])
    for key in ("topic", "id"):
        if key not in meta:
            fail("%s: missing '# %s:' header" % (path.name, key))
    body = "\n".join(l for l in lines if not l.startswith("#"))
    blocks = [b.strip("\n") for b in re.split(r"\n\s*\n(?=Q:)", body) if b.strip()]
    questions = []
    for n, block in enumerate(blocks, 1):
        where = "%s question %d" % (path.name, n)
        blines = block.split("\n")
        if not blines[0].startswith("Q:"):
            fail("%s: block does not start with 'Q:'\n%s" % (where, block[:120]))
        stem, options, answer, expl = [], [], None, []
        section = "stem"
        for line in blines:
            if section == "stem" and not (line.startswith("- ") or line.startswith("* ")):
                stem.append(line[2:].strip() if line.startswith("Q:") else line.rstrip())
            elif line.startswith("- ") or line.startswith("* "):
                if section == "expl":
                    fail("%s: option after explanation" % where)
                section = "options"
                if line.startswith("* "):
                    if answer is not None:
                        fail("%s: more than one correct option" % where)
                    answer = len(options)
                options.append(line[2:].strip())
            elif line.startswith("> "):
                section = "expl"
                expl.append(line[2:].strip())
            elif section == "expl" and line.strip():
                expl.append(line.strip())
            elif line.strip():
                fail("%s: unexpected line: %s" % (where, line))
        stem_text = "\n".join(stem).strip()
        m = re.search(r"\s*\[([EMH])\]\s*$", stem_text.split("\n")[0])
        if not m:
            fail("%s: first line must end with a difficulty tag [E], [M] or [H]" % where)
        first = stem_text.split("\n")[0][: m.start()].rstrip()
        stem_text = "\n".join([first] + stem_text.split("\n")[1:]).strip()
        if len(options) != 4:
            fail("%s: expected 4 options, found %d" % (where, len(options)))
        if answer is None:
            fail("%s: no correct option marked with '*'" % where)
        if not expl:
            fail("%s: missing explanation line starting with '>'" % where)
        if len(set(options)) != 4:
            fail("%s: duplicate options" % where)
        qid = "%s-%02d" % (meta["id"], n)
        # Shuffle once, deterministically, so answer positions are balanced.
        order = list(range(4))
        random.Random(qid).shuffle(order)
        questions.append({
            "id": qid,
            "topic": meta["id"],
            "difficulty": DIFF[m.group(1)],
            "q": stem_text,
            "options": [options[i] for i in order],
            "answer": order.index(answer),
            "explanation": " ".join(expl),
        })
    topic = {
        "id": meta["id"],
        "name": meta["topic"],
        "subtopics": [s.strip() for s in meta.get("subtopics", "").split(";") if s.strip()],
        "count": len(questions),
    }
    return topic, questions


# ---------------------------------------------------------------- problems
SECTIONS = ("description", "starter", "solution", "tests", "hints")


def parse_problem_file(path):
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    head = []
    for line in lines:
        if line.startswith("==="):
            break
        head.append(line)
    meta = parse_header(head)
    for key in ("topic", "id"):
        if key not in meta:
            fail("%s: missing '# %s:' header" % (path.name, key))
    problems = []
    current, section = None, None
    for line in lines[len(head):]:
        if line.startswith("=== "):
            parts = [p.strip() for p in line[4:].split("|")]
            if len(parts) != 3 or parts[2] not in ("Easy", "Medium", "Hard"):
                fail("%s: bad problem header: %s" % (path.name, line))
            current = {"id": parts[0], "title": parts[1], "difficulty": parts[2], "topic": meta["id"]}
            for s in SECTIONS:
                current[s] = []
            problems.append(current)
            section = None
        elif line.startswith("--- ") and line[4:].strip() in SECTIONS and current is not None:
            section = line[4:].strip()
        elif current is not None and section is not None:
            current[section].append(line)
    for p in problems:
        where = "%s problem '%s'" % (path.name, p["id"])
        for s in SECTIONS:
            p[s] = "\n".join(p[s]).strip("\n")
        for s in ("description", "starter", "solution", "tests"):
            if not p[s].strip():
                fail("%s: empty section '%s'" % (where, s))
        for s in ("starter", "solution", "tests"):
            try:
                compile(p[s], "%s:%s" % (p["id"], s), "exec")
            except SyntaxError as exc:
                fail("%s: syntax error in %s, line %s: %s" % (where, s, exc.lineno, exc.msg))
            p[s] += "\n"
        p["hints"] = [h.strip()[2:].strip() if h.strip().startswith("- ") else h.strip()
                      for h in p["hints"].split("\n") if h.strip()]
        p["test_count"] = len(re.findall(r"^def test_", p["tests"], flags=re.M))
        if p["test_count"] < 3:
            fail("%s: needs at least 3 tests" % where)
    topic = {
        "id": meta["id"],
        "name": meta["topic"],
        "subtopics": [s.strip() for s in meta.get("subtopics", "").split(";") if s.strip()],
        "count": len(problems),
    }
    return topic, problems


# ----------------------------------------------------------------- lessons
def parse_lessons(path):
    modules, module, concept = [], None, None
    for raw in path.read_text(encoding="utf-8").split("\n"):
        line = raw.rstrip()
        if not line or line.startswith("#"):
            continue
        tag, rest = line[:2], line[2:].strip()
        if tag == "@ ":
            parts = rest.split("|")
            requires = parts[1].split(":", 1)[1] if len(parts) > 1 and ":" in parts[1] else ""
            module = {"id": parts[0].strip(), "requires": [r.strip() for r in requires.split(",") if r.strip()],
                      "summary": "", "concepts": []}
            modules.append(module)
            concept = None
        elif module is None:
            fail("%s: content before the first '@' line" % path.name)
        elif tag == "! ":
            module["summary"] = rest
        elif tag == "= ":
            concept = {"title": rest, "q": "", "options": [], "answer": None, "explanation": ""}
            module["concepts"].append(concept)
        elif concept is None:
            fail("%s: '%s' appears before a concept title" % (path.name, line[:40]))
        elif tag == "? ":
            concept["q"] = rest
        elif tag in ("- ", "* "):
            if tag == "* ":
                concept["answer"] = len(concept["options"])
            concept["options"].append(rest)
        elif tag == "> ":
            concept["explanation"] = rest
        else:
            concept["explanation"] += " " + line.strip()
    ids = {m["id"] for m in modules}
    for m in modules:
        for r in m["requires"]:
            if r not in ids:
                fail("lessons: module '%s' requires unknown module '%s'" % (m["id"], r))
        for i, c in enumerate(m["concepts"]):
            if not c["q"] or len(c["options"]) < 2 or c["answer"] is None or not c["explanation"]:
                fail("lessons: module '%s' concept %d is incomplete" % (m["id"], i + 1))
            c["id"] = "%s-c%d" % (m["id"], i + 1)
    return modules


def main():
    DATA.mkdir(exist_ok=True)
    mcq_topics, mcqs = [], []
    for path in sorted((CONTENT / "mcq").glob("*.txt")):
        topic, qs = parse_mcq_file(path)
        mcq_topics.append(topic)
        mcqs.extend(qs)
    prob_topics, probs = [], []
    for path in sorted((CONTENT / "problems").glob("*.txt")):
        topic, ps = parse_problem_file(path)
        prob_topics.append(topic)
        probs.extend(ps)
    for kind, items in (("question", mcqs), ("problem", probs)):
        ids = [x["id"] for x in items]
        dup = sorted({i for i in ids if ids.count(i) > 1})
        if dup:
            fail("duplicate %s ids: %s" % (kind, ", ".join(dup)))
    for n, p in enumerate(probs, 1):
        p["number"] = n
    (DATA / "mcq.json").write_text(json.dumps({"topics": mcq_topics, "questions": mcqs}, ensure_ascii=False), encoding="utf-8")
    (DATA / "problems.json").write_text(json.dumps({"topics": prob_topics, "problems": probs}, ensure_ascii=False), encoding="utf-8")
    lessons_path = CONTENT / "learn" / "lessons.txt"
    modules = parse_lessons(lessons_path) if lessons_path.exists() else []
    known = {t["id"] for t in mcq_topics}
    for m in modules:
        if m["id"] not in known:
            fail("lessons: module '%s' has no matching multiple-choice topic" % m["id"])
    (DATA / "lessons.json").write_text(json.dumps({"modules": modules}, ensure_ascii=False), encoding="utf-8")
    print("Lessons: %d modules, %d concepts" % (len(modules), sum(len(m["concepts"]) for m in modules)))
    print("Multiple choice: %d questions in %d topics" % (len(mcqs), len(mcq_topics)))
    for t in mcq_topics:
        print("  %-48s %3d" % (t["name"], t["count"]))
    print("Coding: %d problems in %d topics" % (len(probs), len(prob_topics)))
    for t in prob_topics:
        print("  %-48s %3d" % (t["name"], t["count"]))
    dist = [sum(1 for q in mcqs if q["answer"] == i) for i in range(4)]
    print("Answer positions A-D:", dist)


if __name__ == "__main__":
    main()
