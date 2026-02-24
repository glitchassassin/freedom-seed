#!/usr/bin/env python3
"""
Stop hook: reminds Claude to run the code-review agent if there are
code changes since the last code-review invocation in the transcript.
"""

import json
import sys

CODE_REVIEW_AGENT_TYPES = {"code-review", "best-practices-reviewer"}
MAX_REVIEW_ATTEMPTS = 3
DOCS_ONLY_PREFIXES = ("docs/",)
RATE_LIMIT_MARKERS = ("rate_limit", "rate limit", "you've hit your limit", "hit your limit")

# Maps each file-editing tool to the input key that holds the file path.
# Only tools listed here are treated as code changes.
CODE_CHANGE_TOOLS = {
    "Edit": "file_path",
    "Write": "file_path",
    "NotebookEdit": "notebook_path",
}


def is_docs_only_path(path: str, cwd: str = "") -> bool:
    """Return True if the path is under a docs-only directory."""
    normalised = path
    # Strip the project root so absolute paths become project-relative.
    # Ensure cwd ends with "/" so we only match on a directory boundary.
    if cwd:
        cwd_prefix = cwd if cwd.endswith("/") else cwd + "/"
        if normalised.startswith(cwd_prefix):
            normalised = normalised[len(cwd_prefix):]
    normalised = normalised.lstrip("/")
    if normalised.startswith("./"):
        normalised = normalised[2:]
    return any(normalised.startswith(prefix) for prefix in DOCS_ONLY_PREFIXES)


def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, ValueError):
        print("check-code-review: failed to parse hook input JSON", file=sys.stderr)
        sys.exit(0)

    # Note: we intentionally do NOT skip when stop_hook_active is True.
    # Instead of the standard stop_hook_active guard, we use a bounded counter
    # (MAX_REVIEW_ATTEMPTS) to detect loops: if the review agent keeps introducing
    # new changes, we allow up to that many review cycles before giving up and
    # letting Claude stop. This ensures fixes introduced by a review invocation
    # are themselves re-reviewed, up to the limit.

    cwd = hook_input.get("cwd", "")
    transcript_path = hook_input.get("transcript_path")
    if not transcript_path:
        sys.exit(0)

    try:
        with open(transcript_path, "r") as f:
            lines = f.readlines()
    except (FileNotFoundError, OSError) as e:
        print(f"check-code-review: could not read transcript: {e}", file=sys.stderr)
        sys.exit(0)

    # Walk the transcript in order, recording (index, event_type) for each
    # relevant tool call. Index is just a counter to preserve ordering.
    events = []
    last_user_line_idx = -1  # index into `lines` (JSONL), NOT into `events`

    for line_idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        entry_type = entry.get("type")

        # Track real user messages (not tool results, which also appear as role=user)
        if entry_type == "user" and entry.get("userType") == "external":
            # /clear resets the conversation context — discard prior history
            msg_content = entry.get("message", {}).get("content", "")
            if isinstance(msg_content, str) and "<command-name>/clear</command-name>" in msg_content:
                events = []
                last_user_line_idx = -1
                continue
            events.append("user_message")
            last_user_line_idx = line_idx
            continue

        if entry_type != "assistant":
            continue

        message = entry.get("message", {})
        content = message.get("content", [])
        if not isinstance(content, list):
            continue

        for item in content:
            if not isinstance(item, dict) or item.get("type") != "tool_use":
                continue

            name = item.get("name", "")

            if name in CODE_CHANGE_TOOLS:
                path_key = CODE_CHANGE_TOOLS[name]
                file_path = item.get("input", {}).get(path_key, "")
                if not is_docs_only_path(file_path, cwd):
                    events.append("code_change")
            elif name == "Task":
                subagent_type = item.get("input", {}).get("subagent_type", "")
                if subagent_type in CODE_REVIEW_AGENT_TYPES:
                    events.append("code_review")

    # Find the last code-review position, then check for any code changes after it
    last_review_pos = -1
    for i, event in enumerate(events):
        if event == "code_review":
            last_review_pos = i

    has_unreviewed_changes = any(
        event == "code_change" for event in events[last_review_pos + 1 :]
    )

    if not has_unreviewed_changes:
        sys.exit(0)

    # Fail open if a rate limit error appears after the last user message.
    # Without this, the hook loops forever when Claude can't act due to limits.
    for line in lines[last_user_line_idx + 1 :]:
        if any(marker in line.lower() for marker in RATE_LIMIT_MARKERS):
            sys.exit(0)

    # Count how many code-review attempts have been made since the last user message.
    # If we've hit the limit, exit 0 to break the loop — the user will see the
    # feedback and can intervene manually.
    last_user_pos = -1
    for i, event in enumerate(events):
        if event == "user_message":
            last_user_pos = i

    reviews_since_user = sum(
        1 for event in events[last_user_pos + 1 :] if event == "code_review"
    )

    if reviews_since_user >= MAX_REVIEW_ATTEMPTS:
        print(
            f"Code review has not converged after {MAX_REVIEW_ATTEMPTS} attempts "
            "since the last user message. Stopping to avoid an infinite loop — "
            "please review the changes manually.",
            file=sys.stderr,
        )
        sys.exit(0)

    print("Run the code-review agent to approve the most recent changes.", file=sys.stderr)
    sys.exit(2)


if __name__ == "__main__":
    main()
