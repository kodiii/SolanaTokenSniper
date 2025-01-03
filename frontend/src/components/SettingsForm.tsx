import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import Accordion from './Accordion';
import LiquidityPoolSettings from './LiquidityPoolSettings';
import TransactionSettings from './TransactionSettings';
import SwapSettings from './SwapSettings';
import SellSettings from './SellSettings';
import RugCheckSettings from './RugCheckSettings';
import { Web3Wallet } from './Web3Wallet';
import './SettingsForm.css';

interface Settings {
  liquidity_pool: {
    ignore_pump_fun: boolean;
    radiyum_program_id: string;
    wsol_pc_mint: string;
  };
  tx: {
    get_retry_interval: number;
    get_retry_timeout: number;
    get_timeout: number;
  };
  swap: {
    verbose_log: boolean;
    prio_fee_max_lamports: number;
    prio_level: string;
    amount: string;
    slippage_bps: string;
    db_name_tracker_holdings: string;
    token_not_tradable_400_error_retries: number;
    token_not_tradable_400_error_delay: number;
  };
  sell: {
    prio_fee_max_lamports: number;
    prio_level: string;
    slippage_bps: string;
    auto_sell: boolean;
    stop_loss_percent: number;
    take_profit_percent: number;
    track_public_wallet: string;
  };
  rug_check: {
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
  };
}

