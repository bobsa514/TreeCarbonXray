import React, { useMemo, useState, useEffect } from 'react';
import { ProjectTree, ProjectMetadata, DbhUnit, ModelConfidence } from '../types';
import { fmt, cmToIn } from '../services/format';
import { BotBranch, BotRings, BotSprig } from './Botanicals';
import { exportInventoryToCsv } from '../services/csvExport';

interface DashboardProps {
  projectTrees: ProjectTree[];
  switchToBuilder: () => void;
  projectMetadata: ProjectMetadata;
  setProjectMetadata: (m: ProjectMetadata) => void;
  horizon: number;
  dbhUnit: DbhUnit;
}

const Dashboard: React.FC<DashboardProps> = ({
  projectTrees, switchToBuilder, projectMetadata, setProjectMetadata, horizon, dbhUnit,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProjectMetadata>(projectMetadata);
  useEffect(() => setDraft(projectMetadata), [projectMetadata]);

  const stats = useMemo(() => {
    if (projectTrees.length === 0) return null;
    const hz = Math.min(horizon, projectTrees[0].forecastData.length - 1);
    const totalCount = projectTrees.reduce((a, t) => a + t.count, 0);
    const totalInit = projectTrees.reduce((a, t) =>
      a + (t.forecastData[0]?.carbonStorage ?? 0) * t.count, 0);
    const totalFinal = projectTrees.reduce((a, t) =>
      a + (t.forecastData[hz]?.carbonStorage ?? 0) * t.count, 0);
    const totalGain = totalFinal - totalInit;
    const growthPct = totalInit > 0 ? (totalGain / totalInit) * 100 : 0;
    const cars = totalFinal / 4600;
    const gallons = totalFinal / 8.887;
    return { totalCount, totalInit, totalFinal, totalGain, growthPct, cars, gallons, hz };
  }, [projectTrees, horizon]);

  const confCounts = useMemo(() => {
    const c: Record<ModelConfidence, number> = { exact: 0, genus: 0, proxy: 0 };
    projectTrees.forEach(t => { c[t.modelConfidence] += t.count; });
    return c;
  }, [projectTrees]);

  const forecastsForDonut = useMemo(() => projectTrees.map(t => ({
    id: t.id, common: t.speciesCommon, count: t.count,
  })), [projectTrees]);

  const saveMeta = () => { setProjectMetadata(draft); setEditing(false); };

  if (!stats || projectTrees.length === 0) {
    return (
      <div style={{ padding: '120px 32px', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
        <BotSprig size={80} style={{ color: 'var(--stone-2)', margin: '0 auto 20px' }}/>
        <div className="eyebrow">§02 · Impact Report</div>
        <h2 className="serif" style={{ fontSize: 48, margin: '8px 0 16px', letterSpacing: '-0.02em' }}>
          Nothing to report — <em style={{ color: 'var(--olive)' }}>yet</em>.
        </h2>
        <p className="body" style={{ margin: '0 auto 24px', maxWidth: 420 }}>
          Add at least one species to the inventory and the report will generate a client-ready deliverable with headline numbers and equivalencies.
        </p>
        <button className="btn" onClick={switchToBuilder}>← Back to Project Builder</button>
      </div>
    );
  }

  const today = new Date(projectMetadata.date || Date.now())
    .toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ padding: '48px 32px 80px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Masthead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="eyebrow">Tree Carbon Xray · Impact Report</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.04em' }}>
            GENERATED {today.toUpperCase()} · VOLUME {horizon} · No. {String(stats.totalCount).padStart(3, '0')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="no-print">
          <span className="pill olive"><span className="dot"/> {stats.totalCount} trees in inventory</span>
          <button className="btn soft small"
            onClick={() => exportInventoryToCsv(projectTrees, projectMetadata, horizon, dbhUnit)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M6 1 L6 8 M3 5 L6 8 L9 5 M2 11 L10 11" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            </svg>
            Export CSV
          </button>
          <button className="btn small" onClick={() => window.print()}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M3 1 L9 1 L9 4 M3 4 L3 1 M2 4 L10 4 L10 9 L8 9 L8 11 L4 11 L4 9 L2 9 Z M4 7 L8 7" stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      <div className="rule-2" style={{ margin: '18px 0 6px' }}/>
      <div className="rule" style={{ marginBottom: 48 }}/>

      {/* Title block */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48, alignItems: 'start', marginBottom: 48 }}>
        <div>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input" value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Project Name"
                style={{ fontSize: 36, fontFamily: 'var(--font-serif)', padding: '8px 12px', background: 'var(--paper-2)' }}/>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="input" value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  placeholder="Location"/>
                <input type="date" className="input" value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}/>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn small" onClick={saveMeta}>Save</button>
                <button className="btn ghost small" onClick={() => { setDraft(projectMetadata); setEditing(false); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="serif" style={{ fontSize: 88, lineHeight: 0.92, margin: '0 0 16px', letterSpacing: '-0.03em' }}>
                {projectMetadata.name || <span style={{ color: 'var(--ink-4)' }}>Untitled Project</span>}
              </h1>
              <div style={{ display: 'flex', gap: 32, alignItems: 'baseline' }}>
                <div>
                  <div className="eyebrow">Location</div>
                  <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>{projectMetadata.location || '—'}</div>
                </div>
                <div>
                  <div className="eyebrow">Date</div>
                  <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>{today}</div>
                </div>
                <button className="btn ghost small no-print"
                  onClick={() => { setDraft(projectMetadata); setEditing(true); }}>
                  Edit details
                </button>
              </div>
            </>
          )}
        </div>

        <div style={styles.sideNote}>
          <BotSprig size={54} style={{ color: 'var(--olive)', opacity: 0.7, marginBottom: 12 }}/>
          <div className="eyebrow">Model confidence</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {(['exact', 'genus', 'proxy'] as ModelConfidence[]).map(k => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`conf ${k}`}><span className="sq"/>{k}</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{confCounts[k] || 0}</span>
              </div>
            ))}
          </div>
          <div className="caption" style={{ marginTop: 14, fontSize: 10.5, lineHeight: 1.5 }}>
            Reflects the aggregate scientific basis of the forecast — by tree-unit, weighted by quantity.
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={{ position: 'absolute', top: 24, left: 32, display: 'flex', justifyContent: 'space-between', right: 32 }}>
          <span className="eyebrow" style={{ color: 'var(--paper-2)', opacity: 0.7 }}>Feature · Lifetime Carbon Storage</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--paper-2)', opacity: 0.6 }}>
            Y0 → Y{horizon} · PROJECTED
          </span>
        </div>
        <BotBranch size={420} style={{ position: 'absolute', bottom: -40, right: -60, color: 'var(--paper)', opacity: 0.08 }}/>

        <div style={{ textAlign: 'center', padding: '80px 40px 60px' }}>
          <div className="serif" style={{
            fontSize: 'clamp(100px, 16vw, 220px)', lineHeight: 0.9,
            color: 'var(--paper)', letterSpacing: '-0.04em',
            fontFeatureSettings: '"tnum"',
          }}>
            {fmt.kg(stats.totalFinal)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'baseline', marginTop: 8 }}>
            <span className="mono" style={{ fontSize: 14, color: 'var(--paper-2)', opacity: 0.85, letterSpacing: '0.1em' }}>
              KILOGRAMS CO₂e
            </span>
            <span style={{ color: 'var(--paper-2)', opacity: 0.5 }}>·</span>
            <span className="mono" style={{ fontSize: 14, color: 'var(--terracotta-soft)', letterSpacing: '0.1em' }}>
              {fmt.t2(stats.totalFinal)} METRIC TONNES
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={styles.heroSplit}>
            <div className="eyebrow" style={{ color: 'var(--paper-2)', opacity: 0.6 }}>Current stock · Y0</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <div className="serif" style={{ fontSize: 56, color: 'var(--paper)', lineHeight: 1 }}>
                {fmt.kg(stats.totalInit)}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--paper-2)', opacity: 0.6 }}>KG</div>
            </div>
            <div className="caption" style={{ color: 'var(--paper-2)', opacity: 0.7, marginTop: 4, fontSize: 11 }}>
              Carbon locked in the inventory today.
            </div>
          </div>
          <div style={{ ...styles.heroSplit, borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="eyebrow" style={{ color: 'var(--terracotta-soft)' }}>Net Sequestration (Growth)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <div className="serif" style={{ fontSize: 56, color: 'var(--terracotta-soft)', lineHeight: 1 }}>
                +{fmt.kg(stats.totalGain)}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--paper-2)', opacity: 0.6 }}>KG</div>
            </div>
            <div className="caption" style={{ color: 'var(--paper-2)', opacity: 0.7, marginTop: 4, fontSize: 11 }}>
              New carbon added by growth over {horizon} years.
            </div>
          </div>
        </div>
      </div>

      {/* Narrative */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, margin: '56px 0', alignItems: 'start' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <div className="eyebrow">§ Growth & Yield</div>
          <p className="serif" style={{ fontSize: 32, lineHeight: 1.2, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
            This project utilizes growth coefficients to model the biological maturation of the inventory. Over the next <em style={{ color: 'var(--olive)' }}>{horizon} years</em>, total carbon storage is projected to increase by <em style={{ color: 'var(--terracotta)' }}>{stats.totalInit > 0 ? fmt.pct(stats.growthPct) : 'N/A'}</em> as trees expand in diameter and biomass.
          </p>
          <div className="caption" style={{ fontSize: 10.5, marginTop: 12, color: 'var(--ink-4)' }}>
            Includes above-ground biomass estimation derived from DBH–Height allometry.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={styles.statTile}>
            <div className="eyebrow">Metric tonnes</div>
            <div className="serif" style={{ fontSize: 44, lineHeight: 1, margin: '6px 0 2px' }}>{fmt.t2(stats.totalFinal)}</div>
            <div className="caption">tCO₂e stored at Y{horizon}</div>
          </div>
          <div style={styles.statTile}>
            <div className="eyebrow">Trees</div>
            <div className="serif" style={{ fontSize: 44, lineHeight: 1, margin: '6px 0 2px' }}>{stats.totalCount}</div>
            <div className="caption">{projectTrees.length} species across the project</div>
          </div>
        </div>
      </div>

      {/* Equivalencies + Composition */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 32, marginBottom: 48 }}>
        <div className="card" style={{
          padding: 32,
          background: 'var(--terracotta-wash)', borderColor: 'var(--terracotta-soft)',
          position: 'relative', overflow: 'hidden',
        }}>
          <BotRings size={180} style={{ position: 'absolute', right: -40, top: -40, color: 'var(--terracotta)', opacity: 0.2 }}/>
          <div className="eyebrow" style={{ color: 'var(--terracotta-deep)' }}>Equivalency</div>
          <h3 className="serif" style={{ fontSize: 28, margin: '4px 0 20px', letterSpacing: '-0.01em' }}>
            Translating the number.
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <EqBlock
              icon={
                <svg width="40" height="24" viewBox="0 0 40 24">
                  <path d="M4 18 L4 14 Q 4 10, 8 10 L 10 5 Q 11 2, 14 2 L 26 2 Q 29 2, 30 5 L 32 10 Q 36 10, 36 14 L 36 18 M 0 18 L 40 18" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                  <circle cx="10" cy="18" r="3" stroke="currentColor" strokeWidth="1.2" fill="var(--terracotta-wash)"/>
                  <circle cx="30" cy="18" r="3" stroke="currentColor" strokeWidth="1.2" fill="var(--terracotta-wash)"/>
                </svg>
              }
              value={fmt.kg1(stats.cars)}
              unit="cars"
              note="driven for one year"
              formula="÷ 4,600 kg CO₂ / car-yr"
            />
            <EqBlock
              icon={
                <svg width="28" height="28" viewBox="0 0 28 28">
                  <rect x="6" y="8" width="14" height="16" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                  <path d="M6 12 L20 12" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M20 14 L24 14 L24 20 Q 24 22, 22 22" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                  <path d="M10 4 L16 4 L16 8 L10 8 Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                </svg>
              }
              value={fmt.kg(stats.gallons)}
              unit="gallons"
              note="of gasoline consumed"
              formula="÷ 8.887 kg CO₂ / gal"
            />
          </div>
          <div className="caption" style={{ marginTop: 20, fontSize: 10.5, color: 'var(--terracotta-deep)' }}>
            EPA tailpipe CO₂ factors — standard climate communication shorthand.
          </div>
        </div>

        <div className="card" style={{ padding: 32, position: 'relative' }}>
          <div className="eyebrow">Project composition</div>
          <h3 className="serif" style={{ fontSize: 22, margin: '4px 0 16px' }}>Species share</h3>
          <CompositionDonut entries={forecastsForDonut} totalCount={stats.totalCount}/>
        </div>
      </div>

      {/* Footer */}
      <div className="rule"/>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>
        <span className="mono" style={{ letterSpacing: '0.04em' }}>
          Carbon projections use USFS i-Tree growth coefficients (TS6 / TS9).
        </span>
        <span className="serif" style={{ fontStyle: 'italic' }}>— End of report.</span>
      </div>
    </div>
  );
};

const EqBlock: React.FC<{
  icon: React.ReactNode; value: string; unit: string; note: string; formula: string;
}> = ({ icon, value, unit, note, formula }) => (
  <div>
    <div style={{ color: 'var(--terracotta-deep)', marginBottom: 10 }}>{icon}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <div className="serif" style={{ fontSize: 48, lineHeight: 1, color: 'var(--ink)' }}>{value}</div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--terracotta-deep)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {unit}
      </div>
    </div>
    <div className="caption" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{note}</div>
    <div className="mono" style={{ fontSize: 10, color: 'var(--terracotta-deep)', opacity: 0.8, marginTop: 8 }}>{formula}</div>
  </div>
);

