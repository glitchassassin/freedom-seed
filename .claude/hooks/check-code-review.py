#!/usr/bin/env python3
"""
Stop hook: reminds Claude to run the code-review agent if there are
code changes since the last code-review invocation in the transcript.
"""

import json
import sys

CODE_CHANGE_TOOLS = {"Edit", "Write", "NotebookEdit"}
CODE_REVIEW_AGENT_TYPES = {"code-review", "best-practices-reviewer"}
MAX_REVIEW_ATTEMPTS = 3


def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    # Note: we intentionally do NOT skip when stop_hook_active is True.
    # Instead of the standard stop_hook_active guard, we use a bounded counter
    # (MAX_REVIEW_ATTEMPTS) to detect loops: if the review agent keeps introducing
    # new changes, we allow up to that many review cycles before giving up and
    # letting Claude stop. This ensures fixes introduced by a review invocation
    # are themselves re-reviewed, up to the limit.

    transcript_path = hook_input.get("transcript_path")
    if not transcript_path:
        sys.exit(0)

    try:
        with open(transcript_path, "r") as f:
            lines = f.readlines()
    except (FileNotFoundError, OSError):
        sys.exit(0)

    # Walk the transcript in order, recording (index, event_type) for each
    # relevant tool call. Index is just a counter to preserve ordering.
    events = []

    for line in lines:
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
            events.append("user_message")
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
