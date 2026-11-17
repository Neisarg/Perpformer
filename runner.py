"""Test runner for coding problems.

Executed by server.py in a fresh subprocess for every Run / Submit:

    python runner.py <payload.json> <result.json>

payload: {"code": str, "tests": str, "mode": "run" | "submit", "sample_count": int}
result:  {"status": "ok" | "error" | "env_error",
          "error": str | None,
          "stdout": str,                # prints made while the solution file was loading
          "tests": [{"name", "title", "passed", "error", "stdout", "ms", "source"}],
          "total": int,                 # number of tests defined for the problem
          "torch": str | None}

Tests are plain functions named test_*; they run in definition order and can
use every name the solution defines plus the helpers below.
"""
import ast
import contextlib
import io
import json
import math
import random
import sys
import time
import traceback

MAX_OUT = 20000


def _clip(s):
    if len(s) > MAX_OUT:
        return s[:MAX_OUT] + "\n... output truncated ..."
    return s


def _format_exc(exc):
    """Traceback limited to frames inside the user's solution and the tests."""
    tb = traceback.extract_tb(exc.__traceback__)
    keep = [f for f in tb if f.filename in ("solution.py", "tests.py")]
    lines = []
    for f in keep:
        where = "your code" if f.filename == "solution.py" else "test"
        lines.append("  %s, line %d, in %s" % (where, f.lineno, f.name))
        if f.line:
            lines.append("    " + f.line.strip())
    head = "%s: %s" % (type(exc).__name__, exc)
    if isinstance(exc, SyntaxError) and exc.filename == "solution.py":
        return "SyntaxError in your code, line %s: %s\n    %s" % (
            exc.lineno, exc.msg, (exc.text or "").rstrip())
    if lines:
        return head + "\n" + "\n".join(lines)
    return head


def main():
    payload_path, result_path = sys.argv[1], sys.argv[2]
    with open(payload_path, "r", encoding="utf-8") as fh:
        payload = json.load(fh)
    result = {"status": "ok", "error": None, "stdout": "", "tests": [], "total": 0, "torch": None}

    def finish():
        with open(result_path, "w", encoding="utf-8") as fh:
            json.dump(result, fh)

    try:
        import torch
    except Exception as exc:  # torch missing or broken
        result["status"] = "env_error"
        result["error"] = "Could not import torch with %s\n%s: %s" % (sys.executable, type(exc).__name__, exc)
        finish()
        return
    result["torch"] = torch.__version__
    torch.set_num_threads(max(1, min(4, torch.get_num_threads())))

    # ---- helpers available to tests -------------------------------------
    def _t(x):
        if isinstance(x, torch.Tensor):
            return x.detach()
        return torch.as_tensor(x)

    def _fmt(x):
        if x.numel() <= 24:
            return str(x.tolist())
        flat = x.flatten()
        return "tensor of shape %s, first values %s ..." % (tuple(x.shape), [round(v, 5) for v in flat[:6].tolist()])

    def check_shape(actual, shape, name="output"):
        assert isinstance(actual, torch.Tensor), "%s: expected a torch.Tensor, got %s" % (name, type(actual).__name__)
        assert tuple(actual.shape) == tuple(shape), "%s: expected shape %s, got %s" % (name, tuple(shape), tuple(actual.shape))

    def check_close(actual, expected, tol=1e-4, name="output"):
        assert actual is not None, "%s: got None (did you forget to return a value?)" % name
        a, e = _t(actual), _t(expected)
        assert tuple(a.shape) == tuple(e.shape), "%s: expected shape %s, got %s" % (name, tuple(e.shape), tuple(a.shape))
        a, e = a.double(), e.double()
        if not torch.allclose(a, e, atol=tol, rtol=tol, equal_nan=True):
            finite = torch.isfinite(a) & torch.isfinite(e)
            diff = (a - e).abs()[finite].max().item() if finite.any() else float("nan")
            raise AssertionError("%s: values differ (max abs difference %.4g)\n  expected: %s\n  got:      %s" % (name, diff, _fmt(e), _fmt(a)))

    def check_equal(actual, expected, name="output"):
        if isinstance(expected, torch.Tensor) or isinstance(actual, torch.Tensor):
            assert actual is not None, "%s: got None (did you forget to return a value?)" % name
            a, e = _t(actual), _t(expected)
            assert tuple(a.shape) == tuple(e.shape), "%s: expected shape %s, got %s" % (name, tuple(e.shape), tuple(a.shape))
            assert torch.equal(a.double(), e.double()), "%s: expected %s\n  got %s" % (name, _fmt(e), _fmt(a))
        else:
            assert actual == expected, "%s: expected %r, got %r" % (name, expected, actual)

    def check_true(cond, message="condition is False"):
        assert bool(cond), message

    helpers = {
        "torch": torch, "math": math, "random": random,
        "check_close": check_close, "check_equal": check_equal,
        "check_shape": check_shape, "check_true": check_true,
    }

    # ---- load the solution ----------------------------------------------
    user_ns = {"__name__": "solution"}
    buf = io.StringIO()
    try:
        compiled = compile(payload["code"], "solution.py", "exec")
        with contextlib.redirect_stdout(buf):
            exec(compiled, user_ns)
    except BaseException as exc:  # includes SystemExit raised by user code
        result["status"] = "error"
        result["error"] = _format_exc(exc)
        result["stdout"] = _clip(buf.getvalue())
        finish()
        return
    result["stdout"] = _clip(buf.getvalue())

    # ---- load the tests ---------------------------------------------------
    tests_src = payload["tests"]
    test_ns = dict(user_ns)
    test_ns.update(helpers)
    test_ns["__name__"] = "tests"
    test_ns["SOURCE"] = payload["code"]
    try:
        exec(compile(tests_src, "tests.py", "exec"), test_ns)
    except BaseException as exc:
        result["status"] = "error"
        result["error"] = "The tests could not be set up against your code.\n" + _format_exc(exc)
        finish()
        return

    sources = {}
    try:
        tree = ast.parse(tests_src)
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
                sources[node.name] = ast.get_source_segment(tests_src, node)
    except Exception:
        pass

    if sources:
        tests = [(k, test_ns[k]) for k in sources if callable(test_ns.get(k))]
    else:
        tests = [(k, v) for k, v in test_ns.items() if k.startswith("test_") and callable(v)]
    result["total"] = len(tests)
    if payload.get("mode") == "run":
        tests = tests[: int(payload.get("sample_count", 2))]

    for name, fn in tests:
        entry = {
            "name": name,
            "title": (fn.__doc__ or name[5:].replace("_", " ")).strip(),
            "passed": False, "error": None, "stdout": "", "ms": 0,
            "source": sources.get(name, ""),
        }
        out = io.StringIO()
        torch.manual_seed(0)
        random.seed(0)
        start = time.perf_counter()
        try:
            with contextlib.redirect_stdout(out):
                fn()
            entry["passed"] = True
        except AssertionError as exc:
            msg = str(exc) or "assertion failed"
            tb = traceback.extract_tb(exc.__traceback__)
            in_user = [f for f in tb if f.filename == "solution.py"]
            if in_user:
                msg = _format_exc(exc)
            entry["error"] = msg
        except BaseException as exc:
            entry["error"] = _format_exc(exc)
        entry["ms"] = round((time.perf_counter() - start) * 1000, 1)
        entry["stdout"] = _clip(out.getvalue())
        result["tests"].append(entry)
        # write partial results so a later timeout still reports finished tests
        finish()

    finish()


if __name__ == "__main__":
    main()
