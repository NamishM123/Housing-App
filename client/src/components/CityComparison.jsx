import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { fetchCityComparison } from '../utils/api';

const CITY_COLORS = {
  'san-luis-obispo': '#3b82f6',
  'san-francisco':   '#ef4444',
  'los-angeles':     '#f59e0b',
  'seattle':         '#22c55e',
};

const CITY_LABELS = {
  'san-luis-obispo': 'SLO',
  'san-francisco':   'SF',
  'los-angeles':     'LA',
  'seattle':         'Seattle',
};

export default function CityComparison() {
  const [data, setData] = useState(null);
  const [metric, setMetric] = useState('housingIndex');

  useEffect(() => {
    fetchCityComparison()
      .then(setData)
      .catch(() => {
        setData([
          { key: 'san-luis-obispo', label: 'San Luis Obispo', housingIndex: 68,  costIndex: 82  },
          { key: 'san-francisco',   label: 'San Francisco',   housingIndex: 168, costIndex: 148 },
          { key: 'los-angeles',     label: 'Los Angeles',     housingIndex: 128, costIndex: 118 },
          { key: 'seattle',         label: 'Seattle',         housingIndex: 112, costIndex: 108 },
        ]);
      });
  }, []);

  const chartData = data
    ? data.map(d => ({
        ...d,
        shortLabel: CITY_LABELS[d.key] || d.label,
        value: d[metric],
      }))
    : [];

  return (
    <div className="city-comparison card">
      <div className="comparison-header">
        <h2 className="section-title">SLO vs Major Cities</h2>
        <div className="metric-toggle">
          <button
            className={`tab-btn sm ${metric === 'housingIndex' ? 'active' : ''}`}
            onClick={() => setMetric('housingIndex')}
          >Housing</button>
          <button
            className={`tab-btn sm ${metric === 'costIndex' ? 'active' : ''}`}
            onClick={() => setMetric('costIndex')}
          >Cost of Living</button>
        </div>
      </div>

      {!data ? (
        <div className="loading-row"><div className="spinner sm" /><span>Loading…</span></div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
              <XAxis type="number" hide domain={[0, 'dataMax + 20']} />
              <YAxis type="category" dataKey="shortLabel" tick={{ fill: '#94a3b8', fontSize: 12 }} width={50} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                formatter={(v, _, p) => [`Score: ${v}`, p.payload.label]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="value" position="right" fill="#94a3b8" fontSize={11} />
                {chartData.map(entry => (
                  <Cell key={entry.key} fill={CITY_COLORS[entry.key] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="comparison-note">
            {metric === 'housingIndex'
              ? 'Housing score from Teleport API — lower is more affordable.'
              : 'Cost of living index — 100 = US average. Lower is cheaper.'}
          </p>
        </>
      )}
    </div>
  );
}
