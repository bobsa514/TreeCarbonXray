import React, { useState } from 'react';
import { TabView, RegionOption, DbhUnit, ProjectTree } from '../types';
import { BotLeaf } from './Botanicals';
import Modal from './Modal';

interface TopNavProps {
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  projectTrees: ProjectTree[];
  onClearProject: () => void;
  horizon: number;
  setHorizon: (h: number) => void;
  regions: RegionOption[];
  selectedRegion: string;
  setSelectedRegion: (r: string) => void;
  dbhUnit: DbhUnit;
  setDbhUnit: (u: DbhUnit) => void;
}

const TABS: Array<{ id: TabView; label: string; idx: string }> = [
  { id: 'builder',   label: 'Project Builder',  idx: '01' },
  { id: 'dashboard', label: 'Impact Report',    idx: '02' },
  { id: 'analytics', label: 'Visual Analytics', idx: '03' },
];

const HORIZON_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

const TopNav: React.FC<TopNavProps> = ({
  activeTab, setActiveTab,
  projectTrees, onClearProject,
  horizon, setHorizon,
  regions, selectedRegion, setSelectedRegion,
  dbhUnit, setDbhUnit,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const totalTrees = projectTrees.reduce((a, t) => a + Number(t.count || 0), 0);

  return (
    <header style={styles.wrap} className="no-print">
      <div style={styles.topRow}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.mark}>
            <svg width="28" height="28" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="15" fill="none" stroke="var(--ink)" strokeWidth="0.8"/>
              <circle cx="16" cy="16" r="10" fill="none" stroke="var(--ink)" strokeWidth="0.6"/>
              <circle cx="16" cy="16" r="5"  fill="none" stroke="var(--ink)" strokeWidth="0.6"/>
              <circle cx="16" cy="16" r="1.6" fill="var(--terracotta)"/>
            </svg>
          </div>
          <div>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1, letterSpacing: '-0.01em' }}>
              Tree<span style={{ fontStyle: 'italic', color: 'var(--olive)' }}>Carbon</span>Xray
            </div>
            <div className="eyebrow" style={{ marginTop: 4, fontSize: 9.5 }}>
              USFS i-Tree · v2.4 · Est. MMXXV
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav style={styles.tabs}>
          {TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}
              >
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginRight: 8 }}>{t.idx}</span>
                {t.label}
                {active && <span style={styles.tabDot}/>}
              </button>
            );
          })}
        </nav>

        {/* Right controls */}
        <div style={styles.right}>
          <div style={styles.treeBadge}>
            <BotLeaf size={14} style={{ color: 'var(--olive)' }}/>
            <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{totalTrees}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>trees</span>
          </div>
          {projectTrees.length > 0 && (
            <button className="btn soft small" onClick={() => setConfirmClear(true)}>Clear</button>
          )}
        </div>
      </div>

      {/* Sub-bar: global controls */}
      <div style={styles.subBar}>
        <div style={styles.globalControls}>
          {/* Horizon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div className="eyebrow" style={{ fontSize: 9 }}>Horizon</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span className="serif" style={{ fontSize: 20, lineHeight: 1 }}>{horizon}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>YRS</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {HORIZON_STEPS.map(n => (
                <button key={n}
                  onClick={() => setHorizon(n)}
                  title={`${n} years`}
                  style={{
                    width: 14, height: 24, padding: 0,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  }}>
                  <div style={{
                    width: 2,
                    height: Math.max(4, (n / 50) * 24),
                    background: horizon >= n ? 'var(--olive)' : 'var(--stone-2)',
                    transition: 'background .15s',
                  }}/>
                </button>
              ))}
            </div>
          </div>

          <div style={styles.divider}/>

          {/* Region */}
          <div>
            <div className="eyebrow" style={{ fontSize: 9 }}>Region</div>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={styles.regionSelect}
            >
              <option value="">All Regions (average)</option>
              {regions.map(r => (
                <option key={r.code} value={r.code}>{r.name} — {r.city}, {r.state}</option>
              ))}
            </select>
          </div>

          <div style={styles.divider}/>

          {/* Unit toggle */}
          <div>
            <div className="eyebrow" style={{ fontSize: 9 }}>DBH Unit</div>
            <div style={styles.unitToggle}>
              {(['cm', 'in'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => setDbhUnit(u)}
                  style={{ ...styles.unitBtn, ...(dbhUnit === u ? styles.unitBtnActive : {}) }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.timestamp}>
          <span className="eyebrow" style={{ fontSize: 9.5 }}>LIVE FORECAST</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}
          </span>
          <span style={styles.livedot}/>
        </div>
      </div>

      {confirmClear && (
        <Modal onClose={() => setConfirmClear(false)} size="sm">
          <div style={{ padding: '32px 32px 28px' }}>
            <div className="eyebrow">Confirm</div>
            <h2 className="serif" style={{ fontSize: 32, margin: '6px 0 8px', letterSpacing: '-0.015em' }}>
              Clear this project?
            </h2>
            <p className="body" style={{ margin: '0 0 24px' }}>
              This will remove all {projectTrees.length} inventory entries and reset the project metadata. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button className="btn"
                style={{ background: 'var(--terracotta-deep)', borderColor: 'var(--terracotta-deep)' }}
                onClick={() => { onClearProject(); setConfirmClear(false); }}>
                Clear project
              </button>
            </div>
          </div>
        </Modal>
      )}
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'sticky', top: 0, zIndex: 40,
    background: 'rgba(248,247,242,0.88)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderBottom: '1px solid var(--stone)',
  },
  topRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    padding: '16px 32px',
    gap: 24,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  mark: {
    width: 36, height: 36, borderRadius: '50%',
    border: '1px solid var(--stone-2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--paper)',
  },
  tabs: {
    display: 'flex', gap: 4,
    background: 'var(--paper-2)', padding: 4,
    borderRadius: 'var(--r-pill)',
    border: '1px solid var(--stone)',
  },
  tab: {
    position: 'relative',
    padding: '8px 18px',
    borderRadius: 'var(--r-pill)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--ink-2)',
    display: 'flex', alignItems: 'center',
    transition: 'all .18s',
  },
  tabActive: {
    background: 'var(--paper)',
    color: 'var(--ink)',
    boxShadow: '0 1px 2px rgba(26,29,26,.06), 0 0 0 1px var(--stone-2)',
  },
  tabDot: {
    marginLeft: 8, width: 5, height: 5, borderRadius: '50%', background: 'var(--terracotta)',
  },
  right: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 },
  treeBadge: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px',
    border: '1px solid var(--stone-2)',
    borderRadius: 'var(--r-pill)',
    background: 'var(--paper)',
  },
  subBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 32px',
    borderTop: '1px solid var(--stone)',
    background: 'var(--paper)',
  },
  globalControls: { display: 'flex', alignItems: 'center', gap: 22 },
  divider: { width: 1, height: 20, background: 'var(--stone-2)' },
  regionSelect: {
    background: 'transparent', border: 'none', outline: 'none',
    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
    color: 'var(--ink)', cursor: 'pointer', padding: '2px 0',
    maxWidth: 260, textOverflow: 'ellipsis',
  },
  unitToggle: {
    display: 'flex', border: '1px solid var(--stone-2)', borderRadius: 'var(--r-pill)',
    padding: 2, background: 'var(--paper)',
  },
  unitBtn: {
    border: 'none', background: 'transparent', padding: '3px 10px',
    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
    color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 'var(--r-pill)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  unitBtnActive: { background: 'var(--ink)', color: 'var(--paper)' },
  timestamp: { display: 'flex', alignItems: 'center', gap: 10 },
  livedot: {
    width: 6, height: 6, borderRadius: '50%', background: 'var(--olive)',
    boxShadow: '0 0 0 3px var(--olive-wash)',
    animation: 'pulse 2s ease-in-out infinite',
  },
};

export default TopNav;
