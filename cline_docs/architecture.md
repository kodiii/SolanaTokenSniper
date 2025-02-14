# Architecture Diagram - Solana Token Sniper

```mermaid
graph TB
    subgraph External Services
        Solana[Solana Blockchain]
        JupiterAPI[Jupiter V6 Swap API]
        RugCheck[Rugcheck.xyz API]
        DexScreener[Dexscreener API]
        RPC[Helius RPC Node]
    end

    subgraph Core System
        direction TB
        Config[Config Manager]
        EnvValidator[Environment Validator]
        
        subgraph Sniper Module
            TokenDetector[Token Detector]
            RugAnalyzer[Rug Analyzer]
            TradeExecutor[Trade Executor]
            TransactionManager[Transaction Manager]
        end
        
        subgraph Tracker Module
            PriceMonitor[Price Monitor]
            PortfolioManager[Portfolio Manager]
            SLTPExecutor[Stop Loss/Take Profit]
        end
        
        subgraph Data Layer
            DB[(SQLite Database)]
            KeyManager[Key Manager]
        end
    end

    %% External Connections
    Solana <--> RPC
    RPC <--> TokenDetector
    JupiterAPI <--> TradeExecutor
    RugCheck <--> RugAnalyzer
    DexScreener <--> PriceMonitor

    %% Internal Flow
    Config --> EnvValidator
    EnvValidator --> TokenDetector
    TokenDetector --> RugAnalyzer
    RugAnalyzer --> TradeExecutor
    TradeExecutor --> TransactionManager
    TransactionManager --> DB
    
    KeyManager --> TradeExecutor
    KeyManager --> SLTPExecutor
    
    PriceMonitor --> PortfolioManager
    PortfolioManager --> DB
    PortfolioManager --> SLTPExecutor
    SLTPExecutor --> TransactionManager

classDef external fill:red,stroke:#333,stroke-width:2px
classDef core fill:blue,stroke:#333,stroke-width:2px
classDef data fill:green,stroke:#333,stroke-width:2px

class Solana,JupiterAPI,RugCheck,DexScreener,RPC external
class TokenDetector,RugAnalyzer,TradeExecutor,TransactionManager,PriceMonitor,PortfolioManager,SLTPExecutor,Config,EnvValidator core
class DB,KeyManager data