/**
 * Pulls the GraphQL schema from the connected Salesforce org via introspection
 * and writes it to src/graphql/schema.json for use by graphql-codegen.
 *
 * Requires an active sf CLI session: sf org login web --alias <sandbox-alias>
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const API_VERSION = '62.0';

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args { ...InputValue }
      }
    }
  }

  fragment FullType on __Type {
    kind name description
    fields(includeDeprecated: true) {
      name description
      args { ...InputValue }
      type { ...TypeRef }
      isDeprecated deprecationReason
    }
    inputFields { ...InputValue }
    interfaces { ...TypeRef }
    enumValues(includeDeprecated: true) {
      name description isDeprecated deprecationReason
    }
    possibleTypes { ...TypeRef }
  }

  fragment InputValue on __InputValue {
    name description
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind name
    ofType {
      kind name
      ofType {
        kind name
        ofType {
          kind name
          ofType {
            kind name
            ofType { kind name ofType { kind name ofType { kind name } } }
          }
        }
      }
    }
  }
`;

let orgInfo;
try {
  const raw = execSync('sf org display --json 2>/dev/null', { encoding: 'utf8' });
  orgInfo = JSON.parse(raw).result;
} catch {
  console.error('No active org session. Run: sf org login web --alias <sandbox-alias>');
  process.exit(1);
}

const { accessToken, instanceUrl } = orgInfo;
const endpoint = `${instanceUrl}/services/data/v${API_VERSION}/graphql`;

console.log(`Fetching schema from ${endpoint} ...`);

const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: INTROSPECTION_QUERY }),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const json = await res.json();

if (json.errors) {
  console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
  process.exit(1);
}

mkdirSync('src/graphql', { recursive: true });
writeFileSync('src/graphql/schema.json', JSON.stringify(json.data, null, 2));
console.log('Schema saved to src/graphql/schema.json');
