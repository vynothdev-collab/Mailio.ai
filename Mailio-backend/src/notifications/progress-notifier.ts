/**
 * Sink for verification progress events emitted by the worker. Two
 * implementations exist:
 *
 *   - DirectProgressNotifier (API / monolith): writes straight to the
 *     VerificationGateway socket.io server.
 *   - RedisProgressPublisher (worker): publishes JSON onto a Redis pub/sub
 *     channel. A subscriber in the API process picks it up and forwards to
 *     the gateway.
 *
 * The processor depends only on this token, so the same compiled code runs
 * unchanged in both monolith and split-process deployments.
 */
export abstract class ProgressNotifier {
  abstract emitProgress(
    listId: string,
    payload: { listId: string; processed: number; total: number; pct: number },
  ): void;

  abstract emitListStatusChange(listId: string, status: string): void;

  abstract emitSingleResult(
    userId: string,
    payload: Record<string, unknown>,
  ): void;

  abstract emitJobFailed(
    roomId: string,
    payload: Record<string, unknown>,
  ): void;
}

export const PROGRESS_CHANNEL = 'mailio:progress';

export type ProgressMessage =
  | { kind: 'progress'; listId: string; processed: number; total: number; pct: number }
  | { kind: 'list-status'; listId: string; status: string }
  | { kind: 'single-result'; userId: string; payload: Record<string, unknown> }
  | { kind: 'job-failed'; roomId: string; payload: Record<string, unknown> };
