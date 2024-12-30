import React from 'react';
import './Settings.css';

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
        <label htmlFor="prioFeeMaxLamports">Priority Fee Max (Lamports)</label>
        <input
          type="number"
          id="prioFeeMaxLamports"
          name="prioFeeMaxLamports"
          value={settings.prioFeeMaxLamports}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="prioLevel">Priority Level</label>
        <select
          id="prioLevel"
          name="prioLevel"
          value={settings.prioLevel}
          onChange={handleChange}
          className="select-input"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="veryHigh">Very High</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="amount">Amount</label>
        <input
          type="text"
          id="amount"
          name="amount"
          value={settings.amount}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="slippageBps">Slippage (BPS)</label>
        <input
          type="text"
          id="slippageBps"
          name="slippageBps"
          value={settings.slippageBps}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="dbNameTrackerHoldings">DB Name Tracker Holdings</label>
        <input
          type="text"
          id="dbNameTrackerHoldings"
          name="dbNameTrackerHoldings"
          value={settings.dbNameTrackerHoldings}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="tokenNotTradable400ErrorRetries">Token Not Tradable 400 Error Retries</label>
        <input
          type="number"
          id="tokenNotTradable400ErrorRetries"
          name="tokenNotTradable400ErrorRetries"
          value={settings.tokenNotTradable400ErrorRetries}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="tokenNotTradable400ErrorDelay">Token Not Tradable 400 Error Delay (ms)</label>
        <input
          type="number"
          id="tokenNotTradable400ErrorDelay"
          name="tokenNotTradable400ErrorDelay"
          value={settings.tokenNotTradable400ErrorDelay}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default SwapSettings;
