# Hooks Implementation Patterns

## Stop Hook Anti-Patterns

### Missing `stop_hook_active` guard

Stop hooks that exit with code 2 (blocking) MUST check `stop_hook_active` to
prevent infinite loops. The official docs warn: "Check this value or process the
transcript to prevent Claude Code from running indefinitely."

```python
# Always add this near the top of Stop hook scripts:
stop_hook_active = hook_input.get("stop_hook_active", False)
if stop_hook_active:
    sys.exit(0)
```

**Reviewed 2026-02-20**: `check-code-review.py` intentionally skips the
`stop_hook_active` guard. This was initially flagged as critical, but the hook
implements a bounded counter (`MAX_REVIEW_ATTEMPTS = 3`) that caps review cycles
per user message, preventing infinite loops. The alternative approach is
acceptable as long as the bound exists. The comment in the code (lines 21-26)
documents this design decision.

### Silent error swallowing

Hooks that fail-open (exit 0 on errors) should still log to stderr for
debuggability. Claude Code's `--debug` mode shows hook stderr output.

## Transcript Parsing

- Transcript is JSONL (one JSON object per line)
- Each entry has a `type` field (e.g., "assistant", "user")
- Assistant entries have `message.content` which is a list of content blocks
- Tool use blocks have `type: "tool_use"` with `name` and `input` fields
- Task tool calls have `input.subagent_type` to identify which agent was invoked
- WARNING: transcript format is internal and may change between Claude Code
  versions
