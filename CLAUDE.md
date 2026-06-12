# BrokerageARC — Salesforce Multi-Framework React App

## Project Overview
A relationship visualiser replacing the standard FSC Actionable Relationship Centre (ARC).
Built with Salesforce Multi-Framework (React), D3 force-directed graph, and the Salesforce
sdk-data GraphQL client. Displays a Brokerage node with all related objects as an interactive
graph, plus a rich detail panel per node — surfacing combined data without requiring multiple
clicks as ARC does.

---

## Object Model
This org uses renamed FSC standard objects. Always use the API names below — never the
Salesforce default labels.

| Salesforce Default | This Org API Name | Label in UI     |
|--------------------|-------------------|-----------------|
| Account            | Account           | Brokerage       |
| Contact            | Contact           | Broker          |
| Opportunity        | Opportunity       | Submission      |
| Case               | Case              | Claim           |

Custom fields use standard __c suffix. Key custom fields:
- Account.Tier__c — Strategic / Preferred / Standard
- Account.GWP__c — Gross Written Premium (currency)
- Account.GWP_Target__c — GWP target (currency)
- Account.Relationship_Score__c — numeric 0–100
- Account.AI_Summary__c — Einstein/Agentforce generated summary text
- Opportunity.Line_of_Business__c — e.g. Property, Liability, Marine Cargo
- Opportunity.Days_Open__c — formula field
- Case.Reserve__c — currency

---

## Tech Stack
- Salesforce Multi-Framework (Beta) — React 19, Vite 7, Tailwind 4
- @salesforce/sdk-data — GraphQL client, createDataSDK()
- d3 (npm) — force-directed graph
- shadcn/ui — available but used sparingly; custom dark theme preferred
- No LWC wrapper — app runs natively, deployed to App Launcher

---

## Project Structure
```
force-app/main/default/uiBundles/BrokerageARC/
├── src/
│   ├── main.jsx                  # Entry point, router setup
│   ├── App.jsx                   # Root component, view toggle (graph/card)
│   ├── components/
│   │   ├── RelationshipGraph.jsx # D3 force-directed graph
│   │   ├── DetailPanel.jsx       # Right-hand detail pane, routes by node type
│   │   ├── detail/
│   │   │   ├── BrokerageDetail.jsx
│   │   │   ├── BrokerDetail.jsx
│   │   │   ├── SubmissionDetail.jsx
│   │   │   ├── ClaimDetail.jsx
│   │   │   └── MeetingDetail.jsx
│   │   └── ui/
│   │       ├── Badge.jsx
│   │       ├── Section.jsx
│   │       └── Legend.jsx
│   ├── graphql/
│   │   ├── client.js             # createDataSDK() singleton
│   │   ├── queries.js            # All GraphQL query strings (/* GraphQL */ tagged)
│   │   ├── schema.json           # Introspected org schema (git-ignored, generated)
│   │   └── __generated__/
│   │       └── queries.ts        # Codegen output — never edit manually
│   ├── hooks/
│   │   ├── useBrokerageGraph.js  # Main data hook — fetches + transforms
│   │   └── useNodeDetail.js      # Per-node detail fetch (lazy, on selection)
│   └── utils/
│       ├── graphTransform.js     # Maps GraphQL response → D3 node/link shape
│       └── format.js             # fmt(), statusColor(), etc.
├── scripts/
│   └── fetchSchema.js            # Introspects org schema via sf CLI auth
├── codegen.ts                    # graphql-codegen config
├── CLAUDE.md                     # This file
└── package.json
```

---

## Data Layer Rules
1. **Always use createDataSDK()** from @salesforce/sdk-data — never fetch() or REST directly
2. **GraphQL only** — no @wire, no Lightning Data Service, no Apex unless specified
3. **Auth is automatic** — createDataSDK() handles tokens; never pass Authorization headers
4. **recordId** comes from the Multi-Framework router (useParams or equivalent) — never hardcoded
5. All queries live in `src/graphql/queries.js` — never inline query strings in components
6. All data fetching lives in hooks under `src/hooks/` — never fetch inside components directly

---

## GraphQL Setup & Codegen

### Initial setup order (run once per environment)
1. `sf org login web --alias <sandbox-alias>`
2. `npm run graphql:schema`   — pulls schema from connected org → `src/graphql/schema.json`
3. `npm run graphql:codegen`  — generates TS types from queries.js
4. `npm run build`

### After any query change
Run: `npm run graphql:codegen`
Verify generated types appear in `src/graphql/__generated__/`

### Generated types usage
Import generated types into hooks, never write manual response types:
```typescript
import type { BrokerageGraphQuery } from '../graphql/__generated__/queries';
```

