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

