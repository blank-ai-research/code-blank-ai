import { ServiceState, ServiceType } from './types';
import { telemetry, withTelemetry } from './telemetry';
import { vectorStoreConfig } from './config';
import { createVectorStore } from './vectorStore';
import { DocumentationProcessor } from './documentationProcessor';

export class ServiceManager {
  private static instance: ServiceManager;
  private state: ServiceState = {
    vectorStore: false,
    documentation: false,
    retryCount: 0
  };
  private maxRetries = 3;
  private retryDelay = 5000;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.getInstance().state = {
        vectorStore: false,
        documentation: false,
        retryCount: 0
      };
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize vector store
      await this.initializeVectorStore();

      // Initialize documentation service
      await this.initializeDocumentation();

      // Start health check interval
      this.startHealthCheck();

      telemetry.logEvent('info', 'documentation', 'Services initialized successfully');
    } catch (error) {
      telemetry.logEvent('error', 'documentation', `Service initialization failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async initializeVectorStore(): Promise<void> {
    try {
      await withTelemetry('vectorStore', async () => {
        await createVectorStore([], []);
      });
      
      this.state.vectorStore = true;
      telemetry.logEvent('info', 'vectorStore', 'Vector store initialized');
    } catch (error) {
      this.state.vectorStore = false;
      this.state.lastError = error as Error;
      telemetry.logEvent('error', 'vectorStore', `Vector store initialization failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async initializeDocumentation(): Promise<void> {
    try {
      await withTelemetry('documentation', async () => {
        const docProcessor = new DocumentationProcessor();
        await docProcessor.initialize();
      });
      
      this.state.documentation = true;
      telemetry.logEvent('info', 'documentation', 'Documentation service initialized');
    } catch (error) {
      this.state.documentation = false;
      this.state.lastError = error as Error;
      telemetry.logEvent('error', 'documentation', `Documentation initialization failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.checkServicesHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkServicesHealth() {
    const services: ServiceType[] = ['vectorStore', 'documentation', 'openai'];
    
    for (const service of services) {
      const health = telemetry.getServiceHealth(service);
      
      if (!health.healthy) {
        telemetry.logEvent('warning', service, `Service unhealthy: ${service}`, {
          metrics: health.metrics,
          recentErrors: health.recentEvents
            .filter(e => e.type === 'error')
            .map(e => e.message)
        });

        // Attempt recovery if service is down
        await this.attemptServiceRecovery(service);
      }
    }
  }

  private async attemptServiceRecovery(service: ServiceType) {
    if (this.state.retryCount >= this.maxRetries) {
      telemetry.logEvent('error', service, 'Max retry attempts reached');
      return;
    }

    this.state.retryCount++;
    telemetry.logEvent('info', service, `Attempting service recovery (attempt ${this.state.retryCount}/${this.maxRetries})`);

    try {
      switch (service) {
        case 'vectorStore':
          await this.initializeVectorStore();
          break;
        case 'documentation':
          await this.initializeDocumentation();
          break;
        case 'openai':
          // OpenAI service is stateless, just verify API access
          await this.verifyOpenAIAccess();
          break;
      }

      // Reset retry count on successful recovery
      this.state.retryCount = 0;
      telemetry.logEvent('info', service, 'Service recovered successfully');
    } catch (error) {
      telemetry.logEvent('error', service, `Recovery attempt failed: ${(error as Error).message}`);
      
      // Exponential backoff for next retry
      const delay = this.retryDelay * Math.pow(2, this.state.retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async verifyOpenAIAccess(): Promise<void> {
    try {
      // Simple API check
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${vectorStoreConfig.openai.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`OpenAI API check failed: ${response.statusText}`);
      }

      telemetry.logEvent('info', 'openai', 'OpenAI API access verified');
    } catch (error) {
      telemetry.logEvent('error', 'openai', `OpenAI API check failed: ${(error as Error).message}`);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.state.vectorStore && this.state.documentation;
  }

  isServiceHealthy(service: ServiceType): boolean {
    switch (service) {
      case 'vectorStore':
        return this.state.vectorStore;
      case 'documentation':
        return this.state.documentation;
      case 'openai':
        // Check OpenAI service health from telemetry
        return telemetry.getServiceHealth('openai').healthy;
      default:
        return false;
    }
  }

  getServiceHealth(service: ServiceType) {
    return telemetry.getServiceHealth(service);
  }

  getCurrentState(): ServiceState {
    return { ...this.state };
  }

  shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.state = {
      vectorStore: false,
      documentation: false,
      retryCount: 0
    };

    telemetry.logEvent('info', 'documentation', 'Services shut down');
  }
}