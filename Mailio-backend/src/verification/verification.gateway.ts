import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/verification',
  transports: ['websocket'],
})
export class VerificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(VerificationGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as Record<string, string>).token ??
        (client.handshake.headers.authorization ?? '').replace('Bearer ', '');

      const payload = this.jwtService.verify<{ sub: string }>(token);
      client.data.userId = payload.sub;
      void client.join(`user:${payload.sub}`);
      this.logger.log(`Client ${client.id} connected as user ${payload.sub}`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.disconnect(true);
      throw new UnauthorizedException();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('join-list')
  handleJoinList(
    @MessageBody() data: { listId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`list:${data.listId}`);
    return { event: 'joined-list', data: { listId: data.listId } };
  }

  emitProgress(
    listId: string,
    payload: { listId: string; processed: number; total: number; pct: number },
  ) {
    this.server.to(`list:${listId}`).emit('verification:progress', payload);
  }

  emitListStatusChange(listId: string, status: string) {
    this.server.to(`list:${listId}`).emit('list:status-change', { listId, status });
  }

  emitSingleResult(userId: string, payload: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit('single:result', payload);
  }

  emitJobFailed(roomId: string, payload: Record<string, unknown>) {
    this.server.to(`list:${roomId}`).emit('verification:failed', payload);
    this.server.to(`user:${roomId}`).emit('verification:failed', payload);
  }
}
