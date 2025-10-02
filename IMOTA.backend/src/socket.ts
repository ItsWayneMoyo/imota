// src/socket.ts
import client from 'socket.io-client';
import { SOCKET_URL } from './config';

// Infer the socket type from the default export to avoid TS2749
type ClientSocket = ReturnType<typeof client>;

let socket: ClientSocket | null = null;

export function connectSocket(token?: string) {
  socket = client(SOCKET_URL, {
    auth: token ? { token } : undefined,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
