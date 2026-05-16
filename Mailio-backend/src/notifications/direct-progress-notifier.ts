import { Injectable, Logger } from '@nestjs/common';
import { VerificationGateway } from '../verification/verification.gateway';
import { ProgressNotifier } from './progress-notifier';

/**
 * Used when the producer (worker) and the gateway live in the same process —
 * either the monolith bootstrap (main.ts) or while we incrementally migrate
 * to split deployments. Just forwards to the gateway directly; no Redis hop.
 */
@Injectable()
export class DirectProgressNotifier extends ProgressNotifier {
  private readonly logger = new Logger(DirectProgressNotifier.name);

  constructor(private readonly gateway: VerificationGateway) {
    super();
  }

  emitProgress(
    listId: string,
    payload: { listId: string; processed: number; total: number; pct: number },
  ): void {
    try {
      this.gateway.emitProgress(listId, payload);
    } catch (e) {
      this.logger.warn(`emitProgress failed: ${(e as Error).message}`);
    }
  }

  emitListStatusChange(listId: string, status: string): void {
    try {
      this.gateway.emitListStatusChange(listId, status);
    } catch (e) {
      this.logger.warn(`emitListStatusChange failed: ${(e as Error).message}`);
    }
  }

  emitSingleResult(userId: string, payload: Record<string, unknown>): void {
    try {
      this.gateway.emitSingleResult(userId, payload);
    } catch (e) {
      this.logger.warn(`emitSingleResult failed: ${(e as Error).message}`);
    }
  }

  emitJobFailed(roomId: string, payload: Record<string, unknown>): void {
    try {
      this.gateway.emitJobFailed(roomId, payload);
    } catch (e) {
      this.logger.warn(`emitJobFailed failed: ${(e as Error).message}`);
    }
  }
}
