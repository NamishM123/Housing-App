import { useState, useEffect } from 'react';

const MIN = 10_000;
const MAX = 500_000;

export default function IncomeSlider({ value, onChange, maxRent, onMaxRentChange }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [localValue, setLocalValue] = useState(value || 65000);
    const [housingPercent, setHousingPercent] = useState(30);

    useEffect(() => {
        if (value) setLocalValue(value);
    }, [value]);

    const handleSliderChange = (e) => {
        const newValue = Number(e.target.value);
        setLocalValue(newValue);
        onChange(newValue);

        // Update max rent based on housing percentage
        const monthlyIncome = Math.round(newValue / 12);
        const newMaxRent = Math.round((monthlyIncome * housingPercent) / 100);
        onMaxRentChange(newMaxRent);
    };

    const handlePercentChange = (percent) => {
        setHousingPercent(percent);
        const monthlyIncome = Math.round(localValue / 12);
        const newMaxRent = Math.round((monthlyIncome * percent) / 100);
        onMaxRentChange(newMaxRent);
    };

    const monthlyIncome = Math.round(localValue / 12);
    const calculatedMaxRent = Math.round((monthlyIncome * housingPercent) / 100);

    return (
        <div className={`income-slider-widget ${isExpanded ? 'expanded' : ''}`}>
            <button
                className="income-slider-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Adjust income & budget"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span className="income-slider-toggle-label">
                    ${(localValue / 1000).toFixed(0)}k/yr
                </span>
            </button>

            {isExpanded && (
                <div className="income-slider-panel">
                    <div className="income-slider-header">
                        <h3>Adjust Your Budget</h3>
                        <button
                            className="income-slider-close"
                            onClick={() => setIsExpanded(false)}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="income-slider-content">
                        <div className="income-slider-group">
                            <label>Annual Income</label>
                            <div className="income-slider-value">
                                ${localValue.toLocaleString()}
                            </div>
                            <input
                                type="range"
                                min={MIN}
                                max={MAX}
                                step={5000}
                                value={localValue}
                                onChange={handleSliderChange}
                                className="income-range-input"
                            />
                            <div className="income-slider-range-labels">
                                <span>${(MIN / 1000).toFixed(0)}k</span>
                                <span>${(MAX / 1000).toFixed(0)}k</span>
                            </div>
                        </div>

                        <div className="income-slider-divider" />

                        <div className="income-slider-group">
                            <label>Housing Budget</label>
                            <div className="housing-percent-buttons">
                                {[25, 28, 30, 35, 40].map(percent => (
                                    <button
                                        key={percent}
                                        className={`housing-percent-btn ${housingPercent === percent ? 'active' : ''}`}
                                        onClick={() => handlePercentChange(percent)}
                                    >
                                        {percent}%
                                    </button>
                                ))}
                            </div>
                            <div className="income-slider-summary">
                                <div className="summary-row">
                                    <span>Monthly income</span>
                                    <span className="summary-value">${monthlyIncome.toLocaleString()}</span>
                                </div>
                                <div className="summary-row highlight">
                                    <span>Max rent ({housingPercent}%)</span>
                                    <span className="summary-value">${calculatedMaxRent.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