### When asked to "wire the graph to live data"
1. Confirm `graphql:schema` has been run against the target org
2. Finalise `queries.js`, then run `graphql:codegen`
3. Import generated types in `useBrokerageGraph.js`
4. Use `createDataSDK()` to execute `BROKERAGE_GRAPH_QUERY`
5. Pass response through `graphTransform()` to produce D3 node/link shape
6. Replace `GRAPH_DATA` const in `App.jsx` with hook output

### Demo org alias
Target org alias: `<add your sandbox alias here>`
Object API names are renamed FSC objects — see Object Model table above

---

## D3 Graph Data Shape
The RelationshipGraph component expects this exact shape. graphTransform.js must
always produce this output regardless of GraphQL response changes:

```javascript
{
  nodes: [
    {
      id: String,           // Salesforce record Id
      type: String,         // 'brokerage' | 'broker' | 'submission' | 'claim' | 'meeting'
      label: String,        // Display name / reference number
      // ...type-specific fields (see NODE_FIELDS below)
    }
  ],
  links: [
    {
      source: String,       // node id
      target: String,       // node id
      label: String         // relationship label e.g. 'managed by', 'owns', 'attended'
    }
  ]
}
```

NODE_FIELDS by type:
- brokerage: tier, gwp, gwpTarget, score, aiSummary
- broker: role, lastContact, active (bool)
- submission: line, premium, status, daysOpen
- claim: claimType, status, reserve
- meeting: outcome, date, meetingType

---

## Node Colours / Config
Defined in RelationshipGraph.jsx as NODE_CONFIG. Do not change without updating Legend.jsx:
- brokerage: #7c3aed (purple)
- broker:    #3b82f6 (blue)
- submission:#f59e0b (amber)
- claim:     #ef4444 (red)
- meeting:   #10b981 (green)

---

## Error & Loading States
- Every data hook must return { data, loading, error }
- RelationshipGraph shows a pulsing skeleton of placeholder nodes during loading
- DetailPanel shows a shimmer skeleton matching the node type's layout
- Errors render an inline error card (not a toast) with a retry button
- Never render partial graph data — wait for full load or show skeleton

---

## AI Summary
- Account.AI_Summary__c is populated by an Agentforce Prompt Action — treat as read-only
- Displayed in BrokerageDetail at top of detail panel with ⚡ AI SUMMARY label
- If null/empty, show a "Generating summary..." placeholder — do not hide the block

---

## Navigation
- "Open Record" buttons use the Multi-Framework router to navigate to the Salesforce record page
- Do not use window.location or href navigation
- Import navigation from @salesforce/sdk-navigation (or equivalent SDK package)

---

## Coding Conventions
- Functional components only — no class components
- All async data calls use async/await with try/catch
- PropTypes or TypeScript interfaces on all components
- Tailwind for layout/spacing; inline styles only for D3-computed values (x, y, r)
- No hardcoded Salesforce Ids anywhere in source
- Console.log removed before deploy; use console.error for caught errors only

---

## Common Claude Code Tasks
When asked to perform these tasks, follow the approach described:

**"Wire the graph to live data"**
→ Follow the 6-step process in GraphQL Setup & Codegen above:
  confirm schema is current, run codegen, import generated types in useBrokerageGraph.js,
  call createDataSDK() with BROKERAGE_GRAPH_QUERY, pass through graphTransform(),
  replace GRAPH_DATA const in App.jsx.

**"Add loading states"**
→ Add skeleton nodes (5 placeholder circles) to RelationshipGraph during loading.
  Add shimmer blocks to DetailPanel matching the selected node type's field layout.

**"Add a new node type"**
→ Add to NODE_CONFIG, queries.js, graphTransform.js, DetailPanel routing,
  and Legend.jsx. All five files must be updated together.

**"Fix GraphQL field not found"**
→ Check the API name in the Object Model table above. Verify __c suffix for custom fields.
  Run: sf data query --query "SELECT FIELDS(ALL) FROM Account LIMIT 1" to inspect live fields.

**"Deploy to sandbox"**
→ Build from bundle dir first, then deploy from project root:
  ```bash
  cd force-app/main/default/uiBundles/BrokerageARC && npm run build
  cd <project-root>
  sf project deploy start --source-dir force-app/main/default/objects \
    --source-dir force-app/main/default/permissionsets \
    --source-dir force-app/main/default/uiBundles \
    --target-org <alias>
  ```
  Note: CustomApplication deploy is blocked by platform bug until Summer '26 R2.
  UIBundle builds directly to bundle root (not dist/) so no copy step is needed.

---

## Known Beta Limitations (as of June 2026)
- Lightning App Builder placement not supported — app runs from App Launcher only
- Production org deployment not available during beta
- Some platform APIs unavailable — check Salesforce beta docs before adding new SDK imports
- graphqlClient.ts line 13 may need manual fix post-scaffold (known beta bug — see Salesforce
  developer blog April 2026 post for the patch)
