#!/usr/bin/env bash
set -euo pipefail

BUNDLE="force-app/main/default/uiBundles/BrokerageARC"

echo ""
echo "BrokerageARC — Scratch Org Setup"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Dev Hub ─────────────────────────────────────────────────
echo "Step 1 of 2 — Dev Hub"
echo "  Run 'sf org list' to see your authenticated orgs."
echo ""

while true; do
  read -rp "  Dev Hub alias or username: " DEVHUB
  if [[ -z "$DEVHUB" ]]; then
    echo "  ✗ Please enter a value." >&2
    continue
  fi

  echo "  Checking…"

  if ! ORG_JSON=$(sf org display --target-org "$DEVHUB" --json 2>/dev/null); then
    echo "" >&2
    echo "  ✗ No authenticated org found for '$DEVHUB'." >&2
    echo "    Authenticate first: sf org login web --alias $DEVHUB --set-default-dev-hub" >&2
    echo "" >&2
    continue
  fi

  if echo "$ORG_JSON" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); exit(0 if d.get('result',{}).get('isDevHub') else 1)" \
    2>/dev/null; then
    echo "  ✓ Dev Hub confirmed."
    break
  else
    echo "" >&2
    echo "  ✗ '$DEVHUB' is authenticated but is not a Dev Hub." >&2
    echo "    Re-authenticate with: sf org login web --alias $DEVHUB --set-default-dev-hub" >&2
    echo "" >&2
  fi
done

echo ""

# ── Step 2: Scratch org alias ────────────────────────────────────────
echo "Step 2 of 2 — Scratch Org"
read -rp "  Scratch org alias [reactdemoOrg]: " ALIAS
ALIAS=${ALIAS:-reactdemoOrg}
echo ""

# ── Setup ────────────────────────────────────────────────────────────
echo "▶ Creating scratch org ($ALIAS) via Dev Hub ($DEVHUB)..."
sf org create scratch \
  --definition-file config/project-scratch-def.json \
  --alias "$ALIAS" \
  --target-dev-hub "$DEVHUB" \
  --duration-days 30

echo "▶ Setting default org to $ALIAS..."
sf config set target-org "$ALIAS"

echo "▶ Installing bundle dependencies..."
npm install --prefix "$BUNDLE"

echo "▶ Building React bundle..."
npm run build --prefix "$BUNDLE"

echo "▶ Deploying metadata..."
sf project deploy start \
  --source-dir force-app/main/default \
  --target-org "$ALIAS" \
  --ignore-conflicts

echo "▶ Assigning permission set..."
sf org assign permset \
  --name BrokerageARC \
  --target-org "$ALIAS"

echo "▶ Importing data..."
sf data import tree \
  --plan data/plan.json \
  --target-org "$ALIAS"

echo ""
echo "✓ Setup complete."
echo ""
echo "── Local dev server ──────────────────────────────────────────────"
echo "  cd $BUNDLE && npm run dev"
echo "  Then open: http://localhost:5173"
echo "  Use the search overlay to find and select a brokerage."
echo "  To jump straight to a record: http://localhost:5173/?recordId=<id>"
echo ""
echo "── Opening org in browser ────────────────────────────────────────"
echo "  Once the org opens, go to the App Launcher (9-dot grid)"
echo "  and search for 'BrokerageARC' to open the deployed app."
echo ""
sf org open --target-org "$ALIAS"
