import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { useBrokerageGraph } from "./hooks/useBrokerageGraph";
import { useBrokerageSearch } from "./hooks/useBrokerageSearch";
import { BrokerageArcTree } from "./brokerage-arc-tree";

// ─── Config ───────────────────────────────────────────────────────────────────

const NODE_CONFIG = {
  brokerage: { color: "#7c3aed", bg: "#1e1035", radius: 32, icon: "🏢" },
  broker:    { color: "#3b82f6", bg: "#0f1f3d", radius: 22, icon: "👤" },
  submission:{ color: "#f59e0b", bg: "#1c1200", radius: 20, icon: "📋" },
  claim:     { color: "#ef4444", bg: "#1c0a0a", radius: 20, icon: "⚠️" },
  meeting:   { color: "#10b981", bg: "#001a0f", radius: 18, icon: "🗓" },
};

const STATUS_COLOR = {
  Pending: "#f59e0b", Quoted: "#3b82f6", Bound: "#10b981",
  Open: "#ef4444", "In Review": "#f59e0b",
};

const fmt = n => n >= 1_000_000 ? `£${(n/1_000_000).toFixed(2)}m` : `£${(n/1_000).toFixed(0)}k`;

// ─── Detail Panel ─────────────────────────────────────────────────────────────

const Badge = ({ label, color }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.04em", fontFamily: "monospace",
  }}>{label}</span>
);

