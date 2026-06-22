# BrokerageARC

A relationship visualiser for Salesforce, replacing the standard FSC Actionable Relationship Centre (ARC). Built with Salesforce Multi-Framework (React 19), D3 force-directed graph, and the `@salesforce/sdk-data` GraphQL client.

Displays a Brokerage (Account) as the centre of an interactive graph with all related objects — Brokers (Contacts), Submissions (Opportunities), Claims (Cases), and Meetings (Tasks) — plus a rich detail panel per node.

---

## Quick Start

Clone, then run the setup script to create a scratch org with everything deployed:

    git clone https://github.com/matt-futureform/reactdemo
    cd reactdemo
    ./scripts/setup.sh [org-alias]

The script: creates a scratch org → builds the React bundle → deploys all metadata → assigns the permission set → imports test data → opens the org.

**Prerequisites:** Salesforce CLI (`sf`), Node.js ≥ 22, an authenticated Dev Hub.

---

## Object Model

This project uses renamed FSC standard objects:

| Salesforce Object | Label in UI |
|---|---|
| Account | Brokerage |
| Contact | Broker |
| Opportunity | Submission |
| Case | Claim |
| Task | Meeting |

Custom fields: `Account.Tier__c`, `Account.GWP__c`, `Account.GWP_Target__c`, `Account.Relationship_Score__c`, `Account.AI_Summary__c`, `Contact.Active__c`, `Opportunity.Line_of_Business__c`, `Opportunity.Days_Open__c`, `Case.Reserve__c`

---

## Project Structure

```
├── config/
│   └── project-scratch-def.json       # Scratch org definition
├── data/
│   ├── plan.json                       # sf data import tree plan
│   ├── Account.json                    # 2 brokerages (Global Industries + Acme Corp)
│   ├── Contact.json                    # 6 brokers
│   ├── Opportunity.json                # 4 submissions
│   ├── Case.json                       # 3 claims
│   └── Task.json                       # 5 meetings
├── force-app/main/default/
│   ├── applications/                   # CustomApplication metadata (App Launcher)
│   ├── objects/                        # Custom field metadata
│   ├── permissionsets/                 # BrokerageARC permission set (FLS on all 9 fields)
│   └── uiBundles/BrokerageARC/
│       ├── src/
│       │   ├── main.jsx                # Entry point — reads recordId from SFDC_ENV or ?param
│       │   ├── brokerage-arc-graph.jsx # Main app component (graph + detail panels)
│       │   ├── graphql/
│       │   │   ├── client.js           # executeGraphQL() wrapper
│       │   │   └── queries.js          # All GraphQL queries
│       │   ├── hooks/
│       │   │   └── useBrokerageGraph.js
│       │   └── utils/
│       │       └── graphTransform.js   # GraphQL response → D3 nodes/links
│       └── vite.config.js
└── scripts/
    └── new-scratch-org.sh              # Full scratch org setup script
```

---

## After Cloning

1. Authenticate your Dev Hub: `sf org login web --alias yahoo --set-default-dev-hub`
2. Run the setup script: `./scripts/new-scratch-org.sh <alias>`
3. Note the Account IDs printed at the end — use them as `?recordId=` in the dev server URL

### After any GraphQL query change

```bash
# Pull current schema from org
npm run graphql:schema --target-org <alias>

# Regenerate TypeScript types
npm run graphql:codegen
```

---

## Deploying Changes

```bash
# Deploy metadata only (objects, permsets)
sf project deploy start \
  --source-dir force-app/main/default/objects \
  --source-dir force-app/main/default/permissionsets \
  --target-org <alias>

# Deploy UIBundle (build first)
cd force-app/main/default/uiBundles/BrokerageARC && npm run build
cd ../../../.. && sf project deploy start \
  --source-dir force-app/main/default/uiBundles \
  --target-org <alias>
```

> **Note:** `CustomApplication` deployment (App Launcher visibility) is blocked by a platform bug until Summer '26 R2 (~13 June 2026). The metadata is ready at `force-app/main/default/applications/BrokerageARC.app-meta.xml` — deploy it once the fix lands. Until then, the app runs via direct dev server URL only.
