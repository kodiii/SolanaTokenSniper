import React from 'react';
import './Settings.css';
import { formatTimeDuration, parseTimeInput, secondsToDays, daysToSeconds } from '../utils/timeFormat';

export interface RugCheckSettings {
  provider: 'helius' | 'rugcheck.xyz';
  rugcheck_xyz: {
    verbose_log: boolean;
    single_holder_ownership: number;
    low_liquidity: number;
    not_allowed: string[];
  };
  helius: {
    verbose_log: boolean;
    token_age_min_days: number;
    min_liquidity_sol: number;
    min_holders: number;
    max_single_holder_percentage: number;
    required_dexes: string[];
    min_dexes_with_liquidity: number;
    creator_checks: {
      min_creator_account_age_days: number;
      check_creator_other_tokens: boolean;
      max_failed_tokens_by_creator: number;
    };
    permissions: {
      allow_freeze_authority: boolean;
      allow_mint_authority: boolean;
    };
    trading_pattern: {
      min_successful_swaps: number;
      max_failed_swaps_percentage: number;
      min_unique_holders_traded: number;
    };
    simulation: {
      enabled: boolean;
      min_success_rate: number;
      max_price_impact_percentage: number;
    };
  };
}

export interface RugCheckSettingsProps {
  settings: RugCheckSettings;
  onUpdate: (newSettings: RugCheckSettings) => void;
}

export const defaultSettings: RugCheckSettings = {
  provider: 'helius',
  rugcheck_xyz: {
    verbose_log: true,
    single_holder_ownership: 50,
    low_liquidity: 10,
    not_allowed: []
  },
  helius: {
    verbose_log: true,
    token_age_min_days: secondsToDays(300), // 5 minutes default
    min_liquidity_sol: 1,
    min_holders: 10,
    max_single_holder_percentage: 50,
    required_dexes: ['raydium'],
    min_dexes_with_liquidity: 1,
    creator_checks: {
      min_creator_account_age_days: secondsToDays(3600), // 1 hour default
      check_creator_other_tokens: true,
      max_failed_tokens_by_creator: 5
    },
    permissions: {
      allow_freeze_authority: false,
      allow_mint_authority: false
    },
    trading_pattern: {
      min_successful_swaps: 10,
      max_failed_swaps_percentage: 20,
      min_unique_holders_traded: 5
    },
    simulation: {
      enabled: true,
      min_success_rate: 90,
      max_price_impact_percentage: 5
    }
  }
};

