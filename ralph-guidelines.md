#!/bin/bash
# ralph.sh — Run Claude in a Ralph Wiggum loop for yINDEX Protocol
# Usage: ./ralph.sh <iterations> [model]
#
# Examples:
#   ./ralph.sh 10              # 10 iterations with opus
#   ./ralph.sh 20 sonnet       # 20 iterations with sonnet
#   RALPH_TIMEOUT=1200 ./ralph.sh 5   # 5 iterations, 20min timeout each

set -e

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations> [model]"
  echo "  iterations: number of Ralph loop iterations"
  echo "  model:      opus or sonnet (default: opus)"
  echo ""
  echo "Environment:"
  echo "  RALPH_TIMEOUT  Per-iteration timeout in seconds (default: 900 = 15min)"
  exit 1
fi

ITERATIONS=$1
MODEL="${2:-opus}"
MAX_RETRIES=3
RETRY_DELAY=5

# Per-iteration timeout (default 15 minutes)
ITERATION_TIMEOUT="${RALPH_TIMEOUT:-900}"

# Project root (directory containing this script)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Verify required files exist
for f in PLAN.md CLAUDE.md prd.json progress.txt AGENTS.md; do
  if [ ! -f "$f" ]; then
    echo "ERROR: Required file '$f' not found in $PROJECT_DIR"
    exit 1
  fi
done

# Verify jq is available
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not installed. Install with: sudo apt install jq"
  exit 1
fi

