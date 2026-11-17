"""Check every coding problem against real PyTorch.

    uv run verify.py                       # uses the project's uv environment
    uv run verify.py --python /path/to/python

For each problem the reference solution must pass every test case and the
unfinished starter code must not. Results are printed and written to
verify_report.json.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import server

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--python")
    parser.add_argument("--only", help="comma-separated problem ids")
    args = parser.parse_args()
    server.init_db()
    env = server.detect_env(args.python, force=True)
    if not env["python"]:
        sys.exit("No Python with PyTorch found. Set up the environment with: uv sync\nTried:\n  " + "\n  ".join(env["tried"]))
    print("Using %s (PyTorch %s)" % (env["python"], env["torch"]))
    if not (ROOT / "data" / "problems.json").exists():
        subprocess.run([sys.executable, str(ROOT / "build.py")], check=True, stdout=subprocess.DEVNULL)
    problems = json.loads((ROOT / "data" / "problems.json").read_text(encoding="utf-8"))["problems"]
    if args.only:
        wanted = set(args.only.split(","))
        problems = [p for p in problems if p["id"] in wanted]
    report, bad = [], 0
    for n, p in enumerate(problems, 1):
        sol = server.run_code(p["tests"], p["solution"], "submit", p["test_count"])
        entry = {"id": p["id"], "title": p["title"], "ok": bool(server.all_passed(sol)), "seconds": sol.get("seconds"), "failures": []}
        if not entry["ok"]:
            if sol.get("error"):
                entry["failures"].append({"test": "(setup)", "error": sol["error"]})
            entry["failures"] += [{"test": t["name"], "error": t["error"]} for t in sol.get("tests", []) if not t["passed"]]
        starter = server.run_code(p["tests"], p["starter"], "submit", p["test_count"])
        entry["starter_passes"] = bool(server.all_passed(starter))
        if not entry["ok"] or entry["starter_passes"]:
            bad += 1
        report.append(entry)
        status = "ok  " if entry["ok"] and not entry["starter_passes"] else "FAIL"
        print("[%3d/%d] %s %-34s %.1fs" % (n, len(problems), status, p["id"], sol.get("seconds") or 0))
        for f in entry["failures"]:
            print("          %s: %s" % (f["test"], (f["error"] or "").splitlines()[0][:150] if f["error"] else ""))
        if entry["starter_passes"]:
            print("          the starter code passes every test")
    (ROOT / "verify_report.json").write_text(json.dumps({"python": env["python"], "torch": env["torch"], "problems": report}, indent=1), encoding="utf-8")
    print("\n%d of %d problems verified. Details in verify_report.json" % (len(problems) - bad, len(problems)))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
