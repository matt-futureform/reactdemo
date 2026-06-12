import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { treeTransform } from "./utils/graphTransform";

// ─── Data ─────────────────────────────────────────────────────────────────────

const HIERARCHY = {
  id: "mga1", type: "mga", label: "Futureform MGA",
  children: [
    {
      id: "b1", type: "brokerage", label: "Meridian Risk", tier: "Strategic",
      gwp: 2840000, gwpTarget: 3200000, score: 84,
      aiSummary: "Strong commercial lines pipeline. 3 submissions pending underwriter review. Capacity expansion discussed for Q3.",
      children: [
        {
          id: "br1", type: "broker", label: "J. Hartley", role: "Senior Broker", lastContact: "2 days ago", active: true,
          children: [
            { id: "s1", type: "submission", label: "SUB-1142", line: "Property", premium: 148000, status: "Pending", daysOpen: 4 },
            { id: "s2", type: "submission", label: "SUB-1098", line: "Liability", premium: 62000, status: "Quoted", daysOpen: 11 },
            { id: "c1", type: "claim", label: "CLM-0334", claimType: "Property Damage", status: "Open", reserve: 82000 },
          ]
        },
        {
          id: "br2", type: "broker", label: "S. Reeves", role: "Account Executive", lastContact: "9 days ago", active: true,
          children: [
            { id: "s3", type: "submission", label: "SUB-1071", line: "Marine", premium: 34500, status: "Bound", daysOpen: 18 },
            { id: "c2", type: "claim", label: "CLM-0291", claimType: "Public Liability", status: "In Review", reserve: 15000 },
          ]
        },
        {
          id: "br3", type: "broker", label: "T. Whitfield", role: "Broker Assistant", lastContact: "23 days ago", active: false,
          children: []
        },
      ]
    },
    {
      id: "b2", type: "brokerage", label: "Apex Underwriting", tier: "Preferred",
      gwp: 1620000, gwpTarget: 2000000, score: 71,
      aiSummary: "Growing casualty book. Renewal discussions due Q4. Two claims under active management.",
      children: [
        {
          id: "br4", type: "broker", label: "R. Kim", role: "Lead Broker", lastContact: "5 days ago", active: true,
          children: [
            { id: "s4", type: "submission", label: "SUB-1201", line: "Casualty", premium: 95000, status: "Pending", daysOpen: 2 },
            { id: "s5", type: "submission", label: "SUB-1188", line: "Property", premium: 210000, status: "Quoted", daysOpen: 7 },
          ]
        },
        {
          id: "br5", type: "broker", label: "D. Park", role: "Broker", lastContact: "14 days ago", active: true,
          children: [
            { id: "c3", type: "claim", label: "CLM-0401", claimType: "Casualty", status: "Open", reserve: 45000 },
          ]
        },
      ]
    },
    {
      id: "b3", type: "brokerage", label: "Sterling Lloyd", tier: "Standard",
      gwp: 880000, gwpTarget: 1200000, score: 58,
      aiSummary: "Below target GWP. Limited recent activity — consider relationship review.",
      children: [
        {
          id: "br6", type: "broker", label: "M. Ellis", role: "Senior Broker", lastContact: "31 days ago", active: true,
          children: [
            { id: "s6", type: "submission", label: "SUB-1155", line: "Marine", premium: 55000, status: "Bound", daysOpen: 22 },
            { id: "c4", type: "claim", label: "CLM-0378", claimType: "Marine Cargo", status: "In Review", reserve: 120000 },
          ]
        },
      ]
    },
  ]
};

const NODE_CONFIG = {
  mga:        { color: "#a855f7", bg: "#1a0a2e", w: 120, h: 44, icon: "🏛" },
  brokerage:  { color: "#7c3aed", bg: "#1e1035", w: 110, h: 40, icon: "🏢" },
  broker:     { color: "#3b82f6", bg: "#0f1f3d", w: 100, h: 36, icon: "👤" },
  submission: { color: "#f59e0b", bg: "#1c1200", w: 90,  h: 32, icon: "📋" },
  claim:      { color: "#ef4444", bg: "#1c0a0a", w: 90,  h: 32, icon: "⚠️" },
  meeting:    { color: "#10b981", bg: "#001a0f", w: 90,  h: 32, icon: "🗓" },
};

const STATUS_COLOR = {
  Pending: "#f59e0b", Quoted: "#3b82f6", Bound: "#10b981",
  Open: "#ef4444", "In Review": "#f59e0b",
};

