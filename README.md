# BrokerageARC

A relationship visualiser for Salesforce, replacing the standard FSC Actionable Relationship Centre (ARC). Built with Salesforce Multi-Framework (React 19), D3 force-directed graph, and the `@salesforce/sdk-data` GraphQL client.

Displays a Brokerage (Account) as the centre of an interactive graph with all related objects — Brokers (Contacts), Submissions (Opportunities), Claims (Cases), and Meetings (Tasks) — plus a rich detail panel per node.

---

## Quick Start

Clone, then run the setup script to create a scratch org with everything deployed:

    git clone https://github.com/matt-futureform/reactdemo
    cd reactdemo
    ./scripts/setup.sh [org-alias]

The script: creates a scratch org → builds the React bundle → deploys all metadata → assigns the permission set → imports test data → prints Account IDs → opens the org.

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
│   ├── Account-parents.json            # Global Industries (top-level brokerage)
│   ├── Account-children.json           # Acme Corp (child of Global Industries)
│   ├── Contact.json                    # 6 brokers
│   ├── Opportunity.json                # 4 submissions
│   ├── Case.json                       # 3 claims
│   └── Task.json                       # 5 meetings
├── force-app/main/default/
│   ├── applications/                   # CustomApplication — wires bundle to App Launcher
│   ├── objects/                        # Custom field metadata
│   ├── permissionsets/                 # BrokerageARC permission set (FLS + app visibility)
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
    └── setup.sh                        # Full scratch org setup — one command
```

---

## After Cloning

1. Authenticate your Dev Hub: `sf org login web --alias <devhub> --set-default-dev-hub`
2. Run the setup script: `./scripts/setup.sh <alias>`
3. The script prints Account IDs at the end — use them as `?recordId=` in the dev server URL

### Dev server

```bash
cd force-app/main/default/uiBundles/BrokerageARC
sf ui-bundle dev --target-org <alias> --port 4545
# Then open http://localhost:4545/?recordId=<AccountId>
```

### After any GraphQL query change

```bash
npm run graphql:schema --target-org <alias>
npm run graphql:codegen
```

---

## Deploying Changes

```bash
# Deploy all metadata (objects, permsets, uiBundle, application)
sf project deploy start \
  --source-dir force-app/main/default \
  --target-org <alias>

# UIBundle only (build first)
cd force-app/main/default/uiBundles/BrokerageARC && npm run build
cd ../../../.. && sf project deploy start \
  --source-dir force-app/main/default/uiBundles \
  --target-org <alias>
```
