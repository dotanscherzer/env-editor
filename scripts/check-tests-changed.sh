#!/usr/bin/env bash
# Fails the build when production code changes without accompanying test changes.
# Escape hatch: include [skip-tests] in any commit message on the branch.

set -euo pipefail

if git log --format=%B "${BASE_REF:-origin/master}..HEAD" 2>/dev/null | grep -qF '[skip-tests]'; then
  echo "[skip-tests] found in commit history — bypassing test-changed check."
  exit 0
fi

BASE_REF="${BASE_REF:-origin/master}"
git fetch origin master --depth=50 2>/dev/null || git fetch origin main --depth=50 2>/dev/null || true

CHANGED=$(git diff --name-only "${BASE_REF}...HEAD" || git diff --name-only HEAD~1 HEAD)

CODE_PATHS_RE='^server/'
TEST_PATHS_RE='(\.test\.|\.spec\.|/tests?/|/__tests__/)'

PROD_CHANGED=$(echo "$CHANGED" | grep -E "$CODE_PATHS_RE" | grep -vE "$TEST_PATHS_RE" || true)
TEST_CHANGED=$(echo "$CHANGED" | grep -E "$TEST_PATHS_RE" || true)

if [ -n "$PROD_CHANGED" ] && [ -z "$TEST_CHANGED" ]; then
  echo "::error::Production code changed but no test file changes detected."
  echo ""
  echo "Changed production files:"
  echo "$PROD_CHANGED" | sed 's/^/  - /'
  echo ""
  echo "Add or update a test file, or include [skip-tests] in your commit message."
  exit 1
fi

echo "OK: production changes accompanied by test changes (or no production changes)."
