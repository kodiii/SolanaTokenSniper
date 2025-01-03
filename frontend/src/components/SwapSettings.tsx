import React from 'react';
import './Settings.css';

interface SwapSettingsProps {
  settings: {
    verbose_log: boolean;
    prio_fee_max_lamports: number;
    prio_level: string;
    amount: string;
    slippage_bps: string;
    db_name_tracker_holdings: string;
    token_not_tradable_400_error_retries: number;
    token_not_tradable_400_error_delay: number;
  };
  onChange: (newSettings: {
    verbose_log: boolean;
    prio_fee_max_lamports: number;
    prio_level: string;
    amount: string;
    slippage_bps: string;
    db_name_tracker_holdings: string;
    token_not_tradable_400_error_retries: number;
    token_not_tradable_400_error_delay: number;
  }) => void;
}

const defaultSettings = {
  verbose_log: true,
  prio_fee_max_lamports: 1000000,
  prio_level: "veryHigh",
  amount: "10000000",
  slippage_bps: "200",
  db_name_tracker_holdings: "src/tracker/holdings.db",
  token_not_tradable_400_error_retries: 5,
  token_not_tradable_400_error_delay: 2000
};

const SwapSettings: React.FC<SwapSettingsProps> = ({ 
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
      <h2>Swap Settings</h2>
      <div className="form-group">
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            id="verbose_log"
            name="verbose_log"
            checked={settings.verbose_log}
            onChange={handleChange}
          />
          <label htmlFor="verbose_log">Enable Verbose Logging</label>
        </div>
      </div>
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
        <label htmlFor="db_name_tracker_holdings">DB Name Tracker Holdings</label>
        <input
          type="text"
          id="db_name_tracker_holdings"
          name="db_name_tracker_holdings"
          value={settings.db_name_tracker_holdings}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="token_not_tradable_400_error_retries">Token Not Tradable 400 Error Retries</label>
        <input
          type="number"
          id="token_not_tradable_400_error_retries"
          name="token_not_tradable_400_error_retries"
          value={settings.token_not_tradable_400_error_retries}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="token_not_tradable_400_error_delay">Token Not Tradable 400 Error Delay (ms)</label>
        <input
          type="number"
          id="token_not_tradable_400_error_delay"
          name="token_not_tradable_400_error_delay"
          value={settings.token_not_tradable_400_error_delay}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default SwapSettings;
