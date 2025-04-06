import { ServiceManager } from './serviceManager';
import { ServiceType } from './types';

interface TelemetryEvent {
  timestamp: number;
  type: 'error' | 'warning' | 'info';
  service: 'vectorStore' | 'openai' | 'documentation';
  message: string;
  metadata?: Record<string, any>;
}

interface ServiceMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageLatency: number;
  lastError?: Error;
  lastSuccessful?: number;
}

class TelemetryService {
  private static instance: TelemetryService;
  private events: TelemetryEvent[] = [];
  private metrics: Record<string, ServiceMetrics> = {
    vectorStore: this.initializeMetrics(),
    openai: this.initializeMetrics(),
    documentation: this.initializeMetrics()
  };
  private maxEvents = 1000;

  private constructor() {}

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private initializeMetrics(): ServiceMetrics {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageLatency: 0
    };
  }

  logEvent(
    type: TelemetryEvent['type'],
    service: TelemetryEvent['service'],
    message: string,
    metadata?: Record<string, any>
  ) {
    const event: TelemetryEvent = {
      timestamp: Date.now(),
      type,
      service,
      message,
      metadata
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    if (type === 'error') {
      console.error(`[${service.toUpperCase()}] ${message}`, metadata);
    }
  }

  recordServiceCall(
    service: keyof typeof this.metrics,
    startTime: number,
    success: boolean,
    error?: Error
  ) {
    const metrics = this.metrics[service];
    const duration = Date.now() - startTime;

    metrics.totalCalls++;
    if (success) {
      metrics.successfulCalls++;
      metrics.lastSuccessful = Date.now();
    } else {
      metrics.failedCalls++;
      metrics.lastError = error;
    }

    // Update moving average
    metrics.averageLatency = (metrics.averageLatency * (metrics.totalCalls - 1) + duration) / metrics.totalCalls;
  }

  getServiceHealth(service: keyof typeof this.metrics): {
    healthy: boolean;
    metrics: ServiceMetrics;
    recentEvents: TelemetryEvent[];
  } {
    const metrics = this.metrics[service];
    const recentEvents = this.events
      .filter(e => e.service === service)
      .slice(0, 10);

    const healthy = this.isServiceHealthy(service);

    return {
      healthy,
      metrics,
      recentEvents
    };
  }

  private isServiceHealthy(service: keyof typeof this.metrics): boolean {
    const metrics = this.metrics[service];
    const recentWindow = 5 * 60 * 1000; // 5 minutes

    // Service is considered unhealthy if:
    // 1. No successful calls in the last 5 minutes (if there were any calls)
    // 2. More than 50% failure rate in recent calls
    // 3. Average latency exceeds 5 seconds
    const hasRecentSuccess = !metrics.lastSuccessful || 
      Date.now() - metrics.lastSuccessful < recentWindow;
    const failureRate = metrics.failedCalls / Math.max(metrics.totalCalls, 1);
    const acceptableLatency = metrics.averageLatency < 5000;

    return hasRecentSuccess && failureRate < 0.5 && acceptableLatency;
  }

  getRecentErrors(): TelemetryEvent[] {
    return this.events.filter(e => e.type === 'error').slice(0, 10);
  }

  clearMetrics() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key as keyof typeof this.metrics] = this.initializeMetrics();
    });
    this.events = [];
  }
}

// Wrapper function for monitoring service calls
export async function withTelemetry<T>(
  service: ServiceType,
  operation: () => Promise<T>
): Promise<T> {
  const telemetry = TelemetryService.getInstance();
  const startTime = Date.now();

  try {
    const result = await operation();
    telemetry.recordServiceCall(service, startTime, true);
    return result;
  } catch (error) {
    telemetry.recordServiceCall(service, startTime, false, error as Error);
    telemetry.logEvent('error', service as ServiceType, (error as Error).message, {
      stack: (error as Error).stack
    });
    throw error;
  }
}

export const telemetry = TelemetryService.getInstance();