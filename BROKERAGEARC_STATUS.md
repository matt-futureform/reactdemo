# BrokerageARC — Project Status
_Last updated: 7 June 2026_

---

## What Is This

A relationship visualiser replacing the standard FSC Actionable Relationship Centre (ARC).
Built with Salesforce Multi-Framework (React 19), D3 force-directed graph, and the Salesforce
`@salesforce/sdk-data` GraphQL client.

Displays a Brokerage (Account) as the centre of an interactive graph with all related objects
— Brokers (Contacts), Submissions (Opportunities), Claims (Cases), Meetings (Tasks) — plus
a rich detail panel per node.

---

## What Is Built and Working

### Org Metadata (deployed to `reactdemoOrg` scratch org, alias `test-fsqilinexctp@example.com`)

| Metadata | Status |
|---|---|
| UIBundle `BrokerageARC` (`isActive: true`) | Deployed ✓ |
| Custom fields — Account ×5 | Deployed ✓ |
| Custom fields — Contact ×1 | Deployed ✓ |
| Custom fields — Opportunity ×2 | Deployed ✓ |
| Custom fields — Case ×1 | Deployed ✓ |
| Permission set `BrokerageARC` (FLS on all 9 fields) | Deployed + assigned ✓ |
| `CustomApplication` with `uiBundle` property | **Blocked — see below** |

**Custom fields deployed:**
- `Account.Tier__c` — Picklist: Strategic / Preferred / Standard
- `Account.GWP__c` — Currency
- `Account.GWP_Target__c` — Currency
- `Account.Relationship_Score__c` — Number 0–100
- `Account.AI_Summary__c` — Long Text Area
- `Contact.Active__c` — Checkbox
- `Opportunity.Line_of_Business__c` — Picklist: Property / Liability / Marine Cargo / Casualty / Financial Lines
- `Opportunity.Days_Open__c` — Formula (Number): `TODAY() - DATEVALUE(CreatedDate)`
- `Case.Reserve__c` — Currency

### Test Data

**Global Industries** (`001KK00000CeGOzYAN`) — Strategic tier, parent brokerage
- GWP: £8.5m / £10m target, Score: 85
- 3 Brokers: Michael Jones (active), Anup Gupta (active), Jonathan Bradley
- 2 Submissions: Financial Lines £5.2m, Casualty £3.8m
- 1 Claim: Directors Liability £2.5m reserve
- 2 Meetings: Group Strategy Review, Casualty Programme Renewal

**Acme Corp** (`001KK00000CeGOyYAN`) — Preferred tier, child of Global Industries
- GWP: £2.4m / £3m target, Score: 72
- 3 Brokers: Amy Taylor (active), Jennifer Wu (active), Caroline Kingsley (inactive)
- 2 Submissions: Property £2.4m, Liability £850k
- 2 Claims: Warehouse Fire £450k, Third Party Injury £125k
- 3 Meetings: Q2 Renewal Review, Portfolio Strategy QBR, Marine Cargo Underwriter Meeting

### Application Features

| Feature | Status |
|---|---|
| D3 force-directed graph — zoom, pan, drag | Working ✓ |
| Graph / Card view toggle | Working ✓ |
| Account hierarchy (parent ↑ and children ↓) | Working ✓ |
| Drill-down navigation between accounts | Working ✓ |
| Breadcrumb showing parent › current | Working ✓ |
| Auto-selects centre brokerage on load | Working ✓ |
| Node click → detail panel | Working ✓ |
| All 5 node types: brokerage, broker, submission, claim, meeting | Working ✓ |
| Loading skeleton (graph + detail) | Working ✓ |
| Error card with retry button | Working ✓ |
| Open Record → Salesforce Lightning record page | Working ✓ |
| GWP progress bar in Brokerage detail | Working ✓ |
| ⚡ AI Summary block | Working ✓ |

### How to Run Locally

