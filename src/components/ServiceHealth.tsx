import React, { useEffect, useState } from 'react';
import { telemetry } from '@/utils/telemetry';
import { ServiceManager } from '@/utils/serviceManager';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  name: string;
  healthy: boolean;
  metrics: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageLatency: number;
  };
  recentErrors: Array<{
    timestamp: number;
    message: string;
  }>;
}

const ServiceHealth: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const updateServiceStatus = () => {
    const serviceManager = ServiceManager.getInstance();
    const serviceNames = ['vectorStore', 'openai', 'documentation'] as const;

    const statuses = serviceNames.map(name => {
      const health = telemetry.getServiceHealth(name);
      return {
        name,
        healthy: health.healthy,
        metrics: health.metrics,
        recentErrors: health.recentEvents
          .filter(e => e.type === 'error')
          .map(e => ({
            timestamp: e.timestamp,
            message: e.message
          }))
      };
    });

    setServices(statuses);
    setLoading(false);
  };

  useEffect(() => {
    updateServiceStatus();
    const interval = setInterval(updateServiceStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    return null;
  }

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 p-4 bg-background border rounded-lg shadow-lg">
        <RefreshCw className="animate-spin h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-background border rounded-lg shadow-lg max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Service Health</h3>
        <button
          onClick={updateServiceStatus}
          className="p-1 hover:bg-accent rounded-full"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-start space-x-3 text-sm border-t pt-2"
          >
            <div className="flex-shrink-0 mt-1">
              {service.healthy ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium capitalize">{service.name}</p>
                <span className="text-xs text-muted-foreground">
                  {Math.round(service.metrics.averageLatency)}ms avg
                </span>
              </div>
              
              <div className="mt-1 text-xs text-muted-foreground">
                {service.metrics.successfulCalls}/{service.metrics.totalCalls} successful calls
              </div>

              {service.recentErrors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {service.recentErrors.slice(0, 2).map((error, i) => (
                    <div
                      key={i}
                      className="flex items-start space-x-2 text-xs text-red-500"
                    >
                      <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <span className="flex-1 min-w-0 truncate">
                        {error.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceHealth;