#!/usr/bin/env bash
set -euo pipefail

ALIAS=${1:-reactdemoOrg}
BUNDLE="force-app/main/default/uiBundles/BrokerageARC"

echo "▶ Creating scratch org ($ALIAS)..."
sf org create scratch \
  --definition-file config/project-scratch-def.json \
  --alias "$ALIAS" \
  --duration-days 30

echo "▶ Installing bundle dependencies..."
npm install --prefix "$BUNDLE"

echo "▶ Building React bundle..."
npm run build --prefix "$BUNDLE"

echo "▶ Deploying metadata..."
sf project deploy start \
  --source-dir force-app/main/default \
  --target-org "$ALIAS"

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
echo "To run the dev server:"
echo "  cd $BUNDLE && sf ui-bundle dev --target-org $ALIAS --port 4545"
echo ""
echo "Then open:  http://localhost:4545/?recordId=<AccountId>"
echo ""
sf org open --target-org "$ALIAS"
