import { telemetry } from './telemetry';
import { ServiceManager } from './serviceManager';
import { ServiceType } from './types';

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  burstLimit: number;
  cooldownPeriod: number; // in milliseconds
}

interface RateLimitState {
  requests: number;
  lastReset: number;
  burstCount: number;
  lastBurstReset: number;
  isThrottled: boolean;
  cooldownUntil: number;
}

const DEFAULT_LIMITS: Record<ServiceType, RateLimitConfig> = {
  openai: {
    maxRequestsPerMinute: 60,
    burstLimit: 10,
    cooldownPeriod: 60000 // 1 minute
  },
  vectorStore: {
    maxRequestsPerMinute: 100,
    burstLimit: 20,
    cooldownPeriod: 30000 // 30 seconds
  },
  documentation: {
    maxRequestsPerMinute: 120,
    burstLimit: 30,
    cooldownPeriod: 15000 // 15 seconds
  }
};

class RateLimiter {
  private static instance: RateLimiter;
  private limits: Record<ServiceType, RateLimitConfig>;
  private state: Record<ServiceType, RateLimitState>;
  private serviceManager: ServiceManager;

  private constructor() {
    this.limits = { ...DEFAULT_LIMITS };
    this.state = Object.keys(DEFAULT_LIMITS).reduce((acc, service) => ({
      ...acc,
      [service]: this.createInitialState()
    }), {} as Record<ServiceType, RateLimitState>);
    this.serviceManager = ServiceManager.getInstance();
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private createInitialState(): RateLimitState {
    return {
      requests: 0,
      lastReset: Date.now(),
      burstCount: 0,
      lastBurstReset: Date.now(),
      isThrottled: false,
      cooldownUntil: 0
    };
  }

  private resetCounters(service: ServiceType) {
    const now = Date.now();
    const state = this.state[service];

    // Reset minute counter if needed
    if (now - state.lastReset >= 60000) {
      state.requests = 0;
      state.lastReset = now;
    }

    // Reset burst counter if needed
    if (now - state.lastBurstReset >= 1000) {
      state.burstCount = 0;
      state.lastBurstReset = now;
    }

    // Check if cooldown period is over
    if (state.isThrottled && now >= state.cooldownUntil) {
      state.isThrottled = false;
      telemetry.logEvent('info', service, 'Rate limit cooldown period ended');
    }
  }

  private adjustLimits(service: ServiceType) {
    const health = this.serviceManager.getServiceHealth(service);
    const currentLimit = this.limits[service];

    // Reduce limits if service is unhealthy or has high latency
    if (!health.healthy || health.metrics.averageLatency > 2000) {
      const reduction = health.healthy ? 0.8 : 0.5; // Reduce by 20% for high latency, 50% for unhealthy
      this.limits[service] = {
        maxRequestsPerMinute: Math.floor(currentLimit.maxRequestsPerMinute * reduction),
        burstLimit: Math.floor(currentLimit.burstLimit * reduction),
        cooldownPeriod: currentLimit.cooldownPeriod * 2
      };

      telemetry.logEvent('warning', service, 'Rate limits reduced due to service health', {
        reduction,
        newLimits: this.limits[service]
      });
    } else {
      // Gradually restore limits if service is healthy
      this.limits[service] = { ...DEFAULT_LIMITS[service] };
    }
  }

  async checkRateLimit(service: ServiceType): Promise<boolean> {
    this.resetCounters(service);
    this.adjustLimits(service);

    const state = this.state[service];
    const limits = this.limits[service];

    if (state.isThrottled) {
      return false;
    }

    // Check minute limit
    if (state.requests >= limits.maxRequestsPerMinute) {
      state.isThrottled = true;
      state.cooldownUntil = Date.now() + limits.cooldownPeriod;
      telemetry.logEvent('warning', service, 'Rate limit exceeded (per minute)', {
        requests: state.requests,
        limit: limits.maxRequestsPerMinute
      });
      return false;
    }

    // Check burst limit
    if (state.burstCount >= limits.burstLimit) {
      state.isThrottled = true;
      state.cooldownUntil = Date.now() + (limits.cooldownPeriod / 2);
      telemetry.logEvent('warning', service, 'Burst limit exceeded', {
        burstCount: state.burstCount,
        limit: limits.burstLimit
      });
      return false;
    }

    // Increment counters
    state.requests++;
    state.burstCount++;
    return true;
  }

  getRateLimitInfo(service: ServiceType) {
    this.resetCounters(service);
    const state = this.state[service];
    const limits = this.limits[service];

    return {
      currentRequests: state.requests,
      maxRequests: limits.maxRequestsPerMinute,
      burstCount: state.burstCount,
      burstLimit: limits.burstLimit,
      isThrottled: state.isThrottled,
      cooldownRemaining: Math.max(0, state.cooldownUntil - Date.now()),
      resetIn: 60000 - (Date.now() - state.lastReset)
    };
  }

  clearState(service: ServiceType) {
    this.state[service] = this.createInitialState();
    this.limits[service] = { ...DEFAULT_LIMITS[service] };
  }
}

// Wrapper function for rate-limited operations
export async function withRateLimit<T>(
  service: ServiceType,
  operation: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  const rateLimiter = RateLimiter.getInstance();
  const canProceed = await rateLimiter.checkRateLimit(service);

  if (!canProceed) {
    if (fallback) {
      telemetry.logEvent('info', service, 'Using fallback due to rate limiting');
      return fallback();
    }
    throw new Error(`Rate limit exceeded for ${service}`);
  }

  return operation();
}

export const rateLimiter = RateLimiter.getInstance();