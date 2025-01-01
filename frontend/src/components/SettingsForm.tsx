import React, { useState } from 'react';
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
  liquidityPool: {
    ignorePumpFun: boolean;
    radiyumProgramId: string;
    wsolPcMint: string;
  };
  transaction: {
    getRetryInterval: number;
    getRetryTimeout: number;
    getTimeout: number;
  };
  swap: {
    verboseLog: boolean;
    prioFeeMaxLamports: number;
    prioLevel: string;
    amount: string;
    slippageBps: string;
    dbNameTrackerHoldings: string;
    tokenNotTradable400ErrorRetries: number;
    tokenNotTradable400ErrorDelay: number;
  };
  sell: {
    prioFeeMaxLamports: number;
    prioLevel: string;
    slippageBps: string;
    autoSell: boolean;
    stopLossPercent: number;
    takeProfitPercent: number;
    trackPublicWallet: string;
  };
  rugCheck: {
    verboseLog: boolean;
    singleHolderOwnership: number;
    lowLiquidity: number;
    notAllowed: string[];
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
    liquidityPool: {
      ignorePumpFun: false,
      radiyumProgramId: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
      wsolPcMint: "So11111111111111111111111111111111111111112",
    },
    transaction: {
      getRetryInterval: 750,
      getRetryTimeout: 20000,
      getTimeout: 10000,
    },
    swap: {
      verboseLog: false,
      prioFeeMaxLamports: 1000000,
      prioLevel: "veryHigh",
      amount: "10000000",
      slippageBps: "200",
      dbNameTrackerHoldings: "src/tracker/holdings.db",
      tokenNotTradable400ErrorRetries: 5,
      tokenNotTradable400ErrorDelay: 2000,
    },
    sell: {
      prioFeeMaxLamports: 1000000,
      prioLevel: "veryHigh",
      slippageBps: "200",
      autoSell: false,
      stopLossPercent: 100,
      takeProfitPercent: 20,
      trackPublicWallet: "",
    },
    rugCheck: {
      verboseLog: false,
      singleHolderOwnership: 30,
      lowLiquidity: 1000,
      notAllowed: ["Freeze Authority still enabled", "Copycat token"],
    },
  });

  const handleSave = async () => {
    try {
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
      const response = await fetch('/api/update-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: envContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update .env file');
      }

      const data = await response.json();
      console.log('Settings saved successfully:', data.message);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          settings={settings.liquidityPool} 
          onChange={(newSettings) => setSettings({ ...settings, liquidityPool: newSettings })}
        />
      </Accordion>

      <Accordion title="Transaction Settings">
        <TransactionSettings 
          settings={settings.transaction} 
          onChange={(newSettings) => setSettings({ ...settings, transaction: newSettings })}
        />
      </Accordion>

      <Accordion title="Swap Settings">
        <SwapSettings 
          settings={settings.swap} 
          onChange={(newSettings) => setSettings({ ...settings, swap: newSettings })}
        />
      </Accordion>

      <Accordion title="Sell Settings">
        <SellSettings 
          settings={settings.sell} 
          onChange={(newSettings) => setSettings({ ...settings, sell: newSettings })}
        />
      </Accordion>

      <Accordion title="Rug Check Settings">
        <RugCheckSettings 
          settings={settings.rugCheck} 
          onChange={(newSettings) => setSettings({ ...settings, rugCheck: newSettings })}
        />
      </Accordion>
      <button className="save-settings-button" onClick={handleSave}>Save Settings</button>
    </div>
  );
};

export default SettingsForm;
