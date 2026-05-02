import { useState } from 'react';

export default function MoveInChecklist({ checklist, loading, onGenerate, hasForm }) {
  const [checked, setChecked] = useState({});

  const toggle = (key) => setChecked(c => ({ ...c, [key]: !c[key] }));

  if (!hasForm) {
    return (
      <div className="checklist-empty">
        <p className="muted">Fill out your profile first, then generate a personalized checklist.</p>
      </div>
    );
  }

  if (!checklist && !loading) {
    return (
      <div className="checklist-empty">
        <p className="muted">Get a personalized move-in checklist tailored to your situation.</p>
        <button className="action-btn" onClick={onGenerate}>
          ✨ Generate My Checklist
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-row">
        <div className="spinner sm" />
        <span className="muted">Building your checklist…</span>
      </div>
    );
  }

  const totalItems = checklist.categories.reduce((sum, c) => sum + c.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="checklist">
      <div className="checklist-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${totalItems ? (checkedCount / totalItems) * 100 : 0}%` }}
          />
        </div>
        <span className="progress-label">{checkedCount} / {totalItems} done</span>
      </div>

      {checklist.categories.map((cat) => (
        <div key={cat.name} className="checklist-category">
          <h4 className="checklist-category-title">{cat.name}</h4>
          {cat.items.map((item) => {
            const key = `${cat.name}::${item}`;
            return (
              <label key={key} className={`checklist-item ${checked[key] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!checked[key]}
                  onChange={() => toggle(key)}
                />
                <span>{item}</span>
              </label>
            );
          })}
        </div>
      ))}

      <button className="action-btn secondary" onClick={onGenerate}>
        🔄 Regenerate
      </button>
    </div>
  );
}
