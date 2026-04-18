import React, { useMemo, useState, useEffect } from 'react';
import { SpeciesInfo, BiomassDensity, GrowthCoefficient } from '../types';
import Modal from './Modal';
import { BotBranch, BotSprig, TreeSilhouette } from './Botanicals';
import { getModelConfidence } from '../services/carbonCalculator';

interface SpeciesBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (s: SpeciesInfo) => void;
  species: SpeciesInfo[];
  densities: BiomassDensity[];
  growthCoeffs: GrowthCoefficient[];
  selectedRegion?: string;
}

const SpeciesBrowser: React.FC<SpeciesBrowserProps> = ({
  open, onClose, onSelect, species, densities, growthCoeffs, selectedRegion,
}) => {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return species;
    return species.filter(s =>
      s.commonName.toLowerCase().includes(needle) ||
      s.scientificName.toLowerCase().includes(needle)
    );
  }, [q, species]);

  const confidenceFor = (scientific: string) =>
    getModelConfidence(scientific, densities, growthCoeffs, selectedRegion);

  if (!open) return null;

  return (
    <Modal onClose={onClose} size="xl">
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
          <div>
            <div className="eyebrow">§8 · Catalog</div>
            <h2 className="serif" style={{ fontSize: 44, margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
              Browse <em style={{ color: 'var(--olive)' }}>species</em>
            </h2>
            <p className="body" style={{ margin: 0, maxWidth: 520 }}>
              Tap a card to populate the form with common and scientific names. Autofills a typical DBH.
            </p>
          </div>
          <BotBranch size={180} style={{ color: 'var(--olive)', opacity: 0.5 }}/>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 16 16"
                 style={{ position: 'absolute', left: 14, top: 14, color: 'var(--ink-3)' }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
              <path d="M11 11 L15 15" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search common or scientific name…"
              className="input"
              style={{ paddingLeft: 40, background: 'var(--paper-2)', border: '1px solid var(--stone)' }}
            />
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {results.length} / {species.length}
          </div>
        </div>
      </div>

      <div style={{ padding: 40 }}>
        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <BotSprig size={80} style={{ color: 'var(--stone-2)', margin: '0 auto 16px' }}/>
            <p className="serif" style={{ fontSize: 24, margin: 0 }}>No species match your search.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {results.map((s, i) => {
              const conf = confidenceFor(s.scientificName);
              return (
                <button
                  key={s.scientificName}
                  onClick={() => { onSelect(s); onClose(); }}
                  style={styles.card}
                >
                  <div style={styles.thumb}>
                    {s.imageUrl
                      ? <img src={s.imageUrl} alt={s.commonName}
                             style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                             onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      : <TreeSilhouette seed={i} tone={i % 3 === 2 ? 'terracotta' : 'olive'}/>}
                    <div style={styles.confBadge}>
                      <span className={`conf ${conf}`} style={{ fontSize: 9, padding: '2px 6px' }}>
                        <span className="sq"/>{conf}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div className="h-m" style={{ fontSize: 14, marginBottom: 2 }}>{s.commonName}</div>
                    <div className="serif" style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)' }}>
                      {s.scientificName}
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginTop: 10, borderTop: '1px solid var(--stone)', paddingTop: 10,
                    }}>
                      <span className="micro">
                        {s.typicalDbh !== undefined
                          ? `${Math.round(s.typicalDbh * 0.5)}–${Math.round(s.typicalDbh * 1.8)} cm typ.`
                          : 'typical DBH varies'}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--terracotta)' }}>Select →</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: '40px 40px 20px',
    borderBottom: '1px solid var(--stone)',
    position: 'sticky',
    top: 0,
    background: 'var(--paper)',
    zIndex: 2,
  },
  card: {
    background: 'var(--paper)',
    border: '1px solid var(--stone)',
    borderRadius: 'var(--r-md)',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
    overflow: 'hidden',
    transition: 'all .2s',
  },
  thumb: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
    borderBottom: '1px solid var(--stone)',
    background: 'var(--olive-wash)',
  },
  confBadge: { position: 'absolute', top: 8, right: 8 },
};

export default SpeciesBrowser;