const TIER_COLOR = { Strategic: "#7c3aed", Preferred: "#3b82f6", Standard: "#64748b" };

const fmt = n => n >= 1_000_000 ? `£${(n / 1_000_000).toFixed(2)}m` : `£${(n / 1_000).toFixed(0)}k`;

// ─── UI Atoms ─────────────────────────────────────────────────────────────────

const Badge = ({ label, color }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600, fontFamily: "monospace",
  }}>{label}</span>
);

const Field = ({ label, value, mono, color }) => (
  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px" }}>
    <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color: color || "#e2e8f0", fontFamily: mono ? "monospace" : "inherit" }}>{value}</div>
  </div>
);

const Section = ({ title, accent, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", width: "100%", padding: "4px 0", marginBottom: open ? 6 : 0 }}>
        <span style={{ width: 3, height: 12, borderRadius: 2, background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#64748b", textTransform: "uppercase", flex: 1, textAlign: "left" }}>{title}</span>
        <span style={{ fontSize: 9, color: "#475569", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▲</span>
      </button>
      {open && children}
    </div>
  );
};

// ─── Detail Panels ────────────────────────────────────────────────────────────

function MGADetail() {
  const brokerages = HIERARCHY.children;
  const totalGWP = brokerages.reduce((s, b) => s + b.gwp, 0);
  const totalBrokers = brokerages.reduce((s, b) => s + b.children.length, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Field label="Total GWP" value={fmt(totalGWP)} mono color="#a78bfa" />
        <Field label="Brokerages" value={brokerages.length} mono color="#a78bfa" />
        <Field label="Total Brokers" value={totalBrokers} mono color="#60a5fa" />
        <Field label="Avg Score" value={Math.round(brokerages.reduce((s, b) => s + b.score, 0) / brokerages.length)} mono color="#34d399" />
      </div>
      <Section title="Portfolio" accent="#a855f7">
        {brokerages.map(b => {
          const pct = Math.round((b.gwp / b.gwpTarget) * 100);
          return (
            <div key={b.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 11px", marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{b.label}</span>
                <Badge label={b.tier} color={TIER_COLOR[b.tier]} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>GWP</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: pct >= 85 ? "#10b981" : "#f59e0b" }}>{pct}% · {fmt(b.gwp)}</span>
              </div>
              <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct >= 85 ? "#10b981" : "#f59e0b", borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function BrokerageDetail({ node }) {
  const pct = Math.round((node.gwp / node.gwpTarget) * 100);
  const allChildren = [...(node.children || []), ...(node._children || [])];
  const brokers = allChildren.filter(c => c.type === "broker");
  // Support flat children (live data) and nested-under-broker (static demo data)
  const submissions = [
    ...allChildren.filter(c => c.type === "submission"),
    ...brokers.flatMap(b => [...(b.children || []), ...(b._children || [])].filter(c => c.type === "submission")),
  ];
  const claims = [
    ...allChildren.filter(c => c.type === "claim"),
    ...brokers.flatMap(b => [...(b.children || []), ...(b._children || [])].filter(c => c.type === "claim")),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>GWP vs Target</span>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>{fmt(node.gwp)} / {fmt(node.gwpTarget)} · <span style={{ color: pct >= 85 ? "#10b981" : "#f59e0b" }}>{pct}%</span></span>
        </div>
        <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct >= 85 ? "linear-gradient(90deg,#059669,#10b981)" : "linear-gradient(90deg,#d97706,#f59e0b)", borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderLeft: "3px solid #3b82f6", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 5 }}>⚡ AI SUMMARY</div>
        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{node.aiSummary}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        {[
          { label: "Brokers", val: brokers.length, color: "#a78bfa" },
          { label: "Submissions", val: submissions.length, color: "#60a5fa" },
          { label: "Claims", val: claims.length, color: "#f87171" },
        ].map(s => (
          <div key={s.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.val}</div>
            <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <Section title="Brokers" accent="#a78bfa">
        {brokers.map(b => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: b.active ? "#1e3a5f" : "#1a1f2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: b.active ? "#60a5fa" : "#475569" }}>
              {b.label.replace(".", "").split(" ").map(x => x[0]).join("")}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: b.active ? "#e2e8f0" : "#475569" }}>{b.label}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{b.role}</div>
            </div>
            <div style={{ fontSize: 11, color: "#475569" }}>{b.lastContact}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function BrokerDetail({ node }) {
  const subs = (node.children || []).filter(c => c.type === "submission");
  const claims = (node.children || []).filter(c => c.type === "claim");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: node.active ? "#1e3a5f" : "#1a1f2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: node.active ? "#60a5fa" : "#475569" }}>
          {node.label.replace(".", "").split(" ").map(x => x[0]).join("")}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{node.label}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{node.role}</div>
        </div>
        <Badge label={node.active ? "Active" : "Inactive"} color={node.active ? "#10b981" : "#6b7280"} />
      </div>
      <Field label="Last Contact" value={node.lastContact} />
      {subs.length > 0 && (
        <Section title="Submissions" accent="#f59e0b">
          {subs.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
              <div>
                <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{s.line}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <Badge label={s.status} color={STATUS_COLOR[s.status]} />
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#e2e8f0" }}>{fmt(s.premium)}</span>
              </div>
            </div>
          ))}
        </Section>
      )}
      {claims.length > 0 && (
        <Section title="Claims" accent="#ef4444">
          {claims.map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
              <div>
                <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{c.claimType}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Reserve</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", fontFamily: "monospace" }}>{fmt(c.reserve)}</div>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function SubmissionDetail({ node }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{node.label}</span>
        <Badge label={node.status} color={STATUS_COLOR[node.status]} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Field label="Line" value={node.line} />
        <Field label="Premium" value={fmt(node.premium)} mono color="#f59e0b" />
        <Field label="Days Open" value={`${node.daysOpen} days`} mono />
        <Field label="Status" value={node.status} />
      </div>
    </div>
  );
}

function ClaimDetail({ node }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{node.label}</span>
        <Badge label={node.status} color={STATUS_COLOR[node.status] || "#6b7280"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Field label="Type" value={node.claimType} />
        <Field label="Reserve" value={fmt(node.reserve)} mono color="#f87171" />
      </div>
    </div>
  );
}

function MeetingDetail({ node }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#475569" }}>{node.date}</span>
        <Badge label={node.meetingType} color="#10b981" />
      </div>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderLeft: "3px solid #10b981", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 5 }}>OUTCOME</div>
        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{node.outcome || "—"}</p>
      </div>
    </div>
  );
}

// ─── Detail Panel Shell ───────────────────────────────────────────────────────

function DetailPanel({ node, onClose }) {
  if (!node) return null;
  const cfg = NODE_CONFIG[node.type];
  const Content = {
    mga: MGADetail,
    brokerage: BrokerageDetail,
    broker: BrokerDetail,
    submission: SubmissionDetail,
    claim: ClaimDetail,
    meeting: MeetingDetail,
  }[node.type];

  return (
    <div style={{ width: 320, flexShrink: 0, background: "#0d1424", borderLeft: "1px solid #1e293b", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, border: `2px solid ${cfg.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
          {cfg.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.label}</div>
          <div style={{ fontSize: 10, color: "#475569", textTransform: "capitalize" }}>{node.type}</div>
        </div>
        <button onClick={onClose} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "3px 8px", color: "#64748b", fontSize: 11, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {Content && <Content node={node} />}
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {["Log Activity", "Open Record"].map((label, i) => (
            <button key={label} style={{
              flex: 1, padding: "7px 0", borderRadius: 8,
              border: i === 1 ? "none" : "1px solid #1e293b",
              background: i === 1 ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : "#0f172a",
              color: i === 1 ? "#fff" : "#64748b",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tree Graph ───────────────────────────────────────────────────────────────

function TreeGraph({ hierarchyData, onSelectNode, selectedId }) {
  const svgRef = useRef(null);
  const rootDataRef = useRef(null);
  const drawRef = useRef(null);

  const draw = useCallback(() => {
    const el = svgRef.current;
    if (!el) return;

    const NODE_W = 130;
    const NODE_H = 46;
    const H_GAP = 30;
    const V_GAP = 70;

    const svg = d3.select(el);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    defs.append("filter").attr("id", "tglow").html(`
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    `);

    const W = el.clientWidth || 900;
    const H = el.clientHeight || 600;

    const zoom = d3.zoom().scaleExtent([0.2, 2]).on("zoom", e => g.attr("transform", e.transform));
    svg.call(zoom);

    const g = svg.append("g");

    const root = d3.hierarchy(rootDataRef.current, d => d._children ? null : d.children);

    const treeLayout = d3.tree()
      .nodeSize([NODE_W + H_GAP, NODE_H + V_GAP])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.4);

    treeLayout(root);

    const initialX = W / 2 - root.x;
    const initialY = 60;
    g.attr("transform", `translate(${initialX},${initialY})`);

    g.append("g").selectAll("path")
      .data(root.links())
      .enter().append("path")
      .attr("fill", "none")
      .attr("stroke", d => (NODE_CONFIG[d.target.data.type]?.color || "#334155") + "44")
      .attr("stroke-width", 1.5)
      .attr("d", d => {
        const sx = d.source.x, sy = d.source.y + NODE_H / 2;
        const tx = d.target.x, ty = d.target.y - NODE_H / 2;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
      });

    const node = g.append("g").selectAll("g")
      .data(root.descendants())
      .enter().append("g")
      .attr("transform", d => `translate(${d.x - NODE_W / 2},${d.y - NODE_H / 2})`)
      .style("cursor", "pointer")
      .on("click", (e, d) => {
        e.stopPropagation();
        onSelectNode(d.data);
      });

    node.append("rect")
      .attr("width", NODE_W)
      .attr("height", NODE_H)
      .attr("rx", 10)
      .attr("fill", d => NODE_CONFIG[d.data.type]?.bg || "#0f172a")
      .attr("stroke", d => d.data.id === selectedId ? "#fff" : (NODE_CONFIG[d.data.type]?.color || "#334155"))
      .attr("stroke-width", d => d.data.id === selectedId ? 2.5 : 1.5)
      .attr("filter", "url(#tglow)");

    node.filter(d => d.data.type === "brokerage").each(function (d) {
      const pct = Math.min(d.data.gwp / d.data.gwpTarget, 1);
      const barW = NODE_W - 16;
      const sel = d3.select(this);
      sel.append("rect").attr("x", 8).attr("y", NODE_H - 8).attr("width", barW).attr("height", 4).attr("rx", 2).attr("fill", "#1e293b");
      sel.append("rect").attr("x", 8).attr("y", NODE_H - 8).attr("width", barW * pct).attr("height", 4).attr("rx", 2).attr("fill", pct >= 0.85 ? "#10b981" : "#f59e0b");
    });

    node.append("text")
      .attr("x", 12)
      .attr("y", NODE_H / 2)
      .attr("dominant-baseline", "central")
      .attr("font-size", 14)
      .text(d => NODE_CONFIG[d.data.type]?.icon || "●");

    node.append("text")
      .attr("x", 30)
      .attr("y", d => d.data.type === "brokerage" ? NODE_H / 2 - 6 : NODE_H / 2)
      .attr("dominant-baseline", "central")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("font-family", "monospace")
      .text(d => d.data.label.length > 13 ? d.data.label.slice(0, 12) + "…" : d.data.label);

    node.filter(d => ["broker", "submission", "claim", "meeting"].includes(d.data.type))
      .append("text")
      .attr("x", 30)
      .attr("y", NODE_H / 2 + 10)
      .attr("dominant-baseline", "central")
      .attr("fill", "#64748b")
      .attr("font-size", 9)
      .text(d => {
        if (d.data.type === "broker") return d.data.role?.split(" ")[0] || "";
        if (d.data.type === "submission") return `${d.data.line} · ${d.data.status}`;
        if (d.data.type === "claim") return d.data.status;
        if (d.data.type === "meeting") return d.data.date || d.data.meetingType || "";
        return "";
      });

    node.filter(d => d.data.type === "brokerage")
      .append("text")
      .attr("x", 30)
      .attr("y", NODE_H / 2 + 8)
      .attr("dominant-baseline", "central")
      .attr("font-size", 9)
      .attr("fill", d => {
        const pct = d.data.gwp / d.data.gwpTarget;
        return pct >= 0.85 ? "#10b981" : "#f59e0b";
      })
      .text(d => `${Math.round(d.data.gwp / d.data.gwpTarget * 100)}% GWP`);

    const toggleNode = (e, d) => {
      e.stopPropagation();
      if (d.data.children?.length > 0) {
        d.data._children = d.data.children;
        d.data.children = null;
      } else if (d.data._children?.length > 0) {
        d.data.children = d.data._children;
        d.data._children = null;
      }
      draw();
    };

    node.filter(d => d.data._children?.length > 0 || d.data.children?.length > 0)
      .append("circle")
      .attr("cx", NODE_W - 10)
      .attr("cy", NODE_H / 2)
      .attr("r", 8)
      .attr("fill", "#0f172a")
      .attr("stroke", d => NODE_CONFIG[d.data.type]?.color || "#334155")
      .attr("stroke-width", 1.5)
      .on("click", toggleNode);

    node.filter(d => d.data._children?.length > 0 || d.data.children?.length > 0)
      .append("text")
      .attr("x", NODE_W - 10)
      .attr("y", NODE_H / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("fill", d => NODE_CONFIG[d.data.type]?.color || "#94a3b8")
      .text(d => d.data._children?.length > 0 ? "+" : "−")
      .on("click", toggleNode);

    node.filter(d => ["submission", "claim"].includes(d.data.type))
      .append("circle")
      .attr("cx", NODE_W - 12)
      .attr("cy", 10)
      .attr("r", 4)
      .attr("fill", d => STATUS_COLOR[d.data.status] || "#6b7280");

  }, [selectedId, onSelectNode]);

  // Keep drawRef pointing to the latest draw closure so the init effect can call it
  // without listing draw as a dependency (which would re-initialize on every click).
  useEffect(() => { drawRef.current = draw; }, [draw]);

  // Re-initialize when the hierarchy data changes (new GraphQL result or static fallback swap)
  useEffect(() => {
    if (!hierarchyData) return;
    const collapseDeep = (node, depth) => {
      if (depth > 1 && node.children?.length > 0) {
        node._children = node.children;
        node.children = null;
      }
      const kids = node.children || node._children || [];
      kids.forEach(c => collapseDeep(c, depth + 1));
    };
    const data = JSON.parse(JSON.stringify(hierarchyData));
    collapseDeep(data, 0);
    rootDataRef.current = data;
    drawRef.current?.();
  }, [hierarchyData]);

  // Redraw when selectedId changes (updates the highlight ring without resetting state)
  useEffect(() => {
    if (rootDataRef.current) draw();
  }, [draw]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}

// ─── Named export — body only, for embedding in the main app ──────────────────

function TreeSkeleton() {
  const nodes = [
    { cx: "50%", cy: "15%", r: 22 },
    { cx: "25%", cy: "45%", r: 16 },
    { cx: "50%", cy: "45%", r: 16 },
    { cx: "75%", cy: "45%", r: 16 },
    { cx: "20%", cy: "72%", r: 12 },
    { cx: "30%", cy: "72%", r: 12 },
    { cx: "70%", cy: "72%", r: 12 },
  ];
  return (
    <svg style={{ width: "100%", height: "100%", display: "block" }}>
      {nodes.map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill="#1e293b" stroke="#334155" strokeWidth={1.5}>
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
        </circle>
      ))}
    </svg>
  );
}

function TreeErrorCard({ error }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: 24 }}>
      <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 10, padding: "16px 20px", maxWidth: 400 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>Failed to load tree data</div>
        <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", wordBreak: "break-all" }}>
          {error?.message ?? "Unknown error"}
        </div>
      </div>
    </div>
  );
}

export function BrokerageArcTree({ graphData, loading, error }) {
  const [selected, setSelected] = useState(null);
  // Use live GraphQL data if available, otherwise fall back to static demo hierarchy
  const hierarchyData = graphData ? treeTransform(graphData) : HIERARCHY;

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <TreeSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <TreeErrorCard error={error} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", bottom: 10, left: 12, zIndex: 10, fontSize: 10, color: "#1e293b" }}>
          Scroll to zoom · Drag to pan · Click +/− to expand
        </div>
        <TreeGraph hierarchyData={hierarchyData} onSelectNode={setSelected} selectedId={selected?.id} />
      </div>
      {selected && <DetailPanel node={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── Default export — standalone full-screen app ──────────────────────────────

export default function App() {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ height: "100vh", background: "#080d18", display: "flex", flexDirection: "column", fontFamily: "'DM Sans','Segoe UI',sans-serif", overflow: "hidden" }}>
      <div style={{ padding: "10px 18px", background: "#0b1120", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#a855f7,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏛</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Futureform MGA</div>
          <div style={{ fontSize: 10, color: "#475569" }}>Brokerage Relationship Hierarchy</div>
        </div>
      </div>
      <BrokerageArcTree />
    </div>
  );
}
