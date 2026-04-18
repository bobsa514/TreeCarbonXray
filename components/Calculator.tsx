import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BiomassDensity, ModelConfidence, ProjectTree, GrowthCoefficient, SpeciesInfo, RegionOption, DbhUnit } from '../types';
import { forecastTreeGrowth } from '../services/carbonCalculator';
import { fmt, cmToIn, inToCm } from '../services/format';
import SpeciesBrowser from './SpeciesBrowser';
import { BotBranch, BotSprig, BotRings, TreeSilhouette } from './Botanicals';
import { EXAMPLE_PROJECT_SPECIES } from '../constants';

interface CalculatorProps {
  densities: BiomassDensity[];
  growthCoeffs: GrowthCoefficient[];
  projectTrees: ProjectTree[];
  setProjectTrees: React.Dispatch<React.SetStateAction<ProjectTree[]>>;
  switchToDashboard: () => void;
  speciesList: SpeciesInfo[];
  regions: RegionOption[];
  selectedRegion: string;
  setSelectedRegion: (r: string) => void;
  horizon: number;
  setHorizon: (h: number) => void;
  dbhUnit: DbhUnit;
  setDbhUnit: (u: DbhUnit) => void;
}

type TierLabel = { label: string; unc: string };
const TIER_LABELS: Record<ModelConfidence, TierLabel> = {
  exact: { label: 'Exact', unc: '±10–20%' },
  genus: { label: 'Genus', unc: '±20–40%' },
  proxy: { label: 'Proxy', unc: '±40–60%' },
};

const ConfidenceBadge: React.FC<{ tier: ModelConfidence; source?: string; showSource?: boolean }> = ({
  tier, source, showSource,
}) => {
  const { label, unc } = TIER_LABELS[tier];
  return (
    <span title={`${label} · ${unc}${source ? ` · model: ${source}` : ''}`}>
      <span className={`conf ${tier}`}>
        <span className="sq"/>{label} {unc}
      </span>
      {showSource && tier !== 'exact' && source && (
        <span className="serif" style={{ fontStyle: 'italic', fontSize: 11, color: 'var(--ink-3)', marginLeft: 8 }}>
          model: {source}
        </span>
      )}
    </span>
  );
};

