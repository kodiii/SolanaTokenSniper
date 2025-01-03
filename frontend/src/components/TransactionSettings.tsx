import React from 'react';

interface TransactionSettingsProps {
  settings: {
    get_retry_interval: number;
    get_retry_timeout: number;
    get_timeout: number;
  };
  onChange: (newSettings: {
    get_retry_interval: number;
    get_retry_timeout: number;
    get_timeout: number;
  }) => void;
}

const defaultSettings = {
  get_retry_interval: 750,
  get_retry_timeout: 20000,
  get_timeout: 10000
};

const TransactionSettings: React.FC<TransactionSettingsProps> = ({ settings = defaultSettings, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);
    onChange({
      ...settings,
      [name]: numValue
    });
  };

  return (
    <div className="settings-section">
      <h2>Transaction Settings</h2>
      <div className="form-group">
        <label htmlFor="get_retry_interval">Retry Interval (ms)</label>
        <input
          type="number"
          id="get_retry_interval"
          name="get_retry_interval"
          value={settings.get_retry_interval}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="get_retry_timeout">Retry Timeout (ms)</label>
        <input
          type="number"
          id="get_retry_timeout"
          name="get_retry_timeout"
          value={settings.get_retry_timeout}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="get_timeout">Timeout (ms)</label>
        <input
          type="number"
          id="get_timeout"
          name="get_timeout"
          value={settings.get_timeout}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default TransactionSettings;
