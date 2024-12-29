import React from 'react';

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
        <label>
          <input
            type="checkbox"
            name="verboseLog"
            checked={settings.verboseLog}
            onChange={handleChange}
          />
          Verbose Logging
        </label>
      </div>
      <div className="form-group">
        <label>
          Single Holder Ownership (%):
          <input
            type="number"
            name="singleHolderOwnership"
            value={settings.singleHolderOwnership}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Low Liquidity Threshold (USD):
          <input
            type="number"
            name="lowLiquidity"
            value={settings.lowLiquidity}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <h3>Not Allowed Conditions</h3>
        {settings.notAllowed.map((condition, index) => (
          <div key={index} className="not-allowed-condition">
            <input
              type="text"
              value={condition}
              onChange={(e) => handleNotAllowedChange(index, e.target.value)}
            />
            <button onClick={() => removeNotAllowedCondition(index)}>Remove</button>
          </div>
        ))}
        <button onClick={addNotAllowedCondition}>Add Condition</button>
      </div>
    </div>
  );
};

export default RugCheckSettings;
