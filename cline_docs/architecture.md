# Architecture Diagram - Solana Token Sniper

This diagram visualizes the system's architecture including both the real trading flow and the dedicated Paper Trading Module that enables the simulation mode.

```mermaid
flowchart TD
    %% External Services
    subgraph External_Services[External Services]
        Solana[Solana Blockchain]
        JupiterAPI[Jupiter V6 Swap API]
        RugCheck[Rugcheck.xyz API]
        Dexscreener[Dexscreener API]
        RPC[Helius RPC Node]
    end

    %% Core System
    subgraph Core_System[Core System]
        direction TB
        Config[Config Manager]
        EnvValidator[Environment Validator]
        
        %% Real Trading Flow (Sniper Module)
        subgraph Sniper_Module[Sniper Module]
            TokenDetector[Token Detector]
            RugAnalyzer[Rug Analyzer]
            TradeExecutor[Trade Executor]
            TransactionManager[Transaction Manager]
        end

        %% Paper Trading Flow (Simulation Module)
        subgraph Paper_Trading_Module[Paper Trading Module]
            SimulationService[Simulation Service]
            SimulatedTradeExecutor[Simulated Trade Executor]
            SimulatedTransactionManager[Simulated Transaction Manager]
            PaperTrading[(Paper Trading Database)]
        end

        %% Tracker Module & Data Layer (Common)
        subgraph Tracker_Module[Tracker Module]
            PriceMonitor[Price Monitor]
            PortfolioManager[Portfolio Manager]
            SLTPExecutor[Stop Loss / Take Profit]
        end
        
        subgraph Data_Layer[Data & Key Management]
            DB[(SQLite Database)]
            KeyManager[Key Manager]
        end
    end

    %% Flow Connections
    Config --> EnvValidator
    EnvValidator --> TokenDetector
    EnvValidator --> SimulationService

    %% Real Trading Flow
    TokenDetector --> RugAnalyzer
    RugAnalyzer --> TradeExecutor
    TradeExecutor --> TransactionManager
    TransactionManager --> DB
    KeyManager --> TradeExecutor
    KeyManager --> SLTPExecutor

    %% Paper Trading Flow
    RugAnalyzer --> SimulationService
    SimulationService --> SimulatedTradeExecutor
    SimulatedTradeExecutor --> SimulatedTransactionManager
    SimulatedTransactionManager --> PaperTrading
    KeyManager --> SimulatedTransactionManager
    Dexscreener --- SimulationService

    %% Tracker Module (Common for both flows)
    PriceMonitor --> PortfolioManager
    PortfolioManager --> DB
    PortfolioManager --> SLTPExecutor
    SLTPExecutor --> TransactionManager
    SLTPExecutor --> SimulatedTransactionManager

    %% External Service Integrations
    RPC --- TokenDetector
    JupiterAPI --- TradeExecutor
    RugCheck --- RugAnalyzer
    Dexscreener --- PriceMonitor
    Solana --- RPC

    %% Styling Classes
    classDef external fill:orange,stroke:#333,stroke-width:2px;
    classDef core fill:#4169E1,stroke:#333,stroke-width:2px;
    classDef trading fill:blue,stroke:#333,stroke-width:2px;
    classDef simulation fill:red,stroke:#333,stroke-width:2px;
    classDef tracker fill:magenta,stroke:#333,stroke-width:2px;
    classDef data fill:black,stroke:#333,stroke-width:2px;

    class Solana,JupiterAPI,RugCheck,Dexscreener,RPC external;
    class Config,EnvValidator core;
    class TokenDetector,RugAnalyzer,TradeExecutor,TransactionManager trading;
    class SimulationService,SimulatedTradeExecutor,SimulatedTransactionManager simulation;
    class PriceMonitor,PortfolioManager,SLTPExecutor tracker;
    class DB,KeyManager,PaperTrading data;
```

### Explanation

1. **Configuration & Validation:**  
   The system starts with the Config Manager and Environment Validator, which load configuration settings (including the paper trading toggle).

2. **Real Trading Flow (Sniper Module):**  
   The Sniper Module manages token detection, analysis, real trade execution, and transaction management with data stored in the main SQLite database.

3. **Paper Trading Module:**
   When paper trading mode is enabled (`rug_check.simulation_mode`), tokens that pass the rug check are routed to the Simulation Service. The service fetches real-time price data from Dexscreener API and executes virtual trades. Simulated trades are processed by the Simulated Trade Executor and Simulated Transaction Manager, with results recorded in a dedicated Paper Trading Database (`src/tracker/paper_trading.db`). The module maintains a virtual balance and tracks token positions using real market prices.

4. **Tracker Module & Data Layer:**  
   Both real and simulated trades feed into the Tracker Module for portfolio tracking, and share common data and key management functionalities.

5. **External Integrations:**  
   The system interacts with external services (Solana, Jupiter API, RugCheck, Dexscreener, RPC) to fetch real-time data relevant to trading decisions.

Colors Used:
- External Services: Hot Pink (#FF69B4)
- Core Components: Royal Blue (#4169E1)
- Trading Components: Lime Green (#32CD32)
- Simulation Components: Gold (#FFD700)
- Tracker Components: Pale Green (#98FB98)
- Data Components: Dark Gray (#A9A9A9)