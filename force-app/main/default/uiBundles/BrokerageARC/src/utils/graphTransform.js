function formatDaysAgo(isoDate) {
  if (!isoDate) return null;
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function graphTransform(responseData) {
  const q = responseData?.uiapi?.query;
  if (!q) return { nodes: [], links: [] };

  const nodes = [];
  const links = [];
  const nodeIds = new Set();

  const account = q.Account?.edges?.[0]?.node;
  if (!account) return { nodes: [], links: [] };

  const brokerageId = account.Id;

  nodes.push({
    id: brokerageId,
    type: 'brokerage',
    label: account.Name?.value ?? '',
    tier: account.Tier__c?.value ?? null,
    gwp: account.GWP__c?.value ?? 0,
    gwpTarget: account.GWP_Target__c?.value ?? 0,
    score: account.Relationship_Score__c?.value ?? 0,
    aiSummary: account.AI_Summary__c?.value ?? null,
  });
  nodeIds.add(brokerageId);

  const parent = account.Parent;
  if (parent?.Id) {
    nodes.push({
      id: parent.Id,
      type: 'brokerage',
      label: parent.Name?.value ?? '',
      tier: parent.Tier__c?.value ?? null,
      gwp: parent.GWP__c?.value ?? 0,
      gwpTarget: parent.GWP_Target__c?.value ?? 0,
      score: parent.Relationship_Score__c?.value ?? 0,
      aiSummary: parent.AI_Summary__c?.value ?? null,
      isParent: true,
    });
    nodeIds.add(parent.Id);
    links.push({ source: parent.Id, target: brokerageId, label: 'subsidiary of' });
  }

  for (const { node: n } of account.ChildAccounts?.edges ?? []) {
    if (!nodeIds.has(n.Id)) {
      nodes.push({
        id: n.Id,
        type: 'brokerage',
        label: n.Name?.value ?? '',
        tier: n.Tier__c?.value ?? null,
        gwp: n.GWP__c?.value ?? 0,
        gwpTarget: n.GWP_Target__c?.value ?? 0,
        score: n.Relationship_Score__c?.value ?? 0,
        aiSummary: n.AI_Summary__c?.value ?? null,
        isChild: true,
      });
      nodeIds.add(n.Id);
      links.push({ source: brokerageId, target: n.Id, label: 'subsidiary of' });
    }
  }

  // Child brokerage brokers — queried at root level (Salesforce GraphQL forbids nested child relationships)
  for (const { node: n } of q.Contact?.edges ?? []) {
    const childId = n.Account?.Id;
    if (!childId || !nodeIds.has(childId) || nodeIds.has(n.Id)) continue;
    nodes.push({
      id: n.Id,
      type: 'broker',
      label: n.Name?.value ?? '',
      role: n.Title?.value ?? '',
      lastContact: formatDaysAgo(n.LastActivityDate?.value),
      active: n.Active__c?.value ?? true,
    });
    nodeIds.add(n.Id);
    links.push({ source: childId, target: n.Id, label: 'managed by' });
  }

  // Child brokerage submissions
  for (const { node: n } of q.Opportunity?.edges ?? []) {
    const childId = n.Account?.Id;
    if (!childId || !nodeIds.has(childId) || nodeIds.has(n.Id)) continue;
    nodes.push({
      id: n.Id,
      type: 'submission',
      label: n.Name?.value ?? '',
      line: n.Line_of_Business__c?.value ?? '',
      premium: n.Amount?.value ?? 0,
      status: n.StageName?.value ?? '',
      daysOpen: Math.round(n.Days_Open__c?.value ?? 0),
    });
    nodeIds.add(n.Id);
    links.push({ source: childId, target: n.Id, label: 'submission' });
  }

  // Child brokerage claims
  for (const { node: n } of q.Case?.edges ?? []) {
    const childId = n.Account?.Id;
    if (!childId || !nodeIds.has(childId) || nodeIds.has(n.Id)) continue;
    nodes.push({
      id: n.Id,
      type: 'claim',
      label: n.CaseNumber?.value ?? n.Id,
      claimType: n.Type?.value ?? '',
      status: n.Status?.value ?? '',
      reserve: n.Reserve__c?.value ?? 0,
    });
    nodeIds.add(n.Id);
    links.push({ source: childId, target: n.Id, label: 'claim' });
  }

  for (const { node: n } of account.Contacts?.edges ?? []) {
    nodes.push({
      id: n.Id,
      type: 'broker',
      label: n.Name?.value ?? '',
      role: n.Title?.value ?? '',
      lastContact: formatDaysAgo(n.LastActivityDate?.value),
      active: n.Active__c?.value ?? true,
    });
    nodeIds.add(n.Id);
    links.push({ source: brokerageId, target: n.Id, label: 'managed by' });
  }

  for (const { node: n } of account.Opportunities?.edges ?? []) {
    nodes.push({
      id: n.Id,
      type: 'submission',
      label: n.Name?.value ?? '',
      line: n.Line_of_Business__c?.value ?? '',
      premium: n.Amount?.value ?? 0,
      status: n.StageName?.value ?? '',
      daysOpen: Math.round(n.Days_Open__c?.value ?? 0),
    });
    nodeIds.add(n.Id);
    links.push({ source: brokerageId, target: n.Id, label: 'submission' });
  }

  for (const { node: n } of account.Cases?.edges ?? []) {
    nodes.push({
      id: n.Id,
      type: 'claim',
      label: n.CaseNumber?.value ?? n.Id,
      claimType: n.Type?.value ?? '',
      status: n.Status?.value ?? '',
      reserve: n.Reserve__c?.value ?? 0,
    });
    nodeIds.add(n.Id);
    links.push({ source: brokerageId, target: n.Id, label: 'claim' });
  }

  for (const { node: n } of q.Task?.edges ?? []) {
    nodes.push({
      id: n.Id,
      type: 'meeting',
      label: n.Subject?.value ?? '',
      outcome: n.Description?.value ?? '',
      date: formatDate(n.ActivityDate?.value),
      meetingType: n.TaskSubtype?.value ?? 'Meeting',
    });
    nodeIds.add(n.Id);
    links.push({ source: brokerageId, target: n.Id, label: 'meeting' });

    // attended link — Who is a Contact (broker)
    const whoId = n.Who?.Id;
    if (whoId && nodeIds.has(whoId)) {
      links.push({ source: whoId, target: n.Id, label: 'attended' });
    }
  }

  return { nodes, links };
}

// Converts the flat { nodes, links } shape into the nested hierarchy TreeGraph expects.
// Uses the links graph to build the hierarchy so child brokerage subtrees are preserved.
export function treeTransform(graphData) {
  if (!graphData?.nodes?.length) return null;

  const root = graphData.nodes.find(n => n.type === 'brokerage' && !n.isParent && !n.isChild);
  if (!root) return null;

  const nodeById = Object.fromEntries(graphData.nodes.map(n => [n.id, n]));

  // Return non-brokerage nodes that link from parentId (excludes the subsidiary-of hierarchy links)
  const getDirectChildren = (parentId) =>
    graphData.links
      .filter(l => (l.source?.id ?? l.source) === parentId && l.label !== 'subsidiary of')
      .map(l => nodeById[l.target?.id ?? l.target])
      .filter(Boolean)
      .map(n => ({ ...n, children: [] }));

  const childBrokerages = graphData.nodes.filter(n => n.type === 'brokerage' && n.isChild);

  return {
    ...root,
    children: [
      // Child brokerages come first, each with their own brokers/submissions/claims below them
      ...childBrokerages.map(child => ({
        ...child,
        children: getDirectChildren(child.id),
      })),
      // Root brokerage's own brokers, submissions, claims, meetings
      ...getDirectChildren(root.id),
    ],
  };
}