const Calculator: React.FC<CalculatorProps> = ({
  densities, growthCoeffs, projectTrees, setProjectTrees, switchToDashboard,
  speciesList, selectedRegion, horizon, dbhUnit, setDbhUnit,
}) => {
  const [formSpecies, setFormSpecies] = useState<SpeciesInfo | null>(null);
  const [typed, setTyped] = useState('');
  const [qty, setQty] = useState(1);
  const [dbh, setDbh] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Refs to avoid effect cascades when recalculating on horizon/region change
  const projectTreesRef = useRef(projectTrees);
  useEffect(() => { projectTreesRef.current = projectTrees; }, [projectTrees]);
  const selectedRegionRef = useRef(selectedRegion);
  useEffect(() => { selectedRegionRef.current = selectedRegion; }, [selectedRegion]);
  const prevHorizonRef = useRef(horizon);
  const prevRegionRef = useRef(selectedRegion);

  // Recalc all trees when horizon changes
  useEffect(() => {
    if (prevHorizonRef.current === horizon) return;
    prevHorizonRef.current = horizon;
    if (projectTreesRef.current.length === 0) return;
    setProjectTrees(prev => prev.map(tree => recalcTree(tree, horizon, densities, growthCoeffs, selectedRegionRef.current || undefined)));
  }, [horizon, densities, growthCoeffs, setProjectTrees]);

  // Recalc all trees when region changes
  useEffect(() => {
    if (prevRegionRef.current === selectedRegion) return;
    prevRegionRef.current = selectedRegion;
    if (projectTreesRef.current.length === 0) return;
    setProjectTrees(prev => prev.map(tree => recalcTree(tree, horizon, densities, growthCoeffs, selectedRegion || undefined)));
  }, [selectedRegion, densities, growthCoeffs, horizon, setProjectTrees]);

  const acResults = useMemo(() => {
    const n = typed.trim().toLowerCase();
    if (!n) return [];
    return speciesList.filter(s =>
      s.commonName.toLowerCase().includes(n) || s.scientificName.toLowerCase().includes(n)
    ).slice(0, 10);
  }, [typed, speciesList]);

  const chooseSpecies = (s: SpeciesInfo) => {
    setFormSpecies(s);
    setTyped(s.commonName);
    setShowAutocomplete(false);
    setWarning(null);
    setDismissed(false);
    if (s.typicalDbh !== undefined) {
      setDbh(dbhUnit === 'in' ? cmToIn(s.typicalDbh).toFixed(1) : String(s.typicalDbh));
    }
  };

  const addTree = (entry: Omit<ProjectTree, 'id' | 'forecastData' | 'currentCarbon' | 'modelConfidence' | 'modelSourceScientific' | 'initialHeight'>) => {
    const { annualData, currentCarbon, modelConfidence, modelSourceScientific } = forecastTreeGrowth(
      entry.speciesScientific, entry.initialDbh, horizon, densities, growthCoeffs, selectedRegion || undefined,
    );
    const newTree: ProjectTree = {
      ...entry,
      id: Math.random().toString(36).slice(2, 11),
      initialHeight: annualData[0]?.height ?? 0,
      currentCarbon: currentCarbon * entry.count,
      modelConfidence,
      modelSourceScientific,
      forecastData: annualData,
    };
    setProjectTrees(prev => [...prev, newTree]);
  };

  const submit = () => {
    const dbhNum = Number(dbh);
    if (!dbhNum || dbhNum <= 0) return;
    const dbhCm = dbhUnit === 'in' ? inToCm(dbhNum) : dbhNum;

    if (!formSpecies) {
      if (!dismissed) {
        setWarning(`"${typed}" was not found in the species catalog. Select from the dropdown or browse list for best accuracy. The model will use a proxy estimate if you proceed.`);
        setDismissed(true);
        return;
      }
      addTree({
        speciesCommon: typed || 'Unknown',
        speciesScientific: typed || 'Unknown species',
        count: Number(qty) || 1,
        initialDbh: dbhCm,
      });
    } else {
      addTree({
        speciesCommon: formSpecies.commonName,
        speciesScientific: formSpecies.scientificName,
        count: Number(qty) || 1,
        initialDbh: dbhCm,
      });
    }
    setFormSpecies(null); setTyped(''); setQty(1); setDbh(''); setWarning(null); setDismissed(false);
  };

  const removeTree = (id: string) => setProjectTrees(prev => prev.filter(t => t.id !== id));

  const updateCount = (id: string, newCount: number) => {
    if (!Number.isFinite(newCount) || newCount < 1) return;
    setProjectTrees(prev => prev.map(t => {
      if (t.id !== id) return t;
      const perTree = t.forecastData[0]?.carbonStorage ?? 0;
      return { ...t, count: newCount, currentCarbon: perTree * newCount };
    }));
  };

  const loadExample = () => {
    const trees: ProjectTree[] = EXAMPLE_PROJECT_SPECIES.map(t => {
      const { annualData, currentCarbon, modelConfidence, modelSourceScientific } = forecastTreeGrowth(
        t.speciesScientific, t.initialDbh, horizon, densities, growthCoeffs, selectedRegion || undefined,
      );
      return {
        ...t,
        id: Math.random().toString(36).slice(2, 11),
        modelConfidence,
        modelSourceScientific,
        initialHeight: annualData[0]?.height ?? 0,
        currentCarbon: currentCarbon * t.count,
        forecastData: annualData,
      };
    });
    setProjectTrees(trees);
  };

  const canSubmit = typed.length > 0 && Number(dbh) > 0;
  const isEmpty = projectTrees.length === 0;
  const displayDbh = (cmVal: number) => dbhUnit === 'in' ? cmToIn(cmVal).toFixed(1) : cmVal.toFixed(1);

  const confCounts = useMemo(() => {
    const c = { exact: 0, genus: 0, proxy: 0 };
    projectTrees.forEach(t => { c[t.modelConfidence] += t.count; });
    return c;
  }, [projectTrees]);

  const totals = useMemo(() => {
    const totalCount = projectTrees.reduce((a, t) => a + t.count, 0);
    const totalInit = projectTrees.reduce((a, t) =>
      a + (t.forecastData[0]?.carbonStorage ?? 0) * t.count, 0);
    const totalFinal = projectTrees.reduce((a, t) => {
      const end = t.forecastData[t.forecastData.length - 1];
      return a + (end ? end.carbonStorage * t.count : 0);
    }, 0);
    const totalGain = totalFinal - totalInit;
    const byYear = projectTrees[0]?.forecastData.map((_, y) =>
      projectTrees.reduce((a, t) => a + (t.forecastData[y]?.carbonStorage ?? 0) * t.count, 0),
    ) ?? [];
    return { totalCount, totalInit, totalFinal, totalGain, byYear };
  }, [projectTrees]);

  return (
    <div style={{ padding: '48px 32px 80px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Section header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', marginBottom: 40, gap: 32 }}>
        <div>
          <div className="eyebrow">§01 · Project Builder</div>
          <h1 className="serif" style={{ fontSize: 72, margin: '6px 0 12px', lineHeight: 0.96, letterSpacing: '-0.025em' }}>
            Build your <em style={{ color: 'var(--olive)' }}>inventory</em>.<br/>
            Watch carbon accrue.
          </h1>
          <p className="body" style={{ maxWidth: 640, fontSize: 16 }}>
            Assemble species, quantity, and stem size. The forecast recalculates with every change, using USFS i-Tree growth coefficients for the selected region.
          </p>
        </div>
        <BotBranch size={220} style={{ color: 'var(--olive)', opacity: 0.6 }}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 32, alignItems: 'start' }}>
        {/* LEFT — input column */}
        <div style={{ position: 'sticky', top: 140, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24, position: 'relative' }}>
            <BotSprig size={48} style={{ position: 'absolute', top: 16, right: 16, color: 'var(--stone-2)' }}/>
            <div className="eyebrow">Add to inventory</div>
            <h3 className="serif" style={{ fontSize: 24, margin: '4px 0 20px', letterSpacing: '-0.01em' }}>New species</h3>

            {/* Species */}
            <label className="eyebrow" style={{ fontSize: 9.5 }}>Species</label>
            <div style={{ position: 'relative', marginTop: 6, marginBottom: 14 }}>
              <input
                className="input"
                placeholder="Search common or scientific name…"
                value={typed}
                onChange={(e) => { setTyped(e.target.value); setFormSpecies(null); setShowAutocomplete(true); setWarning(null); }}
                onFocus={() => setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              />
              <button
                onClick={() => setShowBrowser(true)}
                className="btn small soft"
                style={{ position: 'absolute', right: 5, top: 5 }}
              >
                Browse list
              </button>
              {showAutocomplete && acResults.length > 0 && (
                <div style={formStyles.ac}>
                  {acResults.map(s => (
                    <button
                      key={s.scientificName}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => chooseSpecies(s)}
                      style={formStyles.acItem}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{s.commonName}</div>
                          <div className="serif" style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>
                            {s.scientificName}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {formSpecies && (
              <div style={formStyles.preview}>
                <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  {formSpecies.imageUrl
                    ? <img src={formSpecies.imageUrl} alt={formSpecies.commonName}
                           style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                           onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}/>
                    : <TreeSilhouette seed={2}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--olive-deep)', fontWeight: 500 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M1 5 L4 8 L9 2" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
                    </svg>
                    Species selected
                  </div>
                  <div className="h-m" style={{ fontSize: 13 }}>{formSpecies.commonName}</div>
                  <div className="serif" style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>
                    {formSpecies.scientificName}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 12, marginTop: 14 }}>
              <div>
                <label className="eyebrow" style={{ fontSize: 9.5 }}>Quantity</label>
                <div style={formStyles.stepper}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} style={formStyles.stepBtn}>−</button>
                  <input
                    type="number" min="1" value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    style={formStyles.stepInput}
                  />
                  <button onClick={() => setQty(qty + 1)} style={formStyles.stepBtn}>+</button>
                </div>
              </div>
              <div>
                <label className="eyebrow" style={{ fontSize: 9.5 }}>
                  DBH ({dbhUnit})
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(dbh);
                      if (!isNaN(cur)) {
                        setDbh(dbhUnit === 'cm' ? (cur / 2.54).toFixed(1) : (cur * 2.54).toFixed(1));
                      }
                      setDbhUnit(dbhUnit === 'cm' ? 'in' : 'cm');
                    }}
                    style={{
                      marginLeft: 6, background: 'transparent', border: 'none',
                      color: 'var(--olive-deep)', fontSize: 9.5, cursor: 'pointer', letterSpacing: '0.12em',
                    }}
                  >
                    ⇄
                  </button>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" step="0.1" min="0" value={dbh}
                    onChange={(e) => setDbh(e.target.value)}
                    className="input"
                    placeholder={dbhUnit === 'cm' ? '18.0' : '7.1'}
                  />
                  <span className="mono" style={{ position: 'absolute', right: 10, top: 10, fontSize: 11, color: 'var(--ink-3)' }}>
                    {dbhUnit.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {formSpecies?.typicalDbh !== undefined && (
              <div className="caption" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span>Typical for species:</span>
                <span className="mono" style={{ color: 'var(--ink-2)' }}>
                  {dbhUnit === 'in'
                    ? `${(formSpecies.typicalDbh * 0.5 / 2.54).toFixed(1)}–${(formSpecies.typicalDbh * 1.8 / 2.54).toFixed(1)} in`
                    : `${Math.round(formSpecies.typicalDbh * 0.5)}–${Math.round(formSpecies.typicalDbh * 1.8)} cm`}
                </span>
              </div>
            )}

            {warning && (
              <div style={formStyles.warning}>
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M8 2 L15 14 L1 14 Z" stroke="#8a6d2a" strokeWidth="1.2" fill="#f5ecd3"/>
                  <path d="M8 6 L8 10 M8 12 L8 12.5" stroke="#8a6d2a" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <div>{warning}</div>
              </div>
            )}

            <button
              onClick={submit} disabled={!canSubmit}
              className="btn olive"
              style={{
                width: '100%', marginTop: 16, padding: '14px',
                justifyContent: 'center', opacity: canSubmit ? 1 : 0.4,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M6 2 L6 10 M2 6 L10 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Add to project
            </button>
          </div>

          {/* Guidance */}
          <div style={formStyles.guidance}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--olive)' }}/>
              <div className="eyebrow" style={{ color: 'var(--olive-deep)' }}>Growth model active</div>
            </div>
            <p className="body" style={{ fontSize: 12.5, margin: '0 0 10px', color: 'var(--ink-2)' }}>
              Calculations use US Forest Service regional growth coefficients. Each entry carries a confidence tier:
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <li><ConfidenceBadge tier="exact"/> <span style={{ color: 'var(--ink-3)' }}>direct species match</span></li>
              <li><ConfidenceBadge tier="genus"/> <span style={{ color: 'var(--ink-3)' }}>related species proxy</span></li>
              <li><ConfidenceBadge tier="proxy"/> <span style={{ color: 'var(--ink-3)' }}>Acer rubrum fallback</span></li>
            </ul>
          </div>
        </div>

        {/* RIGHT — inventory or empty */}
        <div>
          {isEmpty ? (
            <EmptyState loadExample={loadExample} onOpenBrowser={() => setShowBrowser(true)}/>
          ) : (
            <InventoryView
              projectTrees={projectTrees}
              totals={totals}
              confCounts={confCounts}
              horizon={horizon}
              dbhUnit={dbhUnit}
              displayDbh={displayDbh}
              removeTree={removeTree}
              updateCount={updateCount}
              toReport={switchToDashboard}
            />
          )}
        </div>
      </div>

      <SpeciesBrowser
        open={showBrowser}
        onClose={() => setShowBrowser(false)}
        onSelect={chooseSpecies}
        species={speciesList}
        densities={densities}
        growthCoeffs={growthCoeffs}
        selectedRegion={selectedRegion}
      />
    </div>
  );
};

const recalcTree = (
  tree: ProjectTree, horizon: number,
  densities: BiomassDensity[], growthCoeffs: GrowthCoefficient[], regionCode?: string,
): ProjectTree => {
  const { annualData, currentCarbon, modelConfidence, modelSourceScientific } = forecastTreeGrowth(
    tree.speciesScientific, tree.initialDbh, horizon, densities, growthCoeffs, regionCode,
  );
  return {
    ...tree,
    modelConfidence, modelSourceScientific,
    forecastData: annualData,
    initialHeight: annualData[0]?.height ?? tree.initialHeight,
    currentCarbon: currentCarbon * tree.count,
  };
};

interface EmptyStateProps { loadExample: () => void; onOpenBrowser: () => void; }
const EmptyState: React.FC<EmptyStateProps> = ({ loadExample, onOpenBrowser }) => (
  <div className="card" style={{ padding: 64, textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'var(--paper)' }}>
    <BotBranch size={340} style={{ position: 'absolute', top: -20, right: -60, color: 'var(--olive-soft)', opacity: 0.8 }}/>
    <BotRings size={200} style={{ position: 'absolute', bottom: -40, left: -40, color: 'var(--terracotta-soft)', opacity: 0.9 }}/>
    <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
      <div className="eyebrow">Start here</div>
      <h2 className="serif" style={{ fontSize: 56, margin: '12px 0 16px', lineHeight: 1, letterSpacing: '-0.02em' }}>
        Build a tree inventory,<br/>see carbon over <em style={{ color: 'var(--terracotta)' }}>50 years</em>.
      </h2>
      <p className="body" style={{ fontSize: 15, maxWidth: 480, margin: '0 auto 28px' }}>
        Add species, quantity, and stem diameter. TreeCarbonXray projects biomass, growth, and CO₂ storage using the USFS i-Tree dataset — ready for client pitches, council memos, and grant applications.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={loadExample}>Try example project →</button>
        <button className="btn ghost" onClick={onOpenBrowser}>Browse species</button>
      </div>
      <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderTop: '1px solid var(--stone)' }}>
        {[
          { k: '4', v: 'species', n: 'Red Maple, White Oak, London Plane, Ginkgo' },
          { k: '25', v: 'trees', n: 'Mixed residential canopy' },
          { k: '20yr', v: 'horizon', n: 'Default planning window' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '20px 12px', borderRight: i < 2 ? '1px solid var(--stone)' : 'none' }}>
            <div className="serif" style={{ fontSize: 32, lineHeight: 1 }}>{s.k}</div>
            <div className="eyebrow" style={{ marginTop: 4, fontSize: 9.5 }}>{s.v}</div>
            <div className="caption" style={{ marginTop: 6, fontSize: 11 }}>{s.n}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

interface InventoryViewProps {
  projectTrees: ProjectTree[];
  totals: { totalCount: number; totalInit: number; totalFinal: number; totalGain: number; byYear: number[] };
  confCounts: Record<ModelConfidence, number>;
  horizon: number;
  dbhUnit: DbhUnit;
  displayDbh: (cm: number) => string;
  removeTree: (id: string) => void;
  updateCount: (id: string, n: number) => void;
  toReport: () => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({
  projectTrees, totals, confCounts, horizon, dbhUnit, displayDbh, removeTree, updateCount, toReport,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Live total strip */}
      <div style={liveStyles.strip}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div className="eyebrow" style={{ color: 'var(--paper-2)', opacity: 0.7 }}>Live lifetime total</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 24, alignItems: 'end', marginTop: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div className="serif" style={{ fontSize: 56, lineHeight: 0.95, color: 'var(--paper)' }}>
                {fmt.kg(totals.totalFinal)}
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--paper-2)', opacity: 0.7 }}>KG CO₂e</div>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--paper-2)', opacity: 0.6, marginTop: 6 }}>
              {fmt.t2(totals.totalFinal)} METRIC TONNES AT YEAR {horizon}
            </div>
          </div>
          <SummaryStat label="Current stock" value={`${fmt.kg(totals.totalInit)} kg`}/>
          <SummaryStat label="New growth" value={`+${fmt.kg(totals.totalGain)} kg`} accent/>
          <SummaryStat label="Trees" value={String(totals.totalCount)}/>
        </div>
        <button
          className="btn"
          onClick={toReport}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)',
          }}
        >
          View impact report <span>→</span>
        </button>
      </div>

      {/* Inventory table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--stone)' }}>
          <div>
            <div className="eyebrow">Inventory</div>
            <h3 className="serif" style={{ fontSize: 22, margin: '2px 0 0' }}>{projectTrees.length} species logged</h3>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {(['exact', 'genus', 'proxy'] as ModelConfidence[]).map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span className={`conf ${k}`} style={{ fontSize: 9, padding: '2px 5px' }}>
                  <span className="sq"/>{k}
                </span>
                <span className="mono">{confCounts[k] || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Qty</th>
                <th>Species</th>
                <th>Current size</th>
                <th>Projected growth</th>
                <th style={{ textAlign: 'right' }}>Impact · Y{horizon}</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {projectTrees.map((t, i) => {
                const end = t.forecastData[t.forecastData.length - 1];
                const deltaDbh = end ? end.dbh - t.initialDbh : 0;
                const total = end ? end.carbonStorage * t.count : 0;
                return (
                  <tr key={t.id} style={{ animation: `fadeUp .4s ease ${i * 0.04}s both` }}>
                    <td>
                      <div style={invStyles.qtyCtrl}>
                        <button onClick={() => updateCount(t.id, Math.max(1, t.count - 1))} style={invStyles.qtyBtn}>−</button>
                        <span className="mono" style={{ minWidth: 20, textAlign: 'center', fontWeight: 500 }}>{t.count}</span>
                        <button onClick={() => updateCount(t.id, t.count + 1)} style={invStyles.qtyBtn}>+</button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--stone)' }}>
                          <TreeSilhouette seed={i} tone={t.modelConfidence === 'proxy' ? 'terracotta' : 'olive'}/>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{t.speciesCommon}</div>
                          <div className="serif" style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>
                            {t.speciesScientific}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <ConfidenceBadge tier={t.modelConfidence} source={t.modelSourceScientific} showSource/>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="mono" style={{ fontSize: 13 }}>{displayDbh(t.initialDbh)} {dbhUnit}</div>
                      <div className="caption mono">{t.initialHeight.toFixed(1)} m tall</div>
                    </td>
                    <td>
                      <div className="mono" style={{ fontSize: 13, color: 'var(--olive-deep)' }}>+{deltaDbh.toFixed(1)} cm</div>
                      <div className="caption mono">over {horizon} yrs</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>{fmt.kg(total)}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>KG CO₂e TOTAL</div>
                    </td>
                    <td>
                      <button onClick={() => removeTree(t.id)} aria-label="Remove" style={invStyles.delBtn}>
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <path d="M2 3 L10 3 M4 3 L4 1 L8 1 L8 3 M3 3 L3 11 L9 11 L9 3" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini timeline */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'baseline' }}>
          <div>
            <div className="eyebrow">Timeline</div>
            <h3 className="serif" style={{ fontSize: 22, margin: '2px 0 0' }}>Carbon by year</h3>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Y0 — Y{horizon}</div>
        </div>
        <MiniBars values={totals.byYear}/>
      </div>
    </div>
  );
};