function BrokerageDetail({ node, graphData }) {
  const gwpPct = node.gwpTarget > 0 ? Math.round((node.gwp / node.gwpTarget) * 100) : 0;
  const brokers = graphData.nodes.filter(n => n.type === "broker");
  const submissions = graphData.nodes.filter(n => n.type === "submission");
  const claims = graphData.nodes.filter(n => n.type === "claim");
  const meetings = graphData.nodes.filter(n => n.type === "meeting");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* GWP */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>GWP vs Target</span>
          <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
            {fmt(node.gwp)} / {fmt(node.gwpTarget)} · <span style={{ color: gwpPct >= 85 ? "#10b981" : "#f59e0b" }}>{gwpPct}%</span>
          </span>
        </div>
        <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(gwpPct, 100)}%`, background: gwpPct >= 85 ? "linear-gradient(90deg,#059669,#10b981)" : "linear-gradient(90deg,#d97706,#f59e0b)", borderRadius: 3 }} />
        </div>
      </div>

      {/* AI Summary */}
      <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderLeft: "3px solid #3b82f6", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>⚡ AI SUMMARY</div>
        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
          {node.aiSummary ?? <span style={{ color: "#475569", fontStyle: "italic" }}>Generating summary…</span>}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
        {[
          { label: "Brokers", val: brokers.length, color: "#a78bfa" },
          { label: "Submissions", val: submissions.length, color: "#60a5fa" },
          { label: "Claims", val: claims.length, color: "#f87171" },
          { label: "Score", val: node.score, color: "#34d399" },
        ].map(s => (
          <div key={s.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.val}</div>
            <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Brokers */}
      <Section title="Brokers" accent="#a78bfa">
        {brokers.map(b => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: b.active ? "#1e3a5f" : "#1a1f2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: b.active ? "#60a5fa" : "#475569", flexShrink: 0 }}>
              {b.label.split(" ").map(x => x[0]).join("")}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: b.active ? "#e2e8f0" : "#475569" }}>{b.label}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{b.role}</div>
            </div>
            <div style={{ fontSize: 11, color: "#475569" }}>{b.lastContact}</div>
          </div>
        ))}
      </Section>

      {/* Submissions */}
      <Section title="Submissions" accent="#60a5fa">
        {submissions.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 3, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{s.label}</span>
                <Badge label={s.status} color={STATUS_COLOR[s.status] ?? "#6b7280"} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{s.line}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>{fmt(s.premium)}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{s.daysOpen}d open</div>
            </div>
          </div>
        ))}
      </Section>

      {/* Claims */}
      <Section title="Claims" accent="#f87171">
        {claims.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 3, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{c.label}</span>
                <Badge label={c.status} color={STATUS_COLOR[c.status] ?? "#6b7280"} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{c.claimType}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Reserve</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", fontFamily: "monospace" }}>{fmt(c.reserve)}</div>
            </div>
          </div>
        ))}
      </Section>

      {/* Meetings */}
      <Section title="Recent Meetings" accent="#34d399">
        {meetings.map(m => (
          <div key={m.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#475569" }}>{m.date}</span>
              <Badge label={m.meetingType} color="#34d399" />
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{m.outcome}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function BrokerDetail({ node, graphData }) {
  const ownedSubs = graphData.links
    .filter(l => l.source === node.id && l.label === "owns")
    .map(l => graphData.nodes.find(n => n.id === l.target))
    .filter(Boolean);
  const meetings = graphData.links
    .filter(l => l.source === node.id && l.label === "attended")
    .map(l => graphData.nodes.find(n => n.id === l.target))
    .filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: node.active ? "#1e3a5f" : "#1a1f2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: node.active ? "#60a5fa" : "#475569" }}>
          {node.label.split(" ").map(x => x[0]).join("")}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{node.label}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{node.role}</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Badge label={node.active ? "Active" : "Inactive"} color={node.active ? "#10b981" : "#6b7280"} />
        </div>
      </div>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Last Contact</div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>{node.lastContact ?? "—"}</div>
      </div>
      {ownedSubs.length > 0 && (
        <Section title="Owned Submissions" accent="#f59e0b">
          {ownedSubs.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
              <div>
                <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{s.line}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <Badge label={s.status} color={STATUS_COLOR[s.status] ?? "#6b7280"} />
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#e2e8f0" }}>{fmt(s.premium)}</span>
              </div>
            </div>
          ))}
        </Section>
      )}
      {meetings.length > 0 && (
        <Section title="Meetings Attended" accent="#34d399">
          {meetings.map(m => (
            <div key={m.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 3 }}>{m.date}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{m.outcome}</div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function SubmissionDetail({ node, graphData }) {
  const ownerLink = graphData.links.find(l => l.target === node.id && l.label === "owns");
  const ownerNode = ownerLink ? graphData.nodes.find(n => n.id === ownerLink.source) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{node.label}</span>
        <Badge label={node.status} color={STATUS_COLOR[node.status] ?? "#6b7280"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Line of Business", val: node.line },
          { label: "Premium", val: fmt(node.premium) },
          { label: "Days Open", val: `${node.daysOpen} days` },
          { label: "Broker", val: ownerNode?.label ?? "—" },
        ].map(f => (
          <div key={f.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace" }}>{f.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClaimDetail({ node }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{node.label}</span>
        <Badge label={node.status} color={STATUS_COLOR[node.status] ?? "#6b7280"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Claim Type", val: node.claimType },
          { label: "Reserve", val: fmt(node.reserve) },
        ].map(f => (
          <div key={f.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: f.label === "Reserve" ? "#f87171" : "#e2e8f0", fontFamily: "monospace" }}>{f.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeetingDetail({ node, graphData }) {
  const attendees = graphData.links
    .filter(l => l.target === node.id && l.label === "attended")
    .map(l => graphData.nodes.find(n => n.id === l.source))
    .filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderLeft: "3px solid #10b981", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>OUTCOME</div>
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{node.outcome || "—"}</div>
      </div>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>Date</div>
        <div style={{ fontSize: 13, color: "#e2e8f0" }}>{node.date}</div>
      </div>
      {attendees.length > 0 && (
        <Section title="Attendees" accent="#34d399">
          {attendees.map(a => (
            <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 11px", marginBottom: 5 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#60a5fa" }}>
                {a.label.split(" ").map(x => x[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{a.label}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{a.role}</div>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, accent, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", width: "100%", padding: "4px 0", marginBottom: open ? 6 : 0 }}>
        <span style={{ width: 3, height: 12, borderRadius: 2, background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#64748b", textTransform: "uppercase", flex: 1, textAlign: "left" }}>{title}</span>
        <span style={{ fontSize: 9, color: "#475569", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▲</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
        <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 6px ${cfg.color}88` }} />
          <span style={{ fontSize: 10, color: "#64748b", textTransform: "capitalize", letterSpacing: "0.04em" }}>{type}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Loading / Error states ───────────────────────────────────────────────────

function GraphSkeleton() {
  const placeholders = [
    { cx: "50%", cy: "50%", r: 32 },
    { cx: "30%", cy: "30%", r: 20 },
    { cx: "70%", cy: "30%", r: 20 },
    { cx: "28%", cy: "68%", r: 20 },
    { cx: "72%", cy: "68%", r: 20 },
  ];
  return (
    <svg style={{ width: "100%", height: "100%", display: "block" }}>
      {placeholders.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#1e293b" stroke="#334155" strokeWidth={1.5}>
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" begin={`${i * 0.25}s`} />
        </circle>
      ))}
    </svg>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[80, 120, 60, 60, 60].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 8, background: "linear-gradient(90deg,#0f172a,#1e293b,#0f172a)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

