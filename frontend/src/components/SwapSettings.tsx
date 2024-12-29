import React from 'react';

interface SwapSettingsProps {
  settings: {
    verboseLog: boolean;
    prioFeeMaxLamports: number;
    prioLevel: string;
    amount: string;
    slippageBps: string;
    dbNameTrackerHoldings: string;
    tokenNotTradable400ErrorRetries: number;
    tokenNotTradable400ErrorDelay: number;
  };
  onChange: (newSettings: {
    verboseLog: boolean;
    prioFeeMaxLamports: number;
    prioLevel: string;
    amount: string;
    slippageBps: string;
    dbNameTrackerHoldings: string;
    tokenNotTradable400ErrorRetries: number;
    tokenNotTradable400ErrorDelay: number;
  }) => void;
}

const SwapSettings: React.FC<SwapSettingsProps> = ({ settings, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      onChange({
        ...settings,
        [name]: e.target.checked
      });
    } else {
      onChange({
        ...settings,
        [name]: value
      });
    }
  };

  return (
    <div className="settings-section">
      <h2>Swap Settings</h2>
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
          Priority Fee (Lamports):
          <input
            type="number"
            name="prioFeeMaxLamports"
            value={settings.prioFeeMaxLamports}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Priority Level:
          <select
            name="prioLevel"
            value={settings.prioLevel}
            onChange={handleChange}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="veryHigh">Very High</option>
          </select>
        </label>
      </div>
      <div className="form-group">
        <label>
          Swap Amount (Lamports):
          <input
            type="text"
            name="amount"
            value={settings.amount}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Slippage (BPS):
          <input
            type="text"
            name="slippageBps"
            value={settings.slippageBps}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Database Path:
          <input
            type="text"
            name="dbNameTrackerHoldings"
            value={settings.dbNameTrackerHoldings}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Retry Attempts (400 Error):
          <input
            type="number"
            name="tokenNotTradable400ErrorRetries"
            value={settings.tokenNotTradable400ErrorRetries}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Retry Delay (ms):
          <input
            type="number"
            name="tokenNotTradable400ErrorDelay"
            value={settings.tokenNotTradable400ErrorDelay}
            onChange={handleChange}
          />
        </label>
      </div>
    </div>
  );
};

export default SwapSettings;