# ---------------------------------------------------------------------------
# Helper: kill process tree
# ---------------------------------------------------------------------------
kill_tree() {
  local pid=$1
  local sig="${2:-TERM}"
  for child in $(pgrep -P "$pid" 2>/dev/null); do
    kill_tree "$child" "$sig"
  done
  kill -"$sig" "$pid" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Helper: run command with timeout, capture output
# Sets TIMEOUT_RESULT with captured output. Returns 124 on timeout.
# ---------------------------------------------------------------------------
run_with_timeout() {
  local timeout=$1
  shift
  local tmpfile
  tmpfile=$(mktemp)

  "$@" > "$tmpfile" 2>&1 &
  local cmd_pid=$!

  # Watchdog kills after timeout
  (
    sleep "$timeout" 2>/dev/null
    kill_tree "$cmd_pid" TERM
    sleep 5
    kill_tree "$cmd_pid" KILL
  ) &
  local watchdog_pid=$!

  wait "$cmd_pid" 2>/dev/null
  local ret=$?

  kill "$watchdog_pid" 2>/dev/null || true
  wait "$watchdog_pid" 2>/dev/null || true

  TIMEOUT_RESULT=$(cat "$tmpfile")
  rm -f "$tmpfile"

  # SIGTERM=143, SIGKILL=137 -> treat as timeout
  if [ "$ret" -eq 143 ] || [ "$ret" -eq 137 ]; then
    return 124
  fi
  return "$ret"
}

# ---------------------------------------------------------------------------
# Helper: count remaining stories
# ---------------------------------------------------------------------------
count_remaining() {
  jq '[.stories[] | select(.passes == false)] | length' prd.json 2>/dev/null || echo "999"
}

# ---------------------------------------------------------------------------
# Helper: get next story info
# ---------------------------------------------------------------------------
next_story_info() {
  jq -r '[.stories[] | select(.passes == false)] | sort_by(.priority) | .[0] | "\(.id): \(.title) [priority \(.priority)]"' prd.json 2>/dev/null || echo "unknown"
}

# ---------------------------------------------------------------------------
# Pre-flight check
# ---------------------------------------------------------------------------
TOTAL_STORIES=$(jq '[.stories[]] | length' prd.json)
REMAINING=$(count_remaining)
COMPLETED=$((TOTAL_STORIES - REMAINING))

echo ""
echo "========================================"
echo "  yINDEX Ralph Loop"
echo "========================================"
echo "  Model:      $MODEL"
echo "  Iterations: $ITERATIONS"
echo "  Timeout:    ${ITERATION_TIMEOUT}s per iteration"
echo "  Stories:    $COMPLETED/$TOTAL_STORIES complete ($REMAINING remaining)"
echo "  Next:       $(next_story_info)"
echo "========================================"
echo ""

if [ "$REMAINING" -eq 0 ]; then
  echo "All stories already complete. Nothing to do."
  exit 0
fi

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
for ((i=1; i<=ITERATIONS; i++)); do
  REMAINING=$(count_remaining)
  if [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "  All user stories complete!"
    echo "========================================"
    exit 0
  fi

  NEXT=$(next_story_info)
  echo ""
  echo "========================================"
  echo "  Iteration $i of $ITERATIONS"
  echo "  Remaining: $REMAINING stories"
  echo "  Next:      $NEXT"
  echo "  Timeout:   ${ITERATION_TIMEOUT}s"
  echo "========================================"
  echo ""

  # Retry loop for each iteration
  for ((retry=1; retry<=MAX_RETRIES; retry++)); do

    set +e
    run_with_timeout "$ITERATION_TIMEOUT" \
      claude --dangerously-skip-permissions --model "$MODEL" -p \
"You are working on the yINDEX Protocol project.

READ THESE FILES FIRST:
- progress.txt (what's been done)
- prd.json (find next story)
- CLAUDE.md (how to behave)
- AGENTS.md (patterns to follow)
- PLAN.md (architecture context)

WORKFLOW:
1. Read progress.txt to understand current state.
2. Read prd.json and find the HIGHEST PRIORITY story where passes is false.
   If multiple stories share the same priority, pick the one that appears first.
3. Read AGENTS.md and follow established patterns.
4. Implement ONLY that single story. Do NOT combine stories.
5. For contract stories: USE Bob MCP (opnet_knowledge_search + opnet_opnet_dev) for scaffolding, validation, and audit.
6. Run quality checks:
   - Contracts: build compiles, SafeMath used, no while loops, unique pointers
   - Frontend: no TypeScript errors, npm run build succeeds
   - Backend: no TypeScript errors, server starts
7. If checks pass:
   - Update prd.json: set passes to true for the completed story
   - Append progress to progress.txt (what was done, decisions, gotchas)
   - Update AGENTS.md with any new patterns discovered
   - Make a git commit: 'feat(STORY_ID): brief description'
8. If ALL stories in prd.json have passes: true, output exactly: <promise>COMPLETE</promise>

CRITICAL RULES:
- ONE story per iteration. No more.
- Read progress.txt BEFORE starting.
- Use Bob MCP for ALL contract work.
- SafeMath for ALL u256 arithmetic.
- No while loops in contracts.
- Frontend signers always null.
- hyper-express only for backend.
"
    exit_code=$?
    result="$TIMEOUT_RESULT"
    set -e

    # Handle timeout
    if [ "$exit_code" -eq 124 ]; then
      echo ""
      echo "  Iteration timed out after ${ITERATION_TIMEOUT}s"

      if [[ $retry -lt $MAX_RETRIES ]]; then
        echo "  Retrying (attempt $((retry+1)) of $MAX_RETRIES)..."
        sleep $RETRY_DELAY
        continue
      else
        echo "  Max retries reached. Skipping to next iteration."
        break
      fi
    fi

    # Handle usage limit (exit immediately, retrying won't help)
    if [[ "$result" == *"hit your limit"* ]] || [[ "$result" == *"usage limit"* ]] || [[ "$result" == *"Usage limit"* ]]; then
      echo ""
      echo "  Usage limit reached. Stopping."
      echo "  $result" | head -5
      exit 42
    fi

    # Handle API/other errors (retryable)
    if [[ "$result" == *"No messages returned"* ]] || [[ "$result" == *"Error:"* ]] || [[ $exit_code -ne 0 ]]; then
      echo ""
      echo "  Error detected (attempt $retry of $MAX_RETRIES)"

      if [[ $retry -lt $MAX_RETRIES ]]; then
        echo "  Waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
        continue
      else
        echo "  Max retries reached. Moving to next iteration."
        echo "  Error: ${result:0:200}..."
        break
      fi
    fi

    # Success
    echo "$result"
    break
  done

  # Check completion via prd.json (not just the promise tag)
  REMAINING=$(count_remaining)
  if [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "  All $TOTAL_STORIES user stories complete!"
    echo "  Check progress.txt for full history."
    echo "========================================"
    exit 0
  fi

  # Brief delay between iterations
  sleep 2
done

# Reached iteration limit
REMAINING=$(count_remaining)
COMPLETED=$((TOTAL_STORIES - REMAINING))
echo ""
echo "========================================"
echo "  Reached iteration limit ($ITERATIONS)"
echo "  Progress: $COMPLETED/$TOTAL_STORIES stories complete"
echo "  Remaining: $REMAINING stories"
echo "  Next: $(next_story_info)"
echo "  Run again: ./ralph.sh $ITERATIONS $MODEL"
echo "========================================"
