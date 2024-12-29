import React from 'react';

interface LiquidityPoolSettingsProps {
  settings: {
    ignorePumpFun: boolean;
    radiyumProgramId: string;
    wsolPcMint: string;
  };
  onChange: (newSettings: {
    ignorePumpFun: boolean;
    radiyumProgramId: string;
    wsolPcMint: string;
  }) => void;
}

const LiquidityPoolSettings: React.FC<LiquidityPoolSettingsProps> = ({ settings, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    onChange({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="settings-section">
      <h2>Liquidity Pool Settings</h2>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            name="ignorePumpFun"
            checked={settings.ignorePumpFun}
            onChange={handleChange}
          />
          Ignore Pump.fun
        </label>
      </div>
      <div className="form-group">
        <label>
          Radiyum Program ID:
          <input
            type="text"
            name="radiyumProgramId"
            value={settings.radiyumProgramId}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          WSOL PC Mint:
          <input
            type="text"
            name="wsolPcMint"
            value={settings.wsolPcMint}
            onChange={handleChange}
          />
        </label>
      </div>
    </div>
  );
};

export default LiquidityPoolSettings;
