import React from 'react';
import './Settings.css';

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
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            id="ignorePumpFun"
            name="ignorePumpFun"
            checked={settings.ignorePumpFun}
            onChange={handleChange}
          />
          <label htmlFor="ignorePumpFun">Ignore Pump.fun</label>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="radiyumProgramId">Radiyum Program ID</label>
        <input
          type="text"
          id="radiyumProgramId"
          name="radiyumProgramId"
          value={settings.radiyumProgramId}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="wsolPcMint">WSOL PC Mint</label>
        <input
          type="text"
          id="wsolPcMint"
          name="wsolPcMint"
          value={settings.wsolPcMint}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default LiquidityPoolSettings;
