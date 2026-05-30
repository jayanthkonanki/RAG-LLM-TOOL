"""
test_chat_core.py — Caveman unit tests for chat_core.py.

Run with:  python test_chat_core.py
No pytest, no live services, no network.  Print = pass, FAIL = loud.
"""
import asyncio
import sys

# ── guard: chat_core must import without any service deps ────────────────────
try:
    from chat_core import build_context, extract_answer, run_chat
    print("[OK] chat_core imported cleanly (no service deps)")
except ImportError as e:
    print(f"[FAIL] import: {e}")
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

PASS = 0
FAIL = 0

def ok(label: str):
    global PASS
    PASS += 1
    print(f"  [OK]   {label}")

def fail(label: str, detail: str = ""):
    global FAIL
    FAIL += 1
    print(f"  [FAIL] {label}" + (f" — {detail}" if detail else ""))

def assert_eq(label, got, expected):
    if got == expected:
        ok(label)
    else:
        fail(label, f"got={got!r}  expected={expected!r}")

def assert_in(label, needle, haystack):
    if needle in haystack:
        ok(label)
    else:
        fail(label, f"{needle!r} not in {haystack!r}")

def assert_true(label, value):
    if value:
        ok(label)
    else:
        fail(label, f"got falsy: {value!r}")


# ─────────────────────────────────────────────────────────────────────────────
# Tests: build_context
# ─────────────────────────────────────────────────────────────────────────────

print("\n=== build_context ===")

# empty hits
ctx = build_context([])
assert_in("empty hits -> no-match notice", "No matching endpoints found", ctx)

# single hit
hit = {"entity": {"metadata": {"name": "GetUser", "method": "GET", "path": "/users/{id}", "description": "Fetch a user"}}, "distance": 0.91}
ctx = build_context([hit])
assert_in("hit name present",        "GetUser",        ctx)
assert_in("hit method present",      "GET",            ctx)
assert_in("hit path present",        "/users/{id}",    ctx)
assert_in("hit description present", "Fetch a user",   ctx)
assert_in("score present",           "0.910",          ctx)

# multiple hits — order preserved
hits = [
    {"entity": {"metadata": {"name": "A", "method": "POST", "path": "/a", "description": ""}}, "distance": 0.9},
    {"entity": {"metadata": {"name": "B", "method": "DELETE", "path": "/b", "description": ""}}, "distance": 0.8},
]
ctx = build_context(hits)
assert_true("multiple hits — Match 1 before Match 2", ctx.index("Match 1") < ctx.index("Match 2"))

# malformed hit (missing entity key)
bad_hit = {"distance": 0.5}
ctx = build_context([bad_hit])
assert_in("malformed hit — no crash, has Match 1", "Match 1", ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Tests: extract_answer
# ─────────────────────────────────────────────────────────────────────────────

print("\n=== extract_answer ===")

# Case 1: result.data is a plain string
class R1:
    data = "  hello world  "
assert_eq("result.data str", extract_answer(R1()), "hello world")

# Case 2: result.data is None, new_messages() returns TextPart
class TextPart:
    def __init__(self, content):
        self.content = content

class Msg:
    def __init__(self, *parts):
        self.parts = parts

class R2:
    data = None
    def new_messages(self):
        return [Msg(TextPart("from new_messages"))]

assert_eq("new_messages() callable -> TextPart", extract_answer(R2()), "from new_messages")

# Case 3: new_messages is a property (not callable)
class R3:
    data = None
    new_messages = [Msg(TextPart("from property"))]

assert_eq("new_messages property -> TextPart", extract_answer(R3()), "from property")

# Case 4: nothing works -> fallback str(result)
class R4:
    data = None
    def __str__(self): return "fallback"

assert_eq("fallback str(result)", extract_answer(R4()), "fallback")

# Case 5: new_messages() raises -> silent fallback
class R5:
    data = None
    def new_messages(self): raise RuntimeError("boom")
    def __str__(self): return "safe"

assert_eq("new_messages raises -> fallback", extract_answer(R5()), "safe")


# ─────────────────────────────────────────────────────────────────────────────
# Tests: run_chat (async, fully mocked I/O)
# ─────────────────────────────────────────────────────────────────────────────

print("\n=== run_chat ===")

async def _test_run_chat_happy():
    calls = {}

    def embed_fn(text):
        calls["embed"] = text
        return [0.1] * 768

    def search_fn(vec):
        calls["search"] = vec
        return [{"entity": {"metadata": {"name": "X", "method": "GET", "path": "/x", "description": ""}}, "distance": 0.99}]

    class FakeResult:
        data = "The answer is 42."

    async def llm_fn(prompt):
        calls["prompt"] = prompt
        return FakeResult()

    answer = await run_chat("what is endpoint X?", embed_fn, search_fn, llm_fn)

    assert_eq("happy path — answer returned",   answer, "The answer is 42.")
    assert_true("embed_fn called",              "embed" in calls)
    assert_true("search_fn called",             "search" in calls)
    assert_in("context injected into prompt",   "Match 1", calls.get("prompt", ""))
    assert_in("question injected into prompt",  "what is endpoint X?", calls.get("prompt", ""))

async def _test_run_chat_empty_results():
    """search returns nothing → no crash, graceful answer."""
    def embed_fn(text): return [0.0] * 768
    def search_fn(vec): return []

    class FakeResult:
        data = "No endpoints found."

    async def llm_fn(prompt):
        assert "No matching endpoints" in prompt, f"expected no-match notice, got: {prompt[:200]}"
        return FakeResult()

    answer = await run_chat("??", embed_fn, search_fn, llm_fn)
    assert_true("empty search — got answer", bool(answer))

async def _test_run_chat_llm_error():
    """LLM raises → exception propagates (caller should handle)."""
    def embed_fn(text): return [0.0] * 768
    def search_fn(vec): return []

    async def llm_fn(prompt): raise ValueError("LLM down")

    try:
        await run_chat("hi", embed_fn, search_fn, llm_fn)
        fail("LLM error — expected exception to propagate")
    except ValueError:
        ok("LLM error propagates correctly")

asyncio.run(_test_run_chat_happy())
asyncio.run(_test_run_chat_empty_results())
asyncio.run(_test_run_chat_llm_error())


# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────

print(f"\n{'='*40}")
print(f"  PASSED: {PASS}   FAILED: {FAIL}")
print(f"{'='*40}")
sys.exit(0 if FAIL == 0 else 1)
