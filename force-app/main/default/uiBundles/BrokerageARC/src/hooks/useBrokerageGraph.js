import { useState, useEffect } from 'react';
import { executeGraphQL } from '../graphql/client';
import { BROKERAGE_GRAPH_QUERY } from '../graphql/queries';
import { graphTransform } from '../utils/graphTransform';

export function useBrokerageGraph(recordId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!recordId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const responseData = await executeGraphQL(BROKERAGE_GRAPH_QUERY, { brokerageId: recordId });
        if (!cancelled) {
          setData(graphTransform(responseData));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('useBrokerageGraph: query failed', err);
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
