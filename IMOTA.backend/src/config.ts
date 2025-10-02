// src/config.ts
export const API_BASE =
  process.env.API_BASE ?? 'http://localhost:3000'; // adjust if different
export const SOCKET_URL =
  process.env.SOCKET_URL || 'http://localhost:3000';