function ErrorCard({ error, onRetry }) {
  return (
    <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, margin: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>Failed to load graph data</div>
      <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", wordBreak: "break-all" }}>
        {error?.message ?? "Unknown error"}
      </div>
      <button onClick={onRetry} style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: 6, border: "1px solid #7f1d1d", background: "#2a0f0f", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
        Retry
      </button>
    </div>
  );
}

// ─── D3 Graph ─────────────────────────────────────────────────────────────────

function RelationshipGraph({ graphData, onSelectNode, selectedId }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !graphData) return;

    const W = el.clientWidth || 600;
    const H = el.clientHeight || 400;

    const nodes = graphData.nodes.map(d => ({ ...d }));
    const links = graphData.links.map(d => ({ ...d }));

    const svg = d3.select(el);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    defs.append("filter").attr("id", "glow").html(`
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    `);

    const g = svg.append("g");

    svg.call(
      d3.zoom().scaleExtent([0.3, 3]).on("zoom", e => g.attr("transform", e.transform))
    );

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => {
        if (d.source.type === "brokerage" || d.target.type === "brokerage") return 110;
        return 80;
      }).strength(0.6))
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(d => ((d.type === "brokerage" && (d.isParent || d.isChild)) ? 24 : NODE_CONFIG[d.type].radius) + 12));

    simRef.current = sim;

    const nodeRadius = d => (d.type === "brokerage" && (d.isParent || d.isChild)) ? 24 : NODE_CONFIG[d.type].radius;

    const link = g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke", d => d.label === "subsidiary of" ? "#7c3aed" : "#1e293b")
      .attr("stroke-width", d => d.label === "subsidiary of" ? 1 : 1.5)
      .attr("stroke-dasharray", d => d.label === "subsidiary of" ? "6,3" : d.label === "owns" ? "4,3" : "none")
      .attr("opacity", d => d.label === "subsidiary of" ? 0.45 : 1);

    const node = g.append("g").selectAll("g").data(nodes).enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on("click", (e, d) => { e.stopPropagation(); onSelectNode(d); });

    // Outer glow ring — centre brokerage only
    node.filter(d => d.type === "brokerage" && !d.isParent && !d.isChild).append("circle")
      .attr("r", NODE_CONFIG.brokerage.radius + 8)
      .attr("fill", "none")
      .attr("stroke", "#7c3aed")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.4);

    node.append("circle")
      .attr("r", nodeRadius)
      .attr("fill", d => NODE_CONFIG[d.type].bg)
      .attr("stroke", d => NODE_CONFIG[d.type].color)
      .attr("stroke-width", d => (d.type === "brokerage" && !d.isParent && !d.isChild) ? 2.5 : 1.5)
      .attr("stroke-dasharray", d => (d.isParent || d.isChild) ? "4,2" : "none")
      .attr("filter", "url(#glow)");

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", d => nodeRadius(d) * 0.75)
      .text(d => NODE_CONFIG[d.type].icon);

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("y", d => nodeRadius(d) + 13)
      .attr("fill", d => (d.isParent || d.isChild) ? "#64748b" : "#94a3b8")
      .attr("font-size", 9)
      .attr("font-family", "monospace")
      .text(d => d.label.length > 18 ? d.label.slice(0, 17) + "…" : d.label);

    // "click to drill" hint under parent/child brokerage nodes
    node.filter(d => d.type === "brokerage" && (d.isParent || d.isChild)).append("text")
      .attr("text-anchor", "middle")
      .attr("y", d => nodeRadius(d) + 23)
      .attr("fill", "#3b4d66")
      .attr("font-size", 8)
      .text(d => d.isParent ? "↑ parent" : "↓ subsidiary");

    node.filter(d => d.type === "broker").append("text")
      .attr("text-anchor", "middle")
      .attr("y", d => NODE_CONFIG[d.type].radius + 23)
      .attr("fill", "#475569")
      .attr("font-size", 8)
      .text(d => d.role);

    sim.on("tick", () => {
      link
        .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [graphData]);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll("circle:not([r='0'])")
      .attr("stroke-width", function() {
        const parent = this.parentNode.__data__;
        if (!parent) return 1.5;
        if (parent.id === selectedId) return 3.5;
        return parent.type === "brokerage" ? 2.5 : 1.5;
      })
      .attr("stroke", function() {
        const parent = this.parentNode.__data__;
        if (!parent) return "#1e293b";
        if (parent.id === selectedId) return "#fff";
        return NODE_CONFIG[parent.type]?.color || "#1e293b";
      });
  }, [selectedId]);

  return (
    <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />
  );
}

