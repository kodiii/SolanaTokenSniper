import { config } from "../config.js";
import WebSocket from 'ws';

interface RpcEndpoint {
  url: string;
  region: string;
  weight: number;
  lastResponseTime?: number;
  successRate?: number;
}

interface EndpointMetrics {
  timestamp: number;
  endpoint: string;
  region: string;
  latency: number;
  success: boolean;
  error?: string;
}

interface Message {
  type: string;
  data: unknown;
}

class RPCHealthMonitor {
  private currentEndpoint: RpcEndpoint;
  private fallbackEndpoints: RpcEndpoint[];
  private failureCount: number = 0;
  private lastCheck: number = Date.now();
  private checkInterval: number;
  private checkTimeout: number;
  private maxFailures: number;
  private metrics: EndpointMetrics[] = [];
  private userRegion: string = "auto";
  private messageQueue: Message[] = [];
  private isProcessingMessages = false;
  private ws: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  
  private rateLimitState = {
    lastRequestTime: 0,
    requestsThisMinute: 0,
    currentBackoff: 0,
    rateLimitErrorCount: 0,
    rateLimitResetTime: 0,
    lastErrorType: null as string | null
  };

  private failureDecay = {
    decayInterval: 60000,
    decayAmount: 1,
    lastDecayTime: Date.now()
  };

  private endpointLatencies = new Map<string, number>();
  private endpointWeights = new Map<string, number>();

  constructor() {
    const healthConfig = config.tx.health_check;
    
    // Use the first endpoint from fallback_endpoints as primary
    this.currentEndpoint = healthConfig.fallback_endpoints[0];
    
    // Use all fallback endpoints except the first one as fallbacks
    this.fallbackEndpoints = healthConfig.fallback_endpoints.slice(1);
    
    this.checkInterval = healthConfig.interval;
    this.checkTimeout = healthConfig.timeout;
    this.maxFailures = healthConfig.max_failures;
    this.startMonitoring();
    this.startLatencyMonitoring();
    this.startMetricsCollection();
    this.detectUserRegion();
    this.startMessageProcessing();
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    const wsUrl = this.currentEndpoint.url.replace('https://', 'wss://');
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.wsReconnectAttempts = 0;
      console.log('WebSocket connection established');
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
      this.handleWebSocketError(error);
    });

    this.ws.on('close', (code, reason) => {
      console.log(`WebSocket closed: ${code} - ${reason}`);
      this.scheduleWebSocketReconnect();
    });
  }

  private handleWebSocketError(error: Error) {
    if (error.message.includes('429')) {
      // Handle rate limiting
      const backoffTime = Math.min(60000, 1000 * Math.pow(2, this.wsReconnectAttempts));
      console.log(`Rate limited, retrying in ${backoffTime}ms`);
      setTimeout(() => this.initializeWebSocket(), backoffTime);
      this.wsReconnectAttempts++;
    } else {
      // Handle other errors
      this.rotateEndpoint();
      this.initializeWebSocket();
    }
  }

  private scheduleWebSocketReconnect() {
    const delay = Math.min(60000, 1000 * Math.pow(2, this.wsReconnectAttempts));
    console.log(`Reconnecting WebSocket in ${delay}ms`);
    setTimeout(() => this.initializeWebSocket(), delay);
    this.wsReconnectAttempts++;
  }

  private startMonitoring() {
    setInterval(() => this.checkEndpointHealth(), this.checkInterval);
  }

  private startLatencyMonitoring() {
    setInterval(() => this.updateLatencies(), 30000);
  }

  private startMetricsCollection() {
    setInterval(() => this.collectMetrics(), 60000);
  }

  private detectUserRegion() {
    // Implementation for detecting user region
    this.userRegion = "us-east-1"; // Default region
  }

  private async checkEndpointHealth(): Promise<void> {
    try {
      const response = await fetch(this.currentEndpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        }),
        signal: AbortSignal.timeout(this.checkTimeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.result !== 'ok') {
        throw new Error('Endpoint health check failed');
      }

      // Reset failure count on success
      this.failureCount = 0;
    } catch (error) {
      console.error('Endpoint health check failed:', error instanceof Error ? error.message : 'Unknown error');
      this.failureCount++;
      if (this.failureCount >= this.maxFailures) {
        this.rotateEndpoint();
      }
    }
  }

  private rotateEndpoint() {
    if (this.fallbackEndpoints.length === 0) return;

    // Move current endpoint to end of fallback list
    this.fallbackEndpoints.push(this.currentEndpoint);
    
    // Get next endpoint with highest weight
    const nextEndpoint = this.fallbackEndpoints
      .sort((a, b) => b.weight - a.weight)
      .shift();
    
    if (nextEndpoint) {
      this.currentEndpoint = nextEndpoint;
      this.failureCount = 0;
      console.log(`Rotated to new endpoint: ${this.currentEndpoint.url}`);
      this.initializeWebSocket();
    }
  }

  private async updateLatencies(): Promise<void> {
    for (const endpoint of [this.currentEndpoint, ...this.fallbackEndpoints]) {
      try {
        const start = Date.now();
        await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth'
          }),
          signal: AbortSignal.timeout(5000)
        });
        const latency = Date.now() - start;
        this.endpointLatencies.set(endpoint.url, latency);
      } catch (error) {
        console.error(`Failed to measure latency for ${endpoint.url}:`, error);
      }
    }
  }

  private async collectMetrics(): Promise<void> {
    const metrics: EndpointMetrics[] = [];
    
    for (const endpoint of [this.currentEndpoint, ...this.fallbackEndpoints]) {
      try {
        const start = Date.now();
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth'
          }),
          signal: AbortSignal.timeout(5000)
        });

        const success = response.ok;
        const latency = Date.now() - start;
        
        metrics.push({
          timestamp: Date.now(),
          endpoint: endpoint.url,
          region: endpoint.region,
          latency,
          success
        });
      } catch (error) {
        metrics.push({
          timestamp: Date.now(),
          endpoint: endpoint.url,
          region: endpoint.region,
          latency: -1,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.metrics = metrics;
  }

  private async startMessageProcessing() {
    setInterval(async () => {
      if (this.isProcessingMessages || this.messageQueue.length === 0) return;
      
      const message = this.messageQueue.shift();
      if (!message) return;
      
      this.isProcessingMessages = true;
      
      try {
        await this.processMessage(message);
      } catch (error) {
        console.error("Error processing message:", error);
      } finally {
        this.isProcessingMessages = false;
      }
    }, 10);
  }

  private async processMessage(message: Message): Promise<void> {
    switch (message.type) {
      case "latencyUpdate":
        if (typeof message.data === "object" && message.data !== null) {
          const data = message.data as { endpoint: string; latency: number };
          this.endpointLatencies.set(data.endpoint, data.latency);
        }
        break;
      // Add more message types as needed
    }
  }

  public getCurrentEndpoint(): RpcEndpoint {
    return this.currentEndpoint;
  }

  public getConnectionQuality(): number {
    if (this.failureCount > 0) {
      return 1 - (this.failureCount / this.maxFailures);
    }
    return 1.0;
  }

  public queueMessage(message: Message) {
    this.messageQueue.push(message);
  }

  public getQueueSize(): number {
    return this.messageQueue.length;
  }
}

export const rpcHealthMonitor = new RPCHealthMonitor();