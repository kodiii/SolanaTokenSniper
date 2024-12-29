import React from 'react';

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
          <input
            type="checkbox"
            name="autoSell"
            checked={settings.autoSell}
            onChange={handleChange}
          />
          Auto Sell
        </label>
      </div>
      <div className="form-group">
        <label>
          Stop Loss (%):
          <input
            type="number"
            name="stopLossPercent"
            value={settings.stopLossPercent}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Take Profit (%):
          <input
            type="number"
            name="takeProfitPercent"
            value={settings.takeProfitPercent}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Track Public Wallet:
          <input
            type="text"
            name="trackPublicWallet"
            value={settings.trackPublicWallet}
            onChange={handleChange}
          />
        </label>
      </div>
    </div>
  );
};

export default SellSettings;
