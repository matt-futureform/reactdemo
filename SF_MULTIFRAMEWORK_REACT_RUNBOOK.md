# Salesforce Multi-Framework React — Build Runbook
_Lessons learned building BrokerageARC on Salesforce Multi-Framework (Beta), June 2026_

Use this as a checklist when starting a new project. Everything here was discovered the hard
way — following it avoids the pitfalls that cost hours.

---

## 1. Scratch Org Setup

### project-scratch-def.json
Multi-Framework is **not** a `features` value. Enable it via `settings`:

```json
{
  "orgName": "My Org",
  "edition": "developer",
  "features": ["EnableSetPasswordInApi"],
  "settings": {
    "lightningExperienceSettings": { "enableS1DesktopEnabled": true },
    "UIBundleSettings": { "webAppOptIn": true },
    "mobileSettings": { "enableS1EncryptedStoragePref2": false }
  }
}
```

`MultiFrameworkReact` is **not** a valid feature flag — adding it causes org creation to fail.

### sfdx-project.json
Must be API version **67.0** or higher. The `CustomApplication.uiBundle` property was
introduced in v67 — deploying at v66 fails silently or errors on the field.

```json
{
  "sourceApiVersion": "67.0"
}
```

---

## 2. Project Scaffold

### ui-bundle.json — must have `name` and `dev`

Without `name`, `sf ui-bundle dev --name <BundleName>` won't match the bundle and will
discover whatever other `ui-bundle.json` files it finds on the filesystem (including other
projects in parent directories). Without `dev.command`, you must run Vite separately.

```json
{
  "name": "YourBundleName",
  "outputDir": "dist",
  "routing": {
    "trailingSlash": "never",
    "fallback": "index.html"
  },
  "dev": {
    "command": "npm run dev"
  }
}
```

### Run the dev server
Always run from the **bundle directory** (not project root, not a parent directory) to avoid
the CLI discovering other bundles:

```bash
cd force-app/main/default/uiBundles/YourBundleName
sf ui-bundle dev --target-org <alias> --port 4545
```

The `dev.command` starts Vite automatically — no separate terminal needed.

### Pass recordId in local dev
The platform injects `SFDC_ENV.recordId` in production. Locally, pass it via query param:

```
http://localhost:4545/?recordId=<SalesforceRecordId>
```

In `main.jsx`:
```javascript
const sfdcEnv = globalThis.SFDC_ENV ?? {};
const params = new URLSearchParams(window.location.search);
const recordId = sfdcEnv.recordId ?? params.get('recordId') ?? null;
```

---

## 3. App Launcher — CustomApplication Required (Post Summer '26)

As of API v67 / Summer '26 release 262.8+, a UI bundle **will not appear in App Launcher**
unless it has a linked `CustomApplication` with a `<uiBundle>` property.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomApplication xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Your App Label</label>
    <uiBundle>c__YourBundleName</uiBundle>
    <uiType>Lightning</uiType>
    <navType>Standard</navType>
    <formFactors>Large</formFactors>
    <formFactors>Small</formFactors>
    <isNavAutoTempTabsDisabled>false</isNavAutoTempTabsDisabled>
    <isNavPersonalizationDisabled>false</isNavPersonalizationDisabled>
    <isNavTabPersistenceDisabled>false</isNavTabPersistenceDisabled>
    <isOmniPinnedViewEnabled>false</isOmniPinnedViewEnabled>
</CustomApplication>
```

The syntax is `c__<BundleName>` — prefix `c__` is required.

**During local dev** use `sf ui-bundle dev` instead — this bypasses App Launcher entirely
and works regardless of whether the CustomApplication is deployed.

---

## 4. GraphQL Data Layer — Critical API Rules

### createDataSDK() returns a Promise — always await it

```javascript
// WRONG — client is a Promise, not the SDK
const sdk = createDataSDK();
await sdk.graphql(...); // TypeError: sdk.graphql is not a function

// CORRECT
const sdk = await createDataSDK();
await sdk.graphql(...);
```

### graphql() takes a single object — not two arguments

```javascript
// WRONG
await sdk.graphql(QUERY, { myVar: value });

