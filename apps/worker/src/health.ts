import { createServer, type Server } from 'node:http';

import type { DeliveryMetrics } from './delivery-pump';
import type { Logger } from './logger';

export type DependencyName = 'database' | 'objectStorage' | 'serviceBus';
export type DependencyChecks = Record<DependencyName, () => Promise<void>>;

interface DependencyStatus {
  checkedAt: string | null;
  latencyMs: number | null;
  status: 'unknown' | 'up' | 'down';
}

export class HealthMonitor {
  private timer: NodeJS.Timeout | undefined;
  private checking: Promise<void> | undefined;
  private shuttingDown = false;
  readonly dependencies: Record<DependencyName, DependencyStatus> = {
    database: { checkedAt: null, latencyMs: null, status: 'unknown' },
    objectStorage: { checkedAt: null, latencyMs: null, status: 'unknown' },
    serviceBus: { checkedAt: null, latencyMs: null, status: 'unknown' },
  };

  constructor(
    private readonly checks: DependencyChecks,
    private readonly intervalMs: number,
    private readonly timeoutMs: number,
    private readonly logger: Logger,
  ) {}

  get ready(): boolean {
    return (
      !this.shuttingDown &&
      Object.values(this.dependencies).every((dependency) => dependency.status === 'up')
    );
  }

  markShuttingDown(): void {
    this.shuttingDown = true;
  }

  async checkNow(): Promise<void> {
    if (this.checking) return this.checking;
    this.checking = Promise.all(
      (Object.keys(this.checks) as DependencyName[]).map(async (name) => {
        const startedAt = Date.now();
        let timeout: NodeJS.Timeout | undefined;
        try {
          await Promise.race([
            this.checks[name](),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error('Health check timed out.')),
                this.timeoutMs,
              );
            }),
          ]);
          this.dependencies[name] = {
            checkedAt: new Date().toISOString(),
            latencyMs: Date.now() - startedAt,
            status: 'up',
          };
        } catch (error) {
          this.dependencies[name] = {
            checkedAt: new Date().toISOString(),
            latencyMs: Date.now() - startedAt,
            status: 'down',
          };
          this.logger.warn('Worker dependency health check failed.', {
            dependency: name,
            errorName: error instanceof Error ? error.name : 'UnknownError',
          });
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }),
    ).then(() => undefined);
    try {
      await this.checking;
    } finally {
      this.checking = undefined;
    }
  }

  async start(): Promise<void> {
    await this.checkNow();
    this.timer = setInterval(() => void this.checkNow(), this.intervalMs);
    this.timer.unref();
  }

  async stop(): Promise<void> {
    this.markShuttingDown();
    if (this.timer) clearInterval(this.timer);
    await this.checking;
  }
}

export function startHealthServer(
  port: number,
  monitor: HealthMonitor,
  metrics: DeliveryMetrics,
  workerId: string,
): Promise<Server> {
  const server = createServer((request, response) => {
    const common = {
      service: 'sport-analytics-worker',
      workerId,
      timestamp: new Date().toISOString(),
    };
    response.setHeader('content-type', 'application/json; charset=utf-8');

    if (request.method !== 'GET') {
      response.writeHead(405).end(JSON.stringify({ ...common, status: 'method_not_allowed' }));
      return;
    }
    if (request.url === '/health/live') {
      response.writeHead(200).end(JSON.stringify({ ...common, status: 'live' }));
      return;
    }
    if (request.url === '/health/ready' || request.url === '/health/status') {
      response.writeHead(monitor.ready ? 200 : 503).end(
        JSON.stringify({
          ...common,
          status: monitor.ready ? 'ready' : 'not_ready',
          dependencies: monitor.dependencies,
          deliveries: metrics,
        }),
      );
      return;
    }
    response.writeHead(404).end(JSON.stringify({ ...common, status: 'not_found' }));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

export function closeHealthServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
