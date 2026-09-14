import type { Logger } from './logger';

export interface ReceivedJob {
  body: unknown;
  deliveryCount: number;
  messageId: string;
}

export interface DeliverySubscription {
  close(): Promise<void>;
}

export interface DeliveryReceiver {
  subscribe(handlers: {
    processError(error: Error): Promise<void>;
    processMessage(message: ReceivedJob): Promise<void>;
  }): DeliverySubscription;
  complete(message: ReceivedJob): Promise<void>;
  abandon(message: ReceivedJob): Promise<void>;
  deadLetter(message: ReceivedJob, reason: string, description: string): Promise<void>;
  close(): Promise<void>;
}

export interface DeliveryMetrics {
  active: number;
  abandoned: number;
  completed: number;
  deadLettered: number;
  deliveryErrors: number;
  received: number;
}

export class PermanentJobError extends Error {
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = 'PermanentJobError';
  }
}

type JobHandler = (message: ReceivedJob, signal: AbortSignal) => Promise<void>;

export class DeliveryPump {
  private readonly controller = new AbortController();
  private readonly activeTasks = new Set<Promise<void>>();
  private subscription: DeliverySubscription | undefined;
  private stopping = false;
  readonly metrics: DeliveryMetrics = {
    active: 0,
    abandoned: 0,
    completed: 0,
    deadLettered: 0,
    deliveryErrors: 0,
    received: 0,
  };

  constructor(
    private readonly receiver: DeliveryReceiver,
    private readonly handler: JobHandler,
    private readonly logger: Logger,
  ) {}

  start(): void {
    if (this.subscription) throw new Error('Delivery pump has already started.');
    this.subscription = this.receiver.subscribe({
      processMessage: async (message) => this.track(message),
      processError: async (error) => {
        this.metrics.deliveryErrors += 1;
        this.logger.error('Job transport delivery error.', { errorName: error.name });
      },
    });
    this.logger.info('Job delivery pump started.');
  }

  private track(message: ReceivedJob): Promise<void> {
    const task = this.process(message);
    this.activeTasks.add(task);
    this.metrics.active = this.activeTasks.size;
    const removeTask = () => {
      this.activeTasks.delete(task);
      this.metrics.active = this.activeTasks.size;
    };
    // Use both handlers so the cleanup promise cannot become an unhandled rejection.
    void task.then(removeTask, removeTask);
    return task;
  }

  private async process(message: ReceivedJob): Promise<void> {
    this.metrics.received += 1;
    this.logger.info('Job delivery received.', {
      messageId: message.messageId,
      deliveryCount: message.deliveryCount,
    });

    if (this.stopping) {
      await this.receiver.abandon(message);
      this.metrics.abandoned += 1;
      return;
    }

    try {
      await this.handler(message, this.controller.signal);
      await this.receiver.complete(message);
      this.metrics.completed += 1;
      this.logger.info('Job delivery completed.', { messageId: message.messageId });
    } catch (error) {
      if (error instanceof PermanentJobError) {
        await this.receiver.deadLetter(message, error.reason, error.message);
        this.metrics.deadLettered += 1;
        this.logger.warn('Job delivery dead-lettered.', {
          messageId: message.messageId,
          reason: error.reason,
        });
        return;
      }

      await this.receiver.abandon(message);
      this.metrics.abandoned += 1;
      this.logger.warn('Job delivery abandoned for retry.', {
        messageId: message.messageId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  async stop(timeoutMs: number): Promise<boolean> {
    if (this.stopping) return this.activeTasks.size === 0;
    this.stopping = true;
    this.logger.info('Stopping job delivery pump.', { active: this.activeTasks.size });
    // Begin stopping deliveries immediately. Some SDK implementations wait for active
    // handlers in close(), so do not let that consume the worker's whole drain budget.
    const subscriptionClosed = this.subscription?.close() ?? Promise.resolve();

    let timeout: NodeJS.Timeout | undefined;
    const drained = await Promise.race([
      Promise.allSettled([...this.activeTasks]).then(() => true),
      new Promise<false>((resolve) => {
        timeout = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
    if (timeout) clearTimeout(timeout);
    if (!drained) {
      this.controller.abort();
      this.logger.warn(
        'Worker drain deadline expired; active locks will recover by abandon or expiry.',
        {
          active: this.activeTasks.size,
        },
      );
      await Promise.race([
        Promise.allSettled([...this.activeTasks]),
        new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
      ]);
    }
    await Promise.race([
      subscriptionClosed,
      new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
    ]);
    await this.receiver.close();
    return drained;
  }
}