const SettingsForm: React.FC = () => {
  const [privateKey, setPrivateKey] = useState('');
  const [walletPublicKey, setWalletPublicKey] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<WalletAdapterNetwork | null>(null);
  const [mainRpc, setMainRpc] = useState('https://mainnet.helius-rpc.com/?api-key=');
  const [fallbackRpc, setFallbackRpc] = useState('wss://mainnet.helius-rpc.com/?api-key=');
  const [transactionRpc, setTransactionRpc] = useState('https://api.helius.xyz/v0/transactions/?api-key=');
  
  const [settings, setSettings] = useState<Settings>({
    liquidity_pool: {
      ignore_pump_fun: false,
      radiyum_program_id: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
      wsol_pc_mint: "So11111111111111111111111111111111111111112"
    },
    tx: {
      get_retry_interval: 750,
      get_retry_timeout: 20000,
      get_timeout: 10000
    },
    swap: {
      verbose_log: true,
      prio_fee_max_lamports: 1000000,
      prio_level: "veryHigh",
      amount: "10000000",
      slippage_bps: "200",
      db_name_tracker_holdings: "src/tracker/holdings.db",
      token_not_tradable_400_error_retries: 5,
      token_not_tradable_400_error_delay: 2000
    },
    sell: {
      prio_fee_max_lamports: 1000000,
      prio_level: "veryHigh",
      slippage_bps: "200",
      auto_sell: true,
      stop_loss_percent: 2,
      take_profit_percent: 10,
      track_public_wallet: ""
    },
    rug_check: {
      provider: 'rugcheck.xyz',
      rugcheck_xyz: {
        verbose_log: true,
        single_holder_ownership: 30,
        low_liquidity: 1000,
        not_allowed: ["Freeze Authority still enabled", "Copycat token"],
      },
      helius: {
        verbose_log: true,
        token_age_min_days: 0.000347, // 30 seconds in days (30 / (24 * 60 * 60))
        min_liquidity_sol: 10,
        min_holders: 50,
        max_single_holder_percentage: 30,
        required_dexes: ["raydium", "orca"],
        min_dexes_with_liquidity: 1,
        creator_checks: {
          min_creator_account_age_days: 30,
          check_creator_other_tokens: true,
          max_failed_tokens_by_creator: 3
        },
        permissions: {
          allow_freeze_authority: false,
          allow_mint_authority: false
        },
        trading_pattern: {
          min_successful_swaps: 5,
          max_failed_swaps_percentage: 20,
          min_unique_holders_traded: 10
        },
        simulation: {
          enabled: true,
          min_success_rate: 90,
          max_price_impact_percentage: 5
        }
      }
    }
  });

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');

  // Fetch initial config from backend or localStorage
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // First, try to get config from localStorage
        const storedSettings = localStorage.getItem('tokenSniperSettings');
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          setSettings(parsedSettings);
          return;
        }

        // If no localStorage settings, fetch from backend
        const response = await fetch('http://localhost:45678/api/config');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }
        const config = await response.json();
        setSettings(config);
        
        // Save fetched config to localStorage
        localStorage.setItem('tokenSniperSettings', JSON.stringify(config));
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      // First update the .env file
      const envContent = `
        ${privateKey ? `PRIV_KEY_WALLET="${privateKey}"` : `WALLET_PUBLIC_KEY="${walletPublicKey}"`}
        HELIUS_HTTPS_URI="${mainRpc}"
        HELIUS_WSS_URI="${fallbackRpc}"
        HELIUS_HTTPS_URI_TX="${transactionRpc}"
        JUP_HTTPS_QUOTE_URI="https://quote-api.jup.ag/v6/quote"
        JUP_HTTPS_SWAP_URI="https://quote-api.jup.ag/v6/swap"
        JUP_HTTPS_PRICE_URI="https://api.jup.ag/price/v2"
      `.trim();

      console.log('Sending request to update .env file...');
      const envResponse = await fetch('http://localhost:45678/api/update-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: envContent }),
      });

      if (!envResponse.ok) {
        const errorData = await envResponse.json();
        throw new Error(errorData.message || 'Failed to update .env file');
      }

      // Then update the config file
      const configResponse = await fetch('http://localhost:45678/api/update-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!configResponse.ok) {
        const errorData = await configResponse.json();
        throw new Error(errorData.message || 'Failed to update config');
      }

      // Test the WebSocket connection
      const testResponse = await fetch('http://localhost:45678/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }) // Send settings to validate connection
      });

      if (!testResponse.ok) {
        throw new Error('Failed to test connection');
      }

      const testResult = await testResponse.json();
      
      if (testResult.success) {
        setModalType('success');
        setModalMessage('Settings saved successfully and WebSocket connection established!');
      } else {
        setModalType('error');
        setModalMessage(`Settings saved but WebSocket connection failed: ${testResult.error}`);
      }
      
      setShowModal(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setModalType('error');
      setModalMessage(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowModal(true);
    }
  };

  const handleNetworkChange = (network: WalletAdapterNetwork) => {
    console.log('Network changed:', network);
    setCurrentNetwork(network);
  };

  return (
    <div className="settings-form">
      <h1>Solana Token Sniper Settings</h1>
      <div className="settings-section">
        <h2>Wallet Settings</h2>
        <div className="wallet-input-container">
          <div className="form-group">
            <label>Private Key {privateKey && <span className="ticker">✓</span>}</label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Enter private key"
            />
          </div>
          <div className="wallet-connect-container">
            <Web3Wallet
              onWalletConnected={(publicKey: PublicKey) => setWalletPublicKey(publicKey.toString())}
              onWalletDisconnected={() => setWalletPublicKey(null)}
              onNetworkChange={handleNetworkChange}
            />
            {walletPublicKey && (
              <div className="wallet-info">
                Connected Wallet: {walletPublicKey}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h2>RPC Endpoints</h2>
          {currentNetwork && (
            <div className={`network-badge ${currentNetwork.toLowerCase()}`}>
              {currentNetwork}
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Main RPC URL</label>
          <input
            type="text"
            value={mainRpc}
            onChange={(e) => setMainRpc(e.target.value)}
            placeholder="Enter Helius RPC URL"
          />
        </div>
        <div className="form-group">
          <label>WebSocket RPC URL</label>
          <input
            type="text"
            value={fallbackRpc}
            onChange={(e) => setFallbackRpc(e.target.value)}
            placeholder="Enter Helius WebSocket URL"
          />
        </div>
        <div className="form-group">
          <label>Transaction RPC URL</label>
          <input
            type="text"
            value={transactionRpc}
            onChange={(e) => setTransactionRpc(e.target.value)}
            placeholder="Enter Helius Transaction API URL"
          />
        </div>
      </div>

      <Accordion title="Liquidity Pool Settings">
        <LiquidityPoolSettings 
          settings={settings.liquidity_pool} 
          onChange={(newSettings) => setSettings(prev => ({
            ...prev,
            liquidity_pool: newSettings
          }))}
        />
      </Accordion>

      <Accordion title="Transaction Settings">
        <TransactionSettings 
          settings={settings.tx} 
          onChange={(newSettings) => setSettings(prev => ({
            ...prev,
            tx: newSettings
          }))}
        />
      </Accordion>

      <Accordion title="Swap Settings">
        <SwapSettings 
          settings={settings.swap} 
          onChange={(newSettings) => setSettings(prev => ({
            ...prev,
            swap: newSettings
          }))}
        />
      </Accordion>

      <Accordion title="Sell Settings">
        <SellSettings 
          settings={settings.sell} 
          onChange={(newSettings) => setSettings(prev => ({
            ...prev,
            sell: newSettings
          }))}
        />
      </Accordion>

      <Accordion title="Rug Check Settings">
        <RugCheckSettings 
          settings={settings.rug_check}
          onUpdate={(newSettings) => setSettings(prev => ({
            ...prev,
            rug_check: newSettings
          }))}
        />
      </Accordion>
      <button className="save-settings-button" onClick={handleSave}>Save Settings</button>
      
      {showModal && (
        <div className="modal-overlay">
          <div className={`modal ${modalType}`}>
            <div className="modal-content">
              <h2>{modalType === 'success' ? 'Success!' : 'Error'}</h2>
              <p>{modalMessage}</p>
              <button onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsForm;
