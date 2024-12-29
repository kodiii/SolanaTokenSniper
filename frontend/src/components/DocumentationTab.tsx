import React from 'react';
import Accordion from './Accordion';

const DocumentationTab: React.FC = () => {
  return (
    <div className="documentation-tab">
      <h2>Settings Documentation</h2>
      
      <Accordion title="Wallet Settings">
        <div className="setting-detail">
          <h4>Private Key</h4>
          <p>
            Your wallet's private key used for signing transactions. 
            Keep this secure and never share it. For enhanced security, 
            consider using a wallet connection instead.
          </p>
        </div>
      </Accordion>

      <Accordion title="RPC Settings">
        <div className="setting-detail">
          <h4>Main RPC URL</h4>
          <p>
            The primary endpoint for Solana network interactions. 
            This should be a reliable, high-performance RPC node.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Fallback RPC URL</h4>
          <p>
            A secondary RPC endpoint used when the main RPC is unavailable. 
            Helps maintain application availability during outages.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Transaction RPC URL</h4>
          <p>
            Dedicated endpoint for sending transactions. Using a separate 
            RPC for transactions can improve success rates and reduce 
            conflicts with read operations.
          </p>
        </div>
      </Accordion>

      <Accordion title="Liquidity Pool Settings">
        <div className="setting-detail">
          <h4>Ignore Pump.fun</h4>
          <p>
            Exclude tokens from the Pump.fun platform from being traded. 
            Useful for avoiding certain types of tokens.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Radiyum Program ID</h4>
          <p>
            The program ID for the Radiyum protocol. This identifies the 
            specific version of the protocol to interact with.
          </p>
        </div>
        <div className="setting-detail">
          <h4>WSOL PC Mint</h4>
          <p>
            The mint address for wrapped SOL (WSOL). This is used in 
            liquidity pool operations.
          </p>
        </div>
      </Accordion>

      <Accordion title="Transaction Settings">
        <div className="setting-detail">
          <h4>Retry Interval</h4>
          <p>
            Time (in milliseconds) between transaction retry attempts. 
            Helps manage network congestion.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Retry Timeout</h4>
          <p>
            Total time (in milliseconds) to keep retrying a transaction 
            before giving up.
          </p>
        </div>
        <div className="setting-detail">
          <h4>API Timeout</h4>
          <p>
            Maximum time (in milliseconds) to wait for API responses 
            before timing out.
          </p>
        </div>
      </Accordion>

      <Accordion title="Swap Settings">
        <div className="setting-detail">
          <h4>Verbose Logging</h4>
          <p>
            Enable detailed logging for swap operations. Useful for 
            debugging but may impact performance.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Priority Fee</h4>
          <p>
            Maximum lamports to pay as a priority fee for transactions. 
            Higher fees can improve transaction processing speed.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Priority Level</h4>
          <p>
            The priority level for transactions. Higher levels may 
            result in faster processing but cost more.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Swap Amount</h4>
          <p>
            The amount of lamports to swap in each transaction. 
            Adjust based on your trading strategy.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Slippage</h4>
          <p>
            Allowed price slippage in basis points (1/100th of a percent). 
            Higher values allow for more price movement during execution.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Database Path</h4>
          <p>
            File path for storing holdings data. Ensure this is accessible 
            and has sufficient storage.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Retry Attempts</h4>
          <p>
            Number of times to retry a failed swap due to 400 errors. 
            Helps handle temporary issues.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Retry Delay</h4>
          <p>
            Time (in milliseconds) between swap retry attempts. 
            Helps manage rate limits and network issues.
          </p>
        </div>
      </Accordion>

      <Accordion title="Sell Settings">
        <div className="setting-detail">
          <h4>Auto Sell</h4>
          <p>
            Enable automatic selling based on configured rules. 
            Requires proper stop loss and take profit settings.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Stop Loss</h4>
          <p>
            Percentage drop from purchase price to trigger an automatic sell. 
            Helps limit losses.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Take Profit</h4>
          <p>
            Percentage gain from purchase price to trigger an automatic sell. 
            Helps lock in profits.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Track Wallet</h4>
          <p>
            Public wallet address to monitor for transactions. 
            Useful for tracking specific wallets.
          </p>
        </div>
      </Accordion>

      <Accordion title="Rug Check Settings">
        <div className="setting-detail">
          <h4>Verbose Logging</h4>
          <p>
            Enable detailed logging for rug check operations. 
            Useful for debugging but may impact performance.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Single Holder Ownership</h4>
          <p>
            Maximum percentage of tokens a single wallet can hold. 
            Helps identify potential rug pulls.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Low Liquidity Threshold</h4>
          <p>
            Minimum liquidity (in USD) required for a token to be considered safe. 
            Helps avoid illiquid tokens.
          </p>
        </div>
        <div className="setting-detail">
          <h4>Not Allowed Conditions</h4>
          <p>
            List of conditions that make a token ineligible for trading. 
            Helps filter out risky tokens.
          </p>
        </div>
      </Accordion>
    </div>
  );
};

export default DocumentationTab;
