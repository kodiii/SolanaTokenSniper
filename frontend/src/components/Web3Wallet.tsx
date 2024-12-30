import React, { useState, useEffect } from 'react';
import './Web3Wallet.css';
import { PublicKey } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletProvider, useWallet, Wallet } from '@solana/wallet-adapter-react';
import { WalletDialogProvider } from '@solana/wallet-adapter-material-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

interface Web3WalletProps {
  onWalletConnected: (publicKey: PublicKey) => void;
  onWalletDisconnected: () => void;
}

const Web3WalletComponent: React.FC<Web3WalletProps> = ({ onWalletConnected, onWalletDisconnected }) => {
  const { publicKey, connected, disconnect, wallets, select } = useWallet();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      onWalletConnected(publicKey);
      setShowModal(false);
    } else {
      onWalletDisconnected();
    }
  }, [connected, publicKey, onWalletConnected, onWalletDisconnected]);

  const handleWalletSelect = (wallet: Wallet) => {
    select(wallet.adapter.name);
  };

  return (
    <div className="web3-wallet">
      <button 
        className="wallet-connect-button"
        onClick={() => setShowModal(true)}
      >
        {connected ? (
          <span>
            {publicKey?.toBase58().slice(0, 4)}...
            {publicKey?.toBase58().slice(-4)}
          </span>
        ) : (
          'Connect Wallet'
        )}
      </button>

      {showModal && (
        <div className="wallet-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="wallet-modal-content" onClick={e => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <h3>Connect Wallet</h3>
              <button 
                className="close-modal"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className="wallet-modal-body">
              {wallets.map((wallet) => (
                <button
                  key={wallet.adapter.name}
                  className="wallet-option"
                  onClick={() => handleWalletSelect(wallet)}
                >
                  <img 
                    src={wallet.adapter.icon} 
                    alt={wallet.adapter.name}
                  />
                  {wallet.adapter.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {connected && (
        <button 
          className="wallet-disconnect-button"
          onClick={disconnect}
        >
          Disconnect
        </button>
      )}
    </div>
  );
};

export const Web3Wallet: React.FC<Web3WalletProps> = (props) => {
  const network = WalletAdapterNetwork.Mainnet;
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network }),
  ];

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletDialogProvider>
        <Web3WalletComponent {...props} />
      </WalletDialogProvider>
    </WalletProvider>
  );
};
