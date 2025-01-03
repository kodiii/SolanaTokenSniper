import React from 'react';
import './Settings.css';

interface LiquidityPoolSettingsProps {
  settings: {
    ignore_pump_fun: boolean;
    radiyum_program_id: string;
    wsol_pc_mint: string;
  };
  onChange: (newSettings: {
    ignore_pump_fun: boolean;
    radiyum_program_id: string;
    wsol_pc_mint: string;
  }) => void;
}

const defaultSettings = {
  ignore_pump_fun: false,
  radiyum_program_id: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  wsol_pc_mint: "So11111111111111111111111111111111111111112"
};

const LiquidityPoolSettings: React.FC<LiquidityPoolSettingsProps> = ({ settings = defaultSettings, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? e.target.checked : value;
    
    onChange({
      ...settings,
      [name]: newValue
    });
  };

  return (
    <div className="settings-section">
      <h2>Liquidity Pool Settings</h2>
      <div className="form-group">
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            id="ignore_pump_fun"
            name="ignore_pump_fun"
            checked={settings.ignore_pump_fun}
            onChange={handleChange}
          />
          <label htmlFor="ignore_pump_fun">Ignore Pump.fun</label>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="radiyum_program_id">Radiyum Program ID</label>
        <input
          type="text"
          id="radiyum_program_id"
          name="radiyum_program_id"
          value={settings.radiyum_program_id}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="wsol_pc_mint">WSOL PC Mint</label>
        <input
          type="text"
          id="wsol_pc_mint"
          name="wsol_pc_mint"
          value={settings.wsol_pc_mint}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default LiquidityPoolSettings;