export default function RugCheckSettings({ settings = defaultSettings, onUpdate }: RugCheckSettingsProps) {
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({
      ...settings,
      provider: e.target.value as 'helius' | 'rugcheck.xyz'
    });
  };

  const handleTokenAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputSeconds = parseTimeInput(e.target.value);
    onUpdate({
      ...settings,
      helius: {
        ...settings.helius,
        token_age_min_days: secondsToDays(inputSeconds)
      }
    });
  };

  const handleCreatorAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputSeconds = parseTimeInput(e.target.value);
    onUpdate({
      ...settings,
      helius: {
        ...settings.helius,
        creator_checks: {
          ...settings.helius.creator_checks,
          min_creator_account_age_days: secondsToDays(inputSeconds)
        }
      }
    });
  };

  const handleHeliusChange = (section: string, subsection: string | null, field: string, value: any) => {
    const heliusSettings = { ...settings.helius };

    if (section && subsection) {
      const sectionData = heliusSettings[section as keyof typeof heliusSettings];
      if (typeof sectionData === 'object' && sectionData !== null) {
        onUpdate({
          ...settings,
          helius: {
            ...heliusSettings,
            [section]: {
              ...sectionData,
              [subsection]: {
                ...(sectionData as any)[subsection],
                [field]: value
              }
            }
          }
        });
      }
    } else if (section) {
      const sectionData = heliusSettings[section as keyof typeof heliusSettings];
      if (typeof sectionData === 'object' && sectionData !== null) {
        onUpdate({
          ...settings,
          helius: {
            ...heliusSettings,
            [section]: {
              ...sectionData,
              [field]: value
            }
          }
        });
      }
    } else {
      onUpdate({
        ...settings,
        helius: {
          ...heliusSettings,
          [field]: value
        }
      });
    }
  };

  const tokenAgeSeconds = Math.round(daysToSeconds(settings.helius.token_age_min_days));
  const creatorAgeSeconds = Math.round(daysToSeconds(settings.helius.creator_checks.min_creator_account_age_days));

  return (
    <div className="settings-section">
      <h2>Rug Check Settings</h2>
      
      <div className="form-group">
        <label htmlFor="provider">Rug Check Provider</label>
        <select
          id="provider"
          value={settings.provider}
          onChange={handleProviderChange}
          className="select-input"
        >
          <option value="helius">Helius</option>
          <option value="rugcheck.xyz">RugCheck.xyz</option>
        </select>
      </div>

      {settings.provider === 'helius' && (
        <div className="provider-settings">
          <h3>Helius Settings</h3>
          
          {/* Token Age */}
          <div className="form-group">
            <label>
              Minimum Token Age
              <div className="input-tooltip">
                Current value: {formatTimeDuration(tokenAgeSeconds)}
              </div>
            </label>
            <input
              type="number"
              min="0"
              value={tokenAgeSeconds || ''}
              onChange={handleTokenAgeChange}
            />
          </div>

          {/* Creator Age */}
          <div className="form-group">
            <label>
              Minimum Creator Account Age
              <div className="input-tooltip">
                Current value: {formatTimeDuration(creatorAgeSeconds)}
              </div>
            </label>
            <input
              type="number"
              min="0"
              value={creatorAgeSeconds || ''}
              onChange={handleCreatorAgeChange}
            />
          </div>

          {/* DEX Settings */}
          <div className="settings-group">
            <h4>DEX Requirements</h4>
            <div className="form-group">
              <label>Required DEXes (comma-separated)</label>
              <input
                type="text"
                value={settings.helius.required_dexes.join(', ')}
                onChange={(e) => handleHeliusChange('', null, 'required_dexes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              />
            </div>
            <div className="form-group">
              <label>Minimum DEXes with Liquidity</label>
              <input
                type="number"
                min="0"
                value={settings.helius.min_dexes_with_liquidity}
                onChange={(e) => handleHeliusChange('', null, 'min_dexes_with_liquidity', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Creator Checks */}
          <div className="settings-group">
            <h4>Creator Checks</h4>
            <div className="form-group">
              <label>Max Failed Tokens by Creator</label>
              <input
                type="number"
                value={settings.helius.creator_checks.max_failed_tokens_by_creator}
                onChange={(e) => handleHeliusChange('creator_checks', null, 'max_failed_tokens_by_creator', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="checkCreatorOtherTokens"
                  checked={settings.helius.creator_checks.check_creator_other_tokens}
                  onChange={(e) => handleHeliusChange('creator_checks', null, 'check_creator_other_tokens', e.target.checked)}
                />
                <label htmlFor="checkCreatorOtherTokens">Check Creator Other Tokens</label>
              </div>
            </div>
          </div>

          {/* Minimum Liquidity */}
          <div className="settings-group">
            <h4>Liquidity Requirements</h4>
            <div className="form-group">
              <label>Minimum Liquidity (SOL)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={settings.helius.min_liquidity_sol}
                onChange={(e) => handleHeliusChange('', null, 'min_liquidity_sol', Number(e.target.value))}
              />
              <span className="unit">SOL</span>
            </div>
          </div>

          {/* Minimum Holders */}
          <div className="settings-group">
            <h4>Holder Requirements</h4>
            <div className="form-group">
              <label>Minimum Holders</label>
              <input
                type="number"
                min="0"
                value={settings.helius.min_holders}
                onChange={(e) => handleHeliusChange('', null, 'min_holders', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Maximum Single Holder %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.helius.max_single_holder_percentage}
                onChange={(e) => handleHeliusChange('', null, 'max_single_holder_percentage', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Permissions */}
          <div className="settings-group">
            <h4>Permissions</h4>
            <div className="form-group">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="allowFreezeAuthority"
                  checked={settings.helius.permissions.allow_freeze_authority}
                  onChange={(e) => handleHeliusChange('permissions', null, 'allow_freeze_authority', e.target.checked)}
                />
                <label htmlFor="allowFreezeAuthority">Allow Freeze Authority</label>
              </div>
            </div>
            <div className="form-group">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="allowMintAuthority"
                  checked={settings.helius.permissions.allow_mint_authority}
                  onChange={(e) => handleHeliusChange('permissions', null, 'allow_mint_authority', e.target.checked)}
                />
                <label htmlFor="allowMintAuthority">Allow Mint Authority</label>
              </div>
            </div>
          </div>

          {/* Trading Pattern */}
          <div className="settings-group">
            <h4>Trading Pattern</h4>
            <div className="form-group">
              <label>Minimum Successful Swaps</label>
              <input
                type="number"
                min="0"
                value={settings.helius.trading_pattern.min_successful_swaps}
                onChange={(e) => handleHeliusChange('trading_pattern', null, 'min_successful_swaps', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Maximum Failed Swaps %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.helius.trading_pattern.max_failed_swaps_percentage}
                onChange={(e) => handleHeliusChange('trading_pattern', null, 'max_failed_swaps_percentage', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Minimum Unique Holders Traded</label>
              <input
                type="number"
                min="0"
                value={settings.helius.trading_pattern.min_unique_holders_traded}
                onChange={(e) => handleHeliusChange('trading_pattern', null, 'min_unique_holders_traded', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Simulation Settings */}
          <div className="settings-group">
            <h4>Transaction Simulation</h4>
            <div className="form-group">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="simulationEnabled"
                  checked={settings.helius.simulation.enabled}
                  onChange={(e) => handleHeliusChange('simulation', null, 'enabled', e.target.checked)}
                />
                <label htmlFor="simulationEnabled">Enable Transaction Simulation</label>
              </div>
            </div>
            {settings.helius.simulation.enabled && (
              <div>
                <div className="form-group">
                  <label>Minimum Success Rate %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.helius.simulation.min_success_rate}
                    onChange={(e) => handleHeliusChange('simulation', null, 'min_success_rate', Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Price Impact (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.helius.simulation.max_price_impact_percentage}
                    onChange={(e) => handleHeliusChange('simulation', null, 'max_price_impact_percentage', Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
