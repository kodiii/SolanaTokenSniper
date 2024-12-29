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
        <label>
          Retry Interval (ms):
          <input
            type="number"
            name="getRetryInterval"
            value={settings.getRetryInterval}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Retry Timeout (ms):
          <input
            type="number"
            name="getRetryTimeout"
            value={settings.getRetryTimeout}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          API Timeout (ms):
          <input
            type="number"
            name="getTimeout"
            value={settings.getTimeout}
            onChange={handleChange}
          />
        </label>
      </div>
    </div>
  );
};

export default TransactionSettings;
