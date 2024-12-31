import React, { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import './Web3Wallet.css';

interface Web3WalletProps {
  onWalletConnected: (publicKey: PublicKey) => void;
  onWalletDisconnected: () => void;
  onNetworkChange?: (network: WalletAdapterNetwork) => void;
}

export const Web3Wallet: React.FC<Web3WalletProps> = ({ 
  onWalletConnected, 
  onWalletDisconnected,
  onNetworkChange 
}) => {
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    const checkNetwork = async () => {
      if (!connected || !publicKey) {
        onWalletDisconnected();
        return;
      }

      onWalletConnected(publicKey);

      try {
        const response = await fetch('/api/update-env', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.error('API error:', await response.json().catch(() => ({})));
          onNetworkChange?.(WalletAdapterNetwork.Mainnet);
          return;
        }
        
        const data = await response.json();
        const rpcUrl = data?.content?.HELIUS_HTTPS_URI || '';
        console.log('RPC URL:', rpcUrl);
        
        const network = rpcUrl.toLowerCase().includes('devnet') 
          ? WalletAdapterNetwork.Devnet 
          : WalletAdapterNetwork.Mainnet;
        
        console.log('Setting network to:', network);
        onNetworkChange?.(network);
      } catch (error) {
        console.error('Error checking network:', error);
        onNetworkChange?.(WalletAdapterNetwork.Mainnet);
      }
    };

    checkNetwork();
  }, [connected, publicKey, onWalletConnected, onWalletDisconnected, onNetworkChange]);

  return (
    <div className="wallet-adapter-dropdown">
      <WalletMultiButton />
    </div>
  );
};