const SummaryStat: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div>
    <div className="eyebrow" style={{ color: 'var(--paper-2)', opacity: 0.7 }}>{label}</div>
    <div className="mono" style={{
      fontSize: 18, marginTop: 4, fontWeight: 500,
      color: accent ? 'var(--terracotta-soft)' : 'var(--paper)',
    }}>
      {value}
    </div>
  </div>
);

const MiniBars: React.FC<{ values: number[] }> = ({ values }) => {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, padding: '0 2px' }}>
      {values.map((v, i) => (
        <div key={i} title={`Year ${i}: ${fmt.kg(v)} kg`}
             style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
            <div style={{
              width: '100%',
              height: `${(v / max) * 100}%`,
              background: i === 0 ? 'var(--terracotta)' : 'var(--olive)',
              opacity: i === values.length - 1 ? 1 : 0.75,
            }}/>
          </div>
          {(i === 0 || i === values.length - 1 || i % 5 === 0) && (
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>{i}</span>
          )}
        </div>
      ))}
    </div>
  );
};

const formStyles: Record<string, React.CSSProperties> = {
  ac: {
    position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
    background: 'var(--paper)', border: '1px solid var(--stone-2)',
    borderRadius: 'var(--r-sm)', zIndex: 20, boxShadow: 'var(--shadow-lift)',
    maxHeight: 280, overflowY: 'auto',
  },
  acItem: {
    display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
    background: 'transparent', border: 'none', borderBottom: '1px solid var(--stone)',
    cursor: 'pointer',
  },
  preview: {
    display: 'flex', gap: 10, alignItems: 'center',
    background: 'var(--olive-wash)', padding: 10, borderRadius: 'var(--r-sm)',
    border: '1px solid var(--olive-soft)', marginTop: 10,
  },
  stepper: {
    display: 'flex', alignItems: 'stretch',
    border: '1px solid var(--stone-2)', borderRadius: 'var(--r-sm)',
    overflow: 'hidden', height: 38,
  },
  stepBtn: {
    width: 34, border: 'none', background: 'var(--paper-2)',
    cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)',
  },
  stepInput: {
    flex: 1, border: 'none', outline: 'none', textAlign: 'center',
    fontFamily: 'var(--font-mono)', background: 'var(--paper)',
  },
  warning: {
    display: 'flex', gap: 10, padding: 12,
    background: '#f5ecd3', border: '1px solid #e6d9ad',
    borderRadius: 'var(--r-sm)', marginTop: 12,
    color: '#6a5520', fontSize: 12, lineHeight: 1.5,
  },
  guidance: {
    padding: 20, background: 'var(--olive-wash)', border: '1px solid var(--olive-soft)',
    borderRadius: 'var(--r-md)',
  },
};

const liveStyles: Record<string, React.CSSProperties> = {
  strip: {
    position: 'relative', padding: 24,
    background: 'var(--ink)', color: 'var(--paper)',
    borderRadius: 'var(--r-md)', overflow: 'hidden',
  },
};

const invStyles: Record<string, React.CSSProperties> = {
  qtyCtrl: {
    display: 'flex', alignItems: 'center', gap: 6,
    border: '1px solid var(--stone-2)', borderRadius: 'var(--r-pill)',
    padding: 2, width: 'fit-content',
  },
  qtyBtn: {
    width: 22, height: 22, border: 'none', background: 'transparent',
    cursor: 'pointer', borderRadius: '50%', color: 'var(--ink-2)',
    fontSize: 14, lineHeight: 1,
  },
  delBtn: {
    width: 30, height: 30, border: '1px solid var(--stone)', borderRadius: '50%',
    background: 'var(--paper)', color: 'var(--ink-3)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};

export default Calculator;