const CompositionDonut: React.FC<{ entries: Array<{ id: string; common: string; count: number }>; totalCount: number }> = ({
  entries, totalCount,
}) => {
  const data = [...entries].sort((a, b) => b.count - a.count);
  const colors = ['var(--olive)', 'var(--terracotta)', 'var(--olive-deep)', 'var(--terracotta-deep)', '#8a9e7a', '#d4a58e', '#6a7d5c', '#b89a80'];
  const r = 70, cx = 90, cy = 90;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const arcs = data.map((f, i) => {
    const pct = f.count / totalCount;
    const len = pct * circumference;
    const arc = { len, offset, color: colors[i % colors.length], ...f };
    offset += len;
    return arc;
  });

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--stone)" strokeWidth="20"/>
        {arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color} strokeWidth="20"
            strokeDasharray={`${a.len} ${circumference}`}
            strokeDashoffset={-a.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'all .3s' }}/>
        ))}
        <text x={cx} y={cy - 2} textAnchor="middle" fontFamily="var(--font-serif)" fontSize="32" fill="var(--ink)">
          {totalCount}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-3)" letterSpacing="0.1em">
          TREES
        </text>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        {arcs.slice(0, 4).map((a, i) => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 0',
            borderBottom: i < 3 && i < arcs.length - 1 ? '1px solid var(--stone)' : 'none',
          }}>
            <div style={{ width: 10, height: 10, background: a.color, borderRadius: 2, flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.common}
              </div>
              <div className="mono caption" style={{ fontSize: 10 }}>
                {a.count} · {fmt.pct(100 * a.count / totalCount)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sideNote: {
    padding: 20, background: 'var(--paper-2)',
    border: '1px solid var(--stone)', borderRadius: 'var(--r-md)',
  },
  hero: {
    position: 'relative',
    background: 'var(--ink)',
    color: 'var(--paper)',
    borderRadius: 'var(--r-lg)',
    overflow: 'hidden',
  },
  heroSplit: { padding: '28px 32px' },
  statTile: {
    padding: 18, background: 'var(--paper-2)', border: '1px solid var(--stone)',
    borderRadius: 'var(--r-md)',
  },
};

export default Dashboard;
