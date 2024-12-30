import React from 'react';
import './Settings.css';

interface SellSettingsProps {
  settings: {
    prioFeeMaxLamports: number;
    prioLevel: string;
    slippageBps: string;
    autoSell: boolean;
    stopLossPercent: number;
    takeProfitPercent: number;
    trackPublicWallet: string;
  };
  onChange: (newSettings: {
    prioFeeMaxLamports: number;
    prioLevel: string;
    slippageBps: string;
    autoSell: boolean;
    stopLossPercent: number;
    takeProfitPercent: number;
    trackPublicWallet: string;
  }) => void;
}

const SellSettings: React.FC<SellSettingsProps> = ({ settings, onChange }) => {
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
      <h2>Sell Settings</h2>
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
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            id="autoSell"
            name="autoSell"
            checked={settings.autoSell}
            onChange={handleChange}
          />
          <label htmlFor="autoSell">Enable Auto Sell</label>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="stopLossPercent">Stop Loss (%)</label>
        <input
          type="number"
          id="stopLossPercent"
          name="stopLossPercent"
          value={settings.stopLossPercent}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="takeProfitPercent">Take Profit (%)</label>
        <input
          type="number"
          id="takeProfitPercent"
          name="takeProfitPercent"
          value={settings.takeProfitPercent}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="trackPublicWallet">Track Public Wallet</label>
        <input
          type="text"
          id="trackPublicWallet"
          name="trackPublicWallet"
          value={settings.trackPublicWallet}
          onChange={handleChange}
          placeholder="Enter wallet address to track"
        />
      </div>
    </div>
  );
};

export default SellSettings;
