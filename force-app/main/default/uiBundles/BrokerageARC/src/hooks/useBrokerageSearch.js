import { useState, useEffect } from 'react';
import { executeGraphQL } from '../graphql/client';
import { BROKERAGE_SEARCH_QUERY } from '../graphql/queries';

export function useBrokerageSearch() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const data = await executeGraphQL(BROKERAGE_SEARCH_QUERY, { term: `%${trimmed}%` });
        if (!cancelled) {
          const edges = data?.uiapi?.query?.Account?.edges ?? [];
          setResults(edges.map(e => ({
            id: e.node.Id,
            name: e.node.Name?.value ?? '',
            tier: e.node.Tier__c?.value ?? null,
            gwp: e.node.GWP__c?.value ?? null,
            score: e.node.Relationship_Score__c?.value ?? null,
          })));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('useBrokerageSearch: query failed', err);
          setError(err);
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  return { term, setTerm, results, loading, error };
}
