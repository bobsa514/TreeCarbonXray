import React, { useMemo, useState } from 'react';
import { ProjectTree, DbhUnit } from '../types';
import { fmt, cmToIn } from '../services/format';
import { BotRings } from './Botanicals';

interface AnalyticsProps {
  projectTrees: ProjectTree[];
  switchToBuilder: () => void;
  horizon: number;
  dbhUnit: DbhUnit;
}

const Analytics: React.FC<AnalyticsProps> = ({ projectTrees, switchToBuilder, horizon, dbhUnit }) => {
  const { byYear, annual, speciesRanked, peakYear, totalFinal } = useMemo(() => {
    if (projectTrees.length === 0) {
      return { byYear: [], annual: [], speciesRanked: [], peakYear: 0, totalFinal: 0 };
    }
    const years = projectTrees[0].forecastData.length;
    const byYear: number[] = Array.from({ length: years }, (_, y) =>
      projectTrees.reduce((a, t) => a + (t.forecastData[y]?.carbonStorage ?? 0) * t.count, 0),
    );
    const annual = byYear.map((v, i, arr) => i === 0 ? 0 : v - arr[i - 1]);

    const speciesRanked = [...projectTrees]
      .map(t => {
        const end = t.forecastData[t.forecastData.length - 1];
        return {
          id: t.id,
          common: t.speciesCommon,
          scientific: t.speciesScientific,
          count: t.count,
          initialDbh: t.initialDbh,
          totalFinal: (end?.carbonStorage ?? 0) * t.count,
          perTreeFinal: end?.carbonStorage ?? 0,
        };
      })
      .sort((a, b) => b.totalFinal - a.totalFinal);

    const totalFinal = speciesRanked.reduce((a, r) => a + r.totalFinal, 0);
    const peakYear = annual.indexOf(Math.max(...annual));
    return { byYear, annual, speciesRanked, peakYear, totalFinal };
  }, [projectTrees]);

  if (projectTrees.length === 0) {
    return (
      <div style={{ padding: '120px 32px', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
        <BotRings size={100} style={{ color: 'var(--stone-2)', margin: '0 auto 20px' }}/>
        <div className="eyebrow">§03 · Visual Analytics</div>
        <h2 className="serif" style={{ fontSize: 48, margin: '8px 0 16px', letterSpacing: '-0.02em' }}>
          No data to chart.
        </h2>
        <p className="body" style={{ margin: '0 auto 24px', maxWidth: 420 }}>
          Build an inventory first — the analytics view needs at least one species to plot.
        </p>
        <button className="btn" onClick={switchToBuilder}>← Back to Project Builder</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 32px 80px', maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', marginBottom: 40, gap: 32 }}>
        <div>
          <div className="eyebrow">§03 · Visual Analytics</div>
          <h1 className="serif" style={{ fontSize: 72, margin: '6px 0 12px', lineHeight: 0.96, letterSpacing: '-0.025em' }}>
            The <em style={{ color: 'var(--olive)' }}>shape</em> of sequestration.
          </h1>
          <p className="body" style={{ maxWidth: 640, fontSize: 16 }}>
            Look past the headline. Understand how and when carbon accumulates, which species do the heavy lifting, and how initial stem size translates to lifetime potential.
          </p>
        </div>
        <div style={styles.peakCard}>
          <div className="eyebrow" style={{ color: 'var(--olive-deep)' }}>Peak Growth Window</div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1, margin: '6px 0' }}>Y{peakYear}</div>
          <div className="caption">Highest annual sequestration rate</div>
        </div>
      </div>

      {/* Chart A — cumulative area */}
      <div className="card" style={{ padding: 32, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="eyebrow">Chart A · Cumulative</div>
            <h3 className="serif" style={{ fontSize: 28, margin: '4px 0 0', letterSpacing: '-0.01em' }}>
              Total Carbon Storage Over Time
            </h3>
          </div>
          <Legend color="var(--olive)" label="Total CO₂ stored"/>
        </div>
        <div style={{ marginTop: 24 }}>
          <AreaChart values={byYear}/>
        </div>
        <div className="caption" style={{ marginTop: 12, fontSize: 11, maxWidth: 680 }}>
          Projected total CO₂ stored by the project inventory (existing stock + new growth) over the planning horizon.
        </div>
      </div>

      {/* Chart B — annual bars */}
      <div className="card" style={{ padding: 32, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="eyebrow">Chart B · Annual rate</div>
            <h3 className="serif" style={{ fontSize: 28, margin: '4px 0 0', letterSpacing: '-0.01em' }}>
              Carbon Sequestered Per Year
            </h3>
          </div>
          <Legend color="var(--terracotta)" label="CO₂ added (kg/yr)"/>
        </div>
        <div style={{ marginTop: 24 }}>
          <BarChart values={annual} peakYear={peakYear}/>
        </div>
        <div className="caption" style={{ marginTop: 12, fontSize: 11 }}>
          Carbon added each year (kg CO₂). <strong style={{ color: 'var(--terracotta-deep)' }}>Peak at Y{peakYear}</strong> — the highest-value growth window.
          Year 0 shows current state (no annual delta). Sequestration rate typically peaks in middle age then tapers.
        </div>
      </div>

      {/* Chart C + species table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card" style={{ padding: 32 }}>
          <div className="eyebrow">Chart C · Ranked</div>
          <h3 className="serif" style={{ fontSize: 24, margin: '4px 0 20px', letterSpacing: '-0.01em' }}>
            Carbon by Species · Y{horizon}
          </h3>
          <SpeciesBars items={speciesRanked}/>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 24, borderBottom: '1px solid var(--stone)' }}>
            <div className="eyebrow">Breakdown</div>
            <h3 className="serif" style={{ fontSize: 24, margin: '4px 0 0', letterSpacing: '-0.01em' }}>Species table</h3>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Species</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>CO₂</th>
                <th style={{ textAlign: 'right' }}>% project</th>
              </tr>
            </thead>
            <tbody>
              {speciesRanked.map(f => (
                <tr key={f.id}>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.common}</div>
                    <div className="serif caption" style={{ fontStyle: 'italic' }}>{f.scientific}</div>
                  </td>
                  <td style={{ textAlign: 'right' }} className="mono">{f.count}</td>
                  <td style={{ textAlign: 'right' }} className="mono">{fmt.kg(f.totalFinal)}</td>
                  <td style={{ textAlign: 'right' }} className="mono">
                    {totalFinal > 0 ? fmt.pct(100 * f.totalFinal / totalFinal) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart D — scatter */}
      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="eyebrow">Chart D · Efficiency</div>
            <h3 className="serif" style={{ fontSize: 28, margin: '4px 0 0', letterSpacing: '-0.01em' }}>
              Sequestration Efficiency
            </h3>
          </div>
          <Legend color="var(--olive)" label="Species (dot size = qty)"/>
        </div>
        <div style={{ marginTop: 24 }}>
          <Scatter items={speciesRanked} unit={dbhUnit}/>
        </div>
        <div className="caption" style={{ marginTop: 12, fontSize: 11 }}>
          Initial DBH vs. Lifetime Carbon Potential per tree. Use to reason about whether planting larger stock pays off in carbon terms.
        </div>
      </div>
    </div>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{ width: 10, height: 10, background: color, borderRadius: 2 }}/>
    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {label}
    </span>
  </div>
);

const AreaChart: React.FC<{ values: number[] }> = ({ values }) => {
  const [hover, setHover] = useState<number | null>(null);
  const w = 1000, h = 320;
  const pad = { t: 20, r: 30, b: 30, l: 60 };
  const max = Math.max(...values, 1);
  const xs = (i: number) => pad.l + (i / Math.max(1, values.length - 1)) * (w - pad.l - pad.r);
  const ys = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(v)}`).join(' ');
  const area = path + ` L ${xs(values.length - 1)} ${h - pad.b} L ${xs(0)} ${h - pad.b} Z`;
  const gridY = [0, 0.25, 0.5, 0.75, 1];
  const tickEvery = Math.max(1, Math.floor(values.length / 10));

  return (
    <svg viewBox={`0 0 ${w} ${h}`}
         style={{ width: '100%', height: 320, display: 'block', overflow: 'visible' }}
         onMouseLeave={() => setHover(null)}>
      {gridY.map((g, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r}
                y1={pad.t + g * (h - pad.t - pad.b)} y2={pad.t + g * (h - pad.t - pad.b)}
                stroke="var(--stone)" strokeWidth="1"
                strokeDasharray={g === 0 || g === 1 ? 'none' : '2 3'}/>
          <text x={pad.l - 10} y={pad.t + g * (h - pad.t - pad.b) + 4}
                textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)">
            {fmt.kg(max * (1 - g))}
          </text>
        </g>
      ))}
      <path d={area} fill="var(--olive)" fillOpacity="0.15"/>
      <path d={path} fill="none" stroke="var(--olive)" strokeWidth="2"/>
      {values.map((_, i) => {
        if (i !== 0 && i !== values.length - 1 && i % tickEvery !== 0) return null;
        return (
          <g key={i}>
            <line x1={xs(i)} x2={xs(i)} y1={h - pad.b} y2={h - pad.b + 4} stroke="var(--ink-3)" strokeWidth="1"/>
            <text x={xs(i)} y={h - pad.b + 18} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)">
              Y{i}
            </text>
          </g>
        );
      })}
      {values.map((v, i) => (
        <g key={'hit' + i} onMouseEnter={() => setHover(i)}>
          <rect x={xs(i) - 10} y={0} width="20" height={h} fill="transparent"/>
          {hover === i && (
            <>
              <line x1={xs(i)} x2={xs(i)} y1={pad.t} y2={h - pad.b} stroke="var(--terracotta)" strokeWidth="1"/>
              <circle cx={xs(i)} cy={ys(v)} r="5" fill="var(--terracotta)" stroke="var(--paper)" strokeWidth="2"/>
              <g transform={`translate(${xs(i)}, ${ys(v) - 20})`}>
                <rect x="-50" y="-28" width="100" height="24" fill="var(--ink)" rx="3"/>
                <text x="0" y="-11" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--paper)">
                  Y{i} · {fmt.kg(v)} kg
                </text>
              </g>
            </>
          )}
        </g>
      ))}
    </svg>
  );
};

const BarChart: React.FC<{ values: number[]; peakYear: number }> = ({ values, peakYear }) => {
  const w = 1000, h = 260;
  const pad = { t: 20, r: 30, b: 30, l: 60 };
  const max = Math.max(...values, 1);
  const barW = (w - pad.l - pad.r) / values.length;
  const labelEvery = Math.max(1, Math.floor(values.length / 8));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 260, display: 'block' }}>
      {[0, 0.5, 1].map((g, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r}
                y1={pad.t + g * (h - pad.t - pad.b)} y2={pad.t + g * (h - pad.t - pad.b)}
                stroke="var(--stone)" strokeWidth="1"
                strokeDasharray={g === 0 || g === 1 ? 'none' : '2 3'}/>
          <text x={pad.l - 10} y={pad.t + g * (h - pad.t - pad.b) + 4}
                textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)">
            {fmt.kg(max * (1 - g))}
          </text>
        </g>
      ))}
      {values.map((v, i) => {
        const bh = (v / max) * (h - pad.t - pad.b);
        const isPeak = i === peakYear;
        return (
          <g key={i}>
            <rect x={pad.l + i * barW + 2} y={h - pad.b - bh}
                  width={barW - 4} height={bh}
                  fill={isPeak ? 'var(--terracotta)' : 'var(--terracotta-soft)'}
                  stroke={isPeak ? 'var(--terracotta-deep)' : 'none'} strokeWidth="1"/>
            {(i === 0 || i === values.length - 1 || i === peakYear || i % labelEvery === 0) && (
              <text x={pad.l + i * barW + barW / 2} y={h - pad.b + 18}
                    textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10"
                    fill={isPeak ? 'var(--terracotta-deep)' : 'var(--ink-3)'}
                    fontWeight={isPeak ? 600 : 400}>
                Y{i}
              </text>
            )}
            {isPeak && (
              <g>
                <line x1={pad.l + i * barW + barW / 2} y1={h - pad.b - bh - 4}
                      x2={pad.l + i * barW + barW / 2} y2={pad.t + 6}
                      stroke="var(--terracotta-deep)" strokeWidth="0.8" strokeDasharray="2 2"/>
                <text x={pad.l + i * barW + barW / 2} y={pad.t}
                      textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9"
                      fill="var(--terracotta-deep)" letterSpacing="0.08em">
                  PEAK
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

interface RankedItem {
  id: string; common: string; scientific: string;
  count: number; initialDbh: number;
  totalFinal: number; perTreeFinal: number;
}

const SpeciesBars: React.FC<{ items: RankedItem[] }> = ({ items }) => {
  const max = Math.max(...items.map(f => f.totalFinal), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((f, i) => (
        <div key={f.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{f.common}</span>
              <span className="serif" style={{ fontStyle: 'italic', color: 'var(--ink-3)', marginLeft: 8, fontSize: 12 }}>
                × {f.count}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{fmt.kg(f.totalFinal)} kg</div>
          </div>
          <div style={{ height: 12, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(f.totalFinal / max) * 100}%`,
              background: i === 0 ? 'var(--olive)' : i === 1 ? 'var(--olive-deep)' : 'var(--olive-soft)',
              transition: 'width .3s ease',
            }}/>
          </div>
        </div>
      ))}
    </div>
  );
};

