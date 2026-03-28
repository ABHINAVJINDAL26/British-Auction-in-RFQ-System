import { io } from 'socket.io-client';

let SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Remove trailing slash if present
if (SOCKET_URL.endsWith('/')) {
  SOCKET_URL = SOCKET_URL.slice(0, -1);
}

// Lazy connection — don't auto-connect at import time
// This prevents ERR_CONNECTION_REFUSED flood when SOCKET_URL is wrong
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  timeout: 10000,
});
