import { useEffect, useRef } from 'react';
import { fetchVerdict } from '../utils/api';

const HEALTH_COLORS = {
  high: '#22c55e',
  mid: '#f59e0b',
  low: '#ef4444',
};

function healthColor(score) {
  if (score >= 7) return HEALTH_COLORS.high;
  if (score >= 4) return HEALTH_COLORS.mid;
  return HEALTH_COLORS.low;
}

function healthLabel(score) {
  if (score >= 8) return 'Thriving';
  if (score >= 6) return 'Stable';
  if (score >= 4) return 'Stretched';
  return 'At Risk';
}

export default function VerdictPanel({ form, neighborhood, verdict, setVerdict, loading, setLoading }) {
  const prevKey = useRef(null);

  useEffect(() => {
    if (!form || !neighborhood) return;
    const key = `${form.salary}-${form.roommates}-${neighborhood.id}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    setLoading(true);
    fetchVerdict({
      ...form,
      neighborhood,
      neighborhoodStats: {
        avgRent: neighborhood.avgRent,
        walkScore: neighborhood.walkScore,
      },
    })
      .then(setVerdict)
      .catch(err => {
        console.error('Verdict error:', err);
        setVerdict({
          assessment: `As a ${form.jobTitle} earning $${form.salary.toLocaleString()}/yr in ${neighborhood.name}, you're spending ${Math.round((neighborhood.avgRent / (form.salary / 12)) * 100)}% of income on rent. ${neighborhood.avgRent / (form.salary / 12) < 0.35 ? "This is manageable with discipline." : "This will be tight — roommates or a higher-paying role will help."}`,
          healthScore: neighborhood.avgRent / (form.salary / 12) < 0.28 ? 8 : neighborhood.avgRent / (form.salary / 12) < 0.35 ? 6 : 4,
          monthlyBudget: {
            rent: neighborhood.avgRent,
            utilities: 180,
            food: form.lifestyle === 'often' ? 600 : form.lifestyle === 'sometimes' ? 400 : 250,
            transport: form.hasCar ? 350 : 80,
            funMoney: 200,
            savings: Math.max(0, Math.round(form.salary / 12) - neighborhood.avgRent - 180 - 400 - (form.hasCar ? 350 : 80) - 200),
            total: Math.round(form.salary / 12),
          },
          tips: [
            'Consider splitting utilities with roommates to save $80–120/mo.',
            form.hasCar ? 'Parking in SLO can cost $50–150/mo — factor that in.' : 'Without a car, stick to Downtown SLO or Cal Poly area for walkability.',
            'Farmers markets on Thursday nights are cheap and a great SLO tradition.',
          ],
        });
      })
      .finally(() => setLoading(false));
  }, [form, neighborhood, setVerdict, setLoading]);

  if (!neighborhood) {
    return (
      <div className="verdict-panel card">
        <h2 className="section-title">AI Verdict</h2>
        <p className="muted">Click a neighborhood on the map to get your personalized verdict.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="verdict-panel card">
        <h2 className="section-title">AI Verdict</h2>
        <div className="loading-row">
          <div className="spinner sm" />
          <span className="muted">Analyzing your situation…</span>
        </div>
      </div>
    );
  }

  if (!verdict) return null;

  const color = healthColor(verdict.healthScore);

  return (
    <div className="verdict-panel card">
      <div className="verdict-header">
        <h2 className="section-title">AI Verdict — {neighborhood.name}</h2>
        <div className="health-score" style={{ color, borderColor: color }}>
          <span className="score-number">{verdict.healthScore}</span>
          <span className="score-label">{healthLabel(verdict.healthScore)}</span>
        </div>
      </div>

      <p className="verdict-assessment">{verdict.assessment}</p>

      <div className="budget-breakdown">
        <h3>Monthly Budget</h3>
        {Object.entries(verdict.monthlyBudget).filter(([k]) => k !== 'total').map(([key, val]) => (
          <div key={key} className="budget-row">
            <span className="budget-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
            <span className="budget-value" style={{ color: key === 'savings' ? '#22c55e' : '#f1f5f9' }}>
              ${Number(val).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="tips-section">
        <h3>Tips for Your Situation</h3>
        <ul className="tips-list">
          {verdict.tips.map((tip, i) => (
            <li key={i}>
              <span className="tip-icon">💡</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