// CORRECT
await sdk.graphql({ query: QUERY, variables: { myVar: value } });
```

### Do NOT use the gql tag

The `gql` tag from `@salesforce/sdk-data` returns a DocumentNode (parsed AST object).
`sdk.graphql()` serialises the query with `JSON.stringify` — a DocumentNode becomes `{}`
and the server returns `INVALID_INPUT_COMBINATION: Must provide a Query`.

Use plain template string literals:

```javascript
// WRONG
import { gql } from '@salesforce/sdk-data';
export const MY_QUERY = gql`query { ... }`;

// CORRECT
export const MY_QUERY = `query { ... }`;
```

### Recommended client wrapper

```javascript
// graphql/client.js
import { createDataSDK } from '@salesforce/sdk-data';

export async function executeGraphQL(query, variables) {
  const sdk = await createDataSDK();
  const response = await sdk.graphql({ query, variables });
  if (!response) throw new Error('GraphQL response is undefined');
  if (response.errors?.length) {
    throw new Error(response.errors.map(e => e.message).join('; '));
  }
  return response.data;
}
```

---

## 5. UIAPI GraphQL — Field Syntax Rules

Every field value is a **wrapped type**, not a raw scalar. Always select `{ value }`:

```graphql
# WRONG
Account { Name }

# CORRECT
Account { Name { value } }
```

This applies to: `Name`, `Title`, `Email`, `Phone`, `Status`, `StageName`, `Amount`,
`CaseNumber`, and all custom fields (`Tier__c { value }`, etc.).

### IDs are bare — no { value } needed

```graphql
# Correct — Id is a raw string, not a wrapped type
Account { Id }
```

### Relationship fields are UNION types — use inline fragments

`Owner`, `Who`, `What`, `CreatedBy` are polymorphic. Selecting fields directly fails:

```graphql
# WRONG — "Field 'Name' in type 'Task_Owner' is undefined"
Owner { Id Name { value } }

# CORRECT
Owner {
  ... on User { Id Name { value } }
  ... on Group { Id Name { value } }
}

# Task.Who (Contact | Lead)
Who {
  ... on Contact { Id Name { value } }
}

# Task.What (Account | Opportunity | Case | ...)
What {
  ... on Account { Id Name { value } }
  ... on Opportunity { Id Name { value } }
}
```

### Task — Type field does not exist

`Task.Type` is not exposed in UIAPI GraphQL. Use `TaskSubtype { value }` instead.
Do not filter by `Type: { eq: "Meeting" }` in WHERE clauses — it will fail.

### IDs in WHERE clauses are bare strings

```graphql
# Correct
Account(where: { Id: { eq: $accountId } })
```

---

## 6. Custom Fields — Deployment Gotchas

### Formula fields use the return type, not "Formula"

```xml
<!-- WRONG — FieldType enum has no "Formula" value -->
<type>Formula</type>

<!-- CORRECT — use the return type, keep the <formula> element -->
<type>Number</type>
<formula>TODAY() - DATEVALUE(CreatedDate)</formula>
<formulaTreatBlanksAs>BlankAsZero</formulaTreatBlanksAs>
<precision>18</precision>
<scale>0</scale>
```

### Custom fields on Opportunity need explicit FLS even as System Admin

In scratch orgs, custom fields deployed to Opportunity are invisible in SOQL, REST describe,
and GraphQL until a Permission Set explicitly grants read access — even when logged in as
System Admin. This does not affect Account, Contact, or Case in the same way.

Always create and assign a Permission Set for your app's custom fields:

```xml
<!-- permissionsets/YourApp.permissionset-meta.xml -->
<fieldPermissions>
    <editable>true</editable>
    <field>Opportunity.YourField__c</field>
    <readable>true</readable>
