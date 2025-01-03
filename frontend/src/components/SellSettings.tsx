import React from 'react';
import './Settings.css';

interface SellSettingsProps {
  settings: {
    prio_fee_max_lamports: number;
    prio_level: string;
    slippage_bps: string;
    auto_sell: boolean;
    stop_loss_percent: number;
    take_profit_percent: number;
    track_public_wallet: string;
  };
  onChange: (newSettings: {
    prio_fee_max_lamports: number;
    prio_level: string;
    slippage_bps: string;
    auto_sell: boolean;
    stop_loss_percent: number;
    take_profit_percent: number;
    track_public_wallet: string;
  }) => void;
}

const defaultSettings = {
  prio_fee_max_lamports: 1000000,
  prio_level: "veryHigh",
  slippage_bps: "200",
  auto_sell: true,
  stop_loss_percent: 2,
  take_profit_percent: 10,
  track_public_wallet: ""
};

const SellSettings: React.FC<SellSettingsProps> = ({ 
  settings = defaultSettings, 
  onChange 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                    type === 'number' ? parseInt(value) : value;
    
    onChange({
      ...settings,
      [name]: newValue
    });
  };

  return (
    <div className="settings-section">
      <h2>Sell Settings</h2>
      <div className="form-group">
        <label htmlFor="prio_fee_max_lamports">Priority Fee Max (Lamports)</label>
        <input
          type="number"
          id="prio_fee_max_lamports"
          name="prio_fee_max_lamports"
          value={settings.prio_fee_max_lamports}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="prio_level">Priority Level</label>
        <select
          id="prio_level"
          name="prio_level"
          value={settings.prio_level}
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
        <label htmlFor="slippage_bps">Slippage (BPS)</label>
        <input
          type="text"
          id="slippage_bps"
          name="slippage_bps"
          value={settings.slippage_bps}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            id="auto_sell"
            name="auto_sell"
            checked={settings.auto_sell}
            onChange={handleChange}
          />
          <label htmlFor="auto_sell">Enable Auto Sell</label>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="stop_loss_percent">Stop Loss (%)</label>
        <input
          type="number"
          id="stop_loss_percent"
          name="stop_loss_percent"
          value={settings.stop_loss_percent}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="take_profit_percent">Take Profit (%)</label>
        <input
          type="number"
          id="take_profit_percent"
          name="take_profit_percent"
          value={settings.take_profit_percent}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="track_public_wallet">Track Public Wallet</label>
        <input
          type="text"
          id="track_public_wallet"
          name="track_public_wallet"
          value={settings.track_public_wallet}
          onChange={handleChange}
          placeholder="Enter wallet address to track"
        />
      </div>
    </div>
  );
};

export default SellSettings;