```bash
# From the BrokerageARC bundle directory
cd /Users/mattluscombe/reactdemo/force-app/main/default/uiBundles/BrokerageARC
sf ui-bundle dev --target-org reactdemoOrg --port 4545

# Test URLs
http://localhost:4545/?recordId=001KK00000CeGOzYAN   # Global Industries (parent)
http://localhost:4545/?recordId=001KK00000CeGOyYAN   # Acme Corp (child)
```

---

## What Is Blocked — Platform Bug Until ~13 June 2026

The `CustomApplication` metadata type gained a new `<uiBundle>` property in API v67 (Summer '26).
This is required for a UI bundle to appear in App Launcher. The property deploys without error
but does **not** actually register the app in the launcher — a platform-side bug affecting
this org instance.

**Error code:** `-750749931` (consistent across all deploy attempts)
**Fix:** PR #22 on `trailheadapps/multiframework-recipes` — merging with Summer '26 R2 (~13 June 2026)

The metadata is ready to deploy the moment the fix lands:

```bash
sf project deploy start \
  --source-dir force-app/main/default/applications \
  --target-org reactdemoOrg
```

The file is already at:
`force-app/main/default/applications/BrokerageARC.app-meta.xml`

---

## Post-June 13 Task List

### 1. Deploy CustomApplication — App Launcher visibility
```bash
sf project deploy start --source-dir force-app/main/default/applications --target-org reactdemoOrg
```
Then verify `BrokerageARC` appears in App Launcher.

### 2. Wire `recordId` from the platform router
Currently `recordId` is read from `?recordId=` query param (local dev only).
In production the platform injects `SFDC_ENV.recordId`. Confirm `main.jsx` picks this
up correctly — it already handles both paths but needs end-to-end testing in App Launcher.

```javascript
// main.jsx — already handles both
const sfdcEnv = globalThis.SFDC_ENV ?? {};
const params = new URLSearchParams(window.location.search);
const recordId = sfdcEnv.recordId ?? params.get('recordId') ?? null;
```

### 3. Wire the 4 lazy detail queries
`BROKER_DETAIL_QUERY`, `SUBMISSION_DETAIL_QUERY`, `CLAIM_DETAIL_QUERY`, `MEETING_DETAIL_QUERY`
are defined and schema-validated but not yet called at runtime. Currently all node data
comes from the main graph query. Implement `useNodeDetail.js` hook to lazy-fetch richer
data when a non-brokerage node is selected.

### 4. Action buttons — Log Activity, New Submission
Currently rendered but without handlers. Wire to Salesforce Quick Actions or
navigate to the New record page using `SFDC_ENV.orgUrl`.

### 5. Load real AI summaries
`Account.AI_Summary__c` is currently populated with static test text. Wire to an
Agentforce Prompt Action that generates summaries from live account data.

### 6. Multi-level hierarchy
Currently fetches one level of `Parent` and one level of `ChildAccounts`. If the
account tree is deeper, extend `graphTransform.js` to handle grandparent / grandchild
nodes, or introduce a recursive fetch strategy in `useBrokerageGraph.js`.

### 7. Production deployment
Beta currently limits to scratch orgs / sandboxes. When GA, deploy to production:
```bash
sf project deploy start --target-org <production-alias>
```

---

## Key Files

```
force-app/main/default/
├── uiBundles/BrokerageARC/
│   ├── ui-bundle.json                    # name, dev.command config
│   └── src/
│       ├── main.jsx                      # Entry — reads recordId from SFDC_ENV or ?param
│       ├── brokerage-arc-graph.jsx       # Entire app (graph + all detail panels)
│       ├── graphql/
│       │   ├── client.js                 # executeGraphQL() wrapper
│       │   └── queries.js                # All 5 GraphQL queries
│       ├── hooks/
│       │   └── useBrokerageGraph.js      # Data hook — fetch + transform + retry
│       └── utils/
│           └── graphTransform.js         # Maps GraphQL response → D3 nodes/links
├── applications/
│   └── BrokerageARC.app-meta.xml         # Ready — deploy post June 13
├── objects/                              # All custom field metadata
└── permissionsets/
    └── BrokerageARC.permissionset-meta.xml
```
