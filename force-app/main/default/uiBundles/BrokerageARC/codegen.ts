import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/graphql/schema.json',
  documents: ['src/graphql/queries.js'],
  generates: {
    'src/graphql/__generated__/queries.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        avoidOptionals: true,
        nonOptionalTypename: true,
      },
    },
  },
};

export default config;