// ─── Brokerage Search Overlay ─────────────────────────────────────────────────

function BrokerageSearchOverlay({ onSelect, canClose, onClose }) {
  const { term, setTerm, results, loading } = useBrokerageSearch();
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: canClose ? "rgba(8,13,24,0.85)" : "#080d18",
      backdropFilter: canClose ? "blur(4px)" : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 480, maxWidth: "calc(100vw - 40px)",
        background: "#0b1120", border: "1px solid #1e293b",
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>
        <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>Select Brokerage</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Search by name to open the relationship graph</div>
          </div>
          {canClose && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 18, padding: 4, lineHeight: 1, flexShrink: 0 }}>✕</button>
          )}
        </div>

        <div style={{ padding: "16px 20px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14, pointerEvents: "none" }}>🔍</span>
            <input
              ref={inputRef}
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="Search brokerages…"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 36px 10px 36px",
                background: "#0f172a", border: "1px solid #1e293b",
                borderRadius: 8, color: "#f1f5f9", fontSize: 13,
                outline: "none", fontFamily: "inherit",
              }}
            />
            {loading && (
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 11 }}>…</span>
            )}
          </div>
        </div>

        <div style={{ maxHeight: 320, overflowY: "auto", padding: "0 12px 12px" }}>
          {term.trim().length < 2 && (
            <div style={{ padding: "16px 8px", textAlign: "center", color: "#334155", fontSize: 12 }}>
              Type at least 2 characters to search
            </div>
          )}
          {term.trim().length >= 2 && !loading && results.length === 0 && (
            <div style={{ padding: "16px 8px", textAlign: "center", color: "#334155", fontSize: 12 }}>
              No brokerages found
            </div>
          )}
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10,
                padding: "12px 14px", marginBottom: 6, cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {r.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                  {[r.tier ? `${r.tier} Tier` : null, r.gwp ? `${fmt(r.gwp)} GWP` : null].filter(Boolean).join(" · ")}
                </div>
              </div>
              {r.score != null && (
                <div style={{ fontSize: 12, fontFamily: "monospace", color: "#34d399", flexShrink: 0 }}>{r.score}</div>
              )}
              <span style={{ color: "#334155", fontSize: 14, flexShrink: 0 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App({ recordId }) {
  const [activeRecordId, setActiveRecordId] = useState(recordId);
  const [searchOpen, setSearchOpen] = useState(!recordId);
  const { data: graphData, loading, error, retry } = useBrokerageGraph(activeRecordId);

  const handleSearchSelect = useCallback((id) => {
    setActiveRecordId(id);
    setSearchOpen(false);
  }, []);

  const [view, setView] = useState("graph");
  const [selected, setSelected] = useState(null);
  // Auto-select the centre brokerage when data loads or when the selected node
  // no longer exists in the current graph (e.g. after drilling into a new account)
  useEffect(() => {
    if (!graphData?.nodes?.length) return;
    const stillValid = selected && graphData.nodes.some(n => n.id === selected.id && !n.isParent && !n.isChild);
    if (!stillValid) {
      setSelected(graphData.nodes.find(n => n.type === "brokerage" && !n.isParent && !n.isChild) ?? graphData.nodes[0]);
    }
  }, [graphData, selected]);

  const handleSelect = useCallback((node) => {
    if (node.type === "brokerage" && (node.isParent || node.isChild)) {
      setActiveRecordId(node.id);
    } else {
      setSelected(node);
      setView("detail");
    }
  }, []);

  const cfg = NODE_CONFIG[selected?.type] ?? {};
  const brokerage = graphData?.nodes?.find(n => n.type === "brokerage" && !n.isParent && !n.isChild);
  const parentBrokerage = graphData?.nodes?.find(n => n.type === "brokerage" && n.isParent);

  const DETAIL_MAP = { brokerage: BrokerageDetail, broker: BrokerDetail, submission: SubmissionDetail, claim: ClaimDetail, meeting: MeetingDetail };
  const DetailComponent = DETAIL_MAP[selected?.type] ?? (() => null);

  return (
    <div style={{ height: "100vh", background: "#080d18", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflow: "hidden" }}>

      {/* Top bar */}
      <div style={{ padding: "12px 20px", background: "#0b1120", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
          {brokerage?.label?.[0] ?? "B"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {parentBrokerage && (
            <>
              <button onClick={() => setActiveRecordId(parentBrokerage.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, color: "#475569", fontWeight: 500 }}>
                {parentBrokerage.label}
              </button>
              <span style={{ color: "#334155", fontSize: 14 }}>›</span>
            </>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{brokerage?.label ?? "Loading…"}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>Brokerage{brokerage?.tier ? ` · ${brokerage.tier} Tier` : ""}</div>
          </div>
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 7, border: "1px solid #1e293b", background: "#0f172a", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em", marginRight: 6 }}
        >⇄ Switch</button>
        <div style={{ display: "flex", gap: 4, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 3 }}>
          {[["graph", "🕸 Graph"], ["tree", "🌳 Tree"], ["card", "📋 Card"]].map(([v, label]) => {
            const active = v === "graph" ? (view === "graph" || view === "detail") : view === v;
            return (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: active ? "#1e293b" : "transparent",
                color: active ? "#e2e8f0" : "#475569",
                transition: "all 0.15s",
              }}>{label}</button>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {error && <ErrorCard error={error} onRetry={retry} />}

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {view === "tree" ? (
          <BrokerageArcTree graphData={graphData} loading={loading} error={error} />
        ) : (
          <>
            {/* Graph pane */}
            <div style={{
              flex: view === "card" ? 0 : 1,
              minWidth: view === "card" ? 0 : undefined,
              transition: "flex 0.3s ease",
              position: "relative",
              overflow: "hidden",
              background: "#080d18",
              borderRight: view !== "card" && selected ? "1px solid #1e293b" : "none",
            }}>
              {view !== "card" && (
                <>
                  <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10 }}>
                    <Legend />
                  </div>
                  <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 10, fontSize: 10, color: "#334155" }}>
                    Scroll to zoom · Drag nodes · Click to inspect
                  </div>
                  {loading && <GraphSkeleton />}
                  {!loading && graphData && (
                    <RelationshipGraph graphData={graphData} onSelectNode={handleSelect} selectedId={selected?.id} />
                  )}
                </>
              )}
            </div>

            {/* Detail pane */}
            {(view === "detail" || view === "card") && selected && graphData && (
              <div style={{
                ...(view === "card" ? { flex: 1, minWidth: 0 } : { width: 360, flexShrink: 0 }),
                background: "#0d1424",
                overflowY: "auto",
                padding: "16px",
                borderLeft: view === "card" ? "none" : "1px solid #1e293b",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, border: `2px solid ${cfg.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>{selected.label}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 1, textTransform: "capitalize" }}>{selected.type}</div>
                  </div>
                  {view === "detail" && (
                    <button onClick={() => setView("graph")} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "4px 10px", color: "#64748b", fontSize: 11, cursor: "pointer" }}>
                      ← Back
                    </button>
                  )}
                </div>

                <div style={{ width: "100%", height: 1, background: "#1e293b", marginBottom: 16 }} />

                {loading
                  ? <DetailSkeleton />
                  : <DetailComponent node={selected} graphData={graphData} />
                }

                <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
                  {["Log Activity", "New Submission"].map((label) => (
                    <button key={label} style={{
                      flex: 1, padding: "8px 0", borderRadius: 8,
                      border: "1px solid #1e293b",
                      background: "#0f172a",
                      color: "#64748b",
                      fontSize: 10, fontWeight: 600, cursor: "pointer",
                      letterSpacing: "0.04em",
                    }}>{label}</button>
                  ))}
                  <button
                    onClick={() => {
                      const OBJECT_MAP = { brokerage: "Account", broker: "Contact", submission: "Opportunity", claim: "Case", meeting: "Task" };
                      const obj = OBJECT_MAP[selected.type];
                      const base = globalThis.SFDC_ENV?.orgUrl ?? globalThis.MOSAIC_ENV?.instanceUrl ?? "";
                      if (obj && base) window.open(`${base}/lightning/r/${obj}/${selected.id}/view`, "_blank");
                    }}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg,#1d4ed8,#7c3aed)",
                      color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer",
                      letterSpacing: "0.04em",
                    }}>Open Record</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {searchOpen && (
        <BrokerageSearchOverlay
          onSelect={handleSearchSelect}
          canClose={!!activeRecordId}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}
