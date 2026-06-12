#!/usr/bin/env bash
# Usage: ./scripts/new-scratch-org.sh [alias]
# Creates a fresh scratch org, deploys all metadata, imports sample data.
set -euo pipefail

ALIAS="${1:-brokerageARC-$(date +%Y%m%d)}"
DEV_HUB="yahoo"
BUNDLE_DIR="force-app/main/default/uiBundles/BrokerageARC"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "==> Creating scratch org: $ALIAS"
sf org create scratch \
  --definition-file config/project-scratch-def.json \
  --alias "$ALIAS" \
  --duration-days 30 \
  --target-dev-hub "$DEV_HUB" \
  --set-default

echo ""
echo "==> Building UIBundle..."
(cd "$BUNDLE_DIR" && npm install --silent && npm run build)

echo ""
echo "==> Deploying metadata (objects, permsets, uiBundle)..."
sf project deploy start \
  --source-dir force-app/main/default/objects \
  --source-dir force-app/main/default/permissionsets \
  --source-dir force-app/main/default/uiBundles \
  --target-org "$ALIAS" \
  --wait 15

echo ""
echo "==> Assigning BrokerageARC permission set..."
sf org assign permset \
  --name BrokerageARC \
  --target-org "$ALIAS"

echo ""
echo "==> Importing sample data..."
sf data import tree \
  --plan data/plan.json \
  --target-org "$ALIAS"

echo ""
echo "==> Account IDs in new org:"
sf data query \
  --query "SELECT Id, Name, Tier__c FROM Account ORDER BY CreatedDate ASC" \
  --target-org "$ALIAS"

echo ""
echo "==> Done. Start the dev server with:"
echo ""
echo "    cd $BUNDLE_DIR"
echo "    sf ui-bundle dev --target-org $ALIAS --port 4545"
echo ""
echo "    Then open:"
echo "    http://localhost:4545/?recordId=<GlobalIndustriesId>"
echo "    http://localhost:4545/?recordId=<AcmeCorpId>"
echo ""
echo "Note: CustomApplication (App Launcher) deploy is blocked until Summer '26 R2 (~13 June 2026)."
echo "      Deploy it manually once the fix lands:"
echo "      sf project deploy start --source-dir force-app/main/default/applications --target-org $ALIAS"