const Scatter: React.FC<{ items: RankedItem[]; unit: DbhUnit }> = ({ items, unit }) => {
  const w = 1000, h = 300;
  const pad = { t: 20, r: 30, b: 40, l: 70 };
  const toX = (dbh: number) => unit === 'in' ? cmToIn(dbh) : dbh;
  const xVals = items.map(f => toX(f.initialDbh));
  const yVals = items.map(f => f.perTreeFinal);
  const maxX = Math.max(...xVals, 10) * 1.1;
  const maxY = Math.max(...yVals, 1) * 1.1;
  const xs = (v: number) => pad.l + (v / maxX) * (w - pad.l - pad.r);
  const ys = (v: number) => pad.t + (1 - v / maxY) * (h - pad.t - pad.b);
  const maxQty = Math.max(...items.map(f => f.count), 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 300, display: 'block', overflow: 'visible' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r}
                y1={pad.t + g * (h - pad.t - pad.b)} y2={pad.t + g * (h - pad.t - pad.b)}
                stroke="var(--stone)"
                strokeDasharray={g === 0 || g === 1 ? 'none' : '2 3'}/>
          <text x={pad.l - 10} y={pad.t + g * (h - pad.t - pad.b) + 4}
                textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)">
            {fmt.kg(maxY * (1 - g))}
          </text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <text key={i} x={pad.l + g * (w - pad.l - pad.r)} y={h - pad.b + 18}
              textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)">
          {(maxX * g).toFixed(0)} {unit}
        </text>
      ))}
      <text x={pad.l} y={h - 4} fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="0.08em">
        INITIAL DBH ({unit.toUpperCase()})
      </text>
      <text x={pad.l - 50} y={pad.t + 10}
            fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="0.08em"
            transform={`rotate(-90 ${pad.l - 50} ${pad.t + 10})`}>
        CO₂ / TREE (KG)
      </text>
      {items.map(f => {
        const r = 6 + 12 * (f.count / maxQty);
        const x = xs(toX(f.initialDbh));
        const y = ys(f.perTreeFinal);
        return (
          <g key={f.id}>
            <circle cx={x} cy={y} r={r} fill="var(--olive)" fillOpacity="0.25" stroke="var(--olive)" strokeWidth="1.4"/>
            <text x={x} y={y - r - 6} textAnchor="middle"
                  fontFamily="var(--font-sans)" fontSize="11" fill="var(--ink)" fontWeight="500">
              {f.common}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const styles: Record<string, React.CSSProperties> = {
  peakCard: {
    padding: '16px 24px',
    background: 'var(--olive-wash)',
    border: '1px solid var(--olive-soft)',
    borderRadius: 'var(--r-md)',
    minWidth: 200,
  },
};

export default Analytics;