</fieldPermissions>
```

Assign after deployment:
```bash
sf org assign permset --name YourApp --target-org <alias>
```

---

## 7. Navigation — Opening Salesforce Records

No `@salesforce/sdk-navigation` package is available in Multi-Framework Beta.
Use `SFDC_ENV.orgUrl` which is injected by the platform (both local proxy and production):

```javascript
function openRecord(recordId, objectApiName) {
  const base = globalThis.SFDC_ENV?.orgUrl ?? "";
  if (base) window.open(`${base}/lightning/r/${objectApiName}/${recordId}/view`, "_blank");
}
```

`MOSAIC_ENV.instanceUrl` is **not** injected by `sf ui-bundle dev` — only `SFDC_ENV` is reliable.

---

## 8. Deployment Checklist

```bash
# 1. Install dependencies
cd force-app/main/default/uiBundles/YourBundle
npm install

# 2. Build
npm run build

# 3. Deploy all metadata
cd <project-root>
sf project deploy start --target-org <alias>

# 4. Assign permission set if you have custom Opportunity fields
sf org assign permset --name YourApp --target-org <alias>

# 5. Verify fields visible
sf data query --query "SELECT YourField__c FROM Opportunity LIMIT 1" --target-org <alias>

# 6. Run local dev server
cd force-app/main/default/uiBundles/YourBundle
sf ui-bundle dev --target-org <alias> --port 4545

# 7. Test
open http://localhost:4545/?recordId=<RecordId>

# 8. Deploy CustomApplication for App Launcher (requires API v67 + platform support)
sf project deploy start --source-dir force-app/main/default/applications --target-org <alias>
```

---

## 9. Common Error Reference

| Error | Cause | Fix |
|---|---|---|
| `createDataSDK() returns a Promise` | Called without await | `const sdk = await createDataSDK()` |
| `client.query is not a function` | Used Apollo-style API | `sdk.graphql({ query, variables })` |
| `INVALID_INPUT_COMBINATION: Must provide a Query` | Used `gql` tag | Use plain string template literals |
| `Subselection required for type 'StringValue'` | Missing `{ value }` on a field | Add `{ value }` to every non-Id field |
| `Field 'Name' in type 'Task_Owner' is undefined` | Union type accessed directly | Use `... on User { Name { value } }` |
| `Field 'Type' in type 'Task' is undefined` | Task.Type doesn't exist in UIAPI | Use `TaskSubtype { value }` |
| `Property 'uiBundle' not valid in version 66.0` | Wrong sourceApiVersion | Set `"sourceApiVersion": "67.0"` in sfdx-project.json |
| `MultiFrameworkReact is not a valid Features value` | Wrong scratch def | Use `UIBundleSettings.webAppOptIn: true` in settings, not features |
| `Property 'Formula' is not a valid value for the enum 'FieldType'` | Wrong field type for formula | Use the return type (`Number`, `Currency`, etc.) + keep `<formula>` element |
| Opportunity custom fields invisible despite System Admin | FLS not granted | Create and assign a Permission Set with explicit field permissions |
| `sf ui-bundle dev` opens wrong bundle | Multiple ui-bundle.json found | Add `"name"` to ui-bundle.json and run from bundle directory |
| `(-750749931)` on CustomApplication deploy | Platform bug — June 2026 | Wait for Summer '26 R2 (~June 13); use `sf ui-bundle dev` in the meantime |

---

## 10. Data Hook Pattern

```javascript
// hooks/useMyQuery.js
import { useState, useEffect } from 'react';
import { executeGraphQL } from '../graphql/client';
import { MY_QUERY } from '../graphql/queries';
import { transformResponse } from '../utils/transform';

export function useMyQuery(recordId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!recordId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const responseData = await executeGraphQL(MY_QUERY, { recordId });
        if (!cancelled) {
          setData(transformResponse(responseData));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('useMyQuery failed', err);
          setError(err);
          setLoading(false);
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [recordId, retryCount]);

  return { data, loading, error, retry: () => setRetryCount(c => c + 1) };
}
```

Key points:
- `cancelled` flag prevents state updates on unmounted/re-rendered components
- `retryCount` in the dependency array allows forced re-fetch without changing `recordId`
- Always return `{ data, loading, error, retry }` — consistent contract across all hooks
