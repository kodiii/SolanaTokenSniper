import React from 'react';

interface TransactionSettingsProps {
  settings: {
    getRetryInterval: number;
    getRetryTimeout: number;
    getTimeout: number;
  };
  onChange: (newSettings: {
    getRetryInterval: number;
    getRetryTimeout: number;
    getTimeout: number;
  }) => void;
}

const TransactionSettings: React.FC<TransactionSettingsProps> = ({ settings, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({
      ...settings,
      [name]: Number(value)
    });
  };

  return (
    <div className="settings-section">
      <h2>Transaction Settings</h2>
      <div className="form-group">
        <label htmlFor="getRetryInterval">Retry Interval (ms)</label>
        <input
          type="number"
          id="getRetryInterval"
          name="getRetryInterval"
          value={settings.getRetryInterval}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="getRetryTimeout">Retry Timeout (ms)</label>
        <input
          type="number"
          id="getRetryTimeout"
          name="getRetryTimeout"
          value={settings.getRetryTimeout}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="getTimeout">Timeout (ms)</label>
        <input
          type="number"
          id="getTimeout"
          name="getTimeout"
          value={settings.getTimeout}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default TransactionSettings;
