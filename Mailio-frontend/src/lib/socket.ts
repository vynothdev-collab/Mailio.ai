// Socket.io client for the backend's /verification namespace.
//
// The backend expects the JWT in the handshake `auth.token`. We lazily create
// the socket on first use and reuse it across hooks. Disconnects are explicit
// (no auto-reconnect on logout) — call disconnectSocket() after clearSession().

import { io, Socket } from "socket.io-client";
import { STORAGE_KEYS, getItem } from "@/src/utils/storage";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;

  const token = getItem(STORAGE_KEYS.accessToken) ?? "";
  socket = io(`${BASE_URL}/verification`, {
    transports: ["websocket"],
    auth: { token },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
