#!/usr/bin/env bash
set -euo pipefail

ALIAS=${1:-reactdemoOrg}
BUNDLE="force-app/main/default/uiBundles/BrokerageARC"

echo "▶ Creating scratch org ($ALIAS)..."
sf org create scratch \
  --definition-file config/project-scratch-def.json \
  --alias "$ALIAS" \
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
echo "▶ Account IDs (use as ?recordId= in the dev server URL):"
sf data query \
  --query "SELECT Id, Name, Tier__c FROM Account ORDER BY CreatedDate ASC" \
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
