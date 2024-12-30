import React from 'react';
import './Settings.css';

interface RugCheckSettingsProps {
  settings: {
    verboseLog: boolean;
    singleHolderOwnership: number;
    lowLiquidity: number;
    notAllowed: string[];
  };
  onChange: (newSettings: {
    verboseLog: boolean;
    singleHolderOwnership: number;
    lowLiquidity: number;
    notAllowed: string[];
  }) => void;
}

const RugCheckSettings: React.FC<RugCheckSettingsProps> = ({ settings, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    onChange({
      ...settings,
      [name]: type === 'checkbox' ? checked : Number(value)
    });
  };

  const handleNotAllowedChange = (index: number, newValue: string) => {
    const updatedNotAllowed = [...settings.notAllowed];
    updatedNotAllowed[index] = newValue;
    onChange({
      ...settings,
      notAllowed: updatedNotAllowed
    });
  };

  const addNotAllowedCondition = () => {
    onChange({
      ...settings,
      notAllowed: [...settings.notAllowed, '']
    });
  };

  const removeNotAllowedCondition = (index: number) => {
    const updatedNotAllowed = settings.notAllowed.filter((_, i) => i !== index);
    onChange({
      ...settings,
      notAllowed: updatedNotAllowed
    });
  };

  return (
    <div className="settings-section">
      <h2>Rug Check Settings</h2>
      <div className="form-group">
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            id="verboseLog"
            name="verboseLog"
            checked={settings.verboseLog}
            onChange={handleChange}
          />
          <label htmlFor="verboseLog">Enable Verbose Logging</label>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="singleHolderOwnership">Single Holder Ownership (%)</label>
        <input
          type="number"
          id="singleHolderOwnership"
          name="singleHolderOwnership"
          value={settings.singleHolderOwnership}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="lowLiquidity">Low Liquidity Threshold (USD)</label>
        <input
          type="number"
          id="lowLiquidity"
          name="lowLiquidity"
          value={settings.lowLiquidity}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <h3>Not Allowed Conditions</h3>
        {settings.notAllowed.map((condition, index) => (
          <div key={index} className="not-allowed-condition">
            <input
              type="text"
              id={`notAllowed-${index}`}
              value={condition}
              onChange={(e) => handleNotAllowedChange(index, e.target.value)}
              placeholder="Enter condition"
            />
            <button 
              onClick={() => removeNotAllowedCondition(index)}
              className="remove-button"
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={addNotAllowedCondition}>Add Condition</button>
      </div>
    </div>
  );
};

export default RugCheckSettings;
