import { createDataSDK } from '@salesforce/sdk-data';

export async function executeGraphQL(query, variables) {
  const sdk = await createDataSDK();
  const response = await sdk.graphql({ query, variables });
  if (!response) {
    throw new Error('GraphQL response is undefined');
  }
  if (response.errors?.length) {
    throw new Error(response.errors.map(e => e.message).join('; '));
  }
  return response.data;
}
