import { io } from 'socket.io-client';

let SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Remove trailing slash if present to avoid dual-slash errors
if (SOCKET_URL.endsWith('/')) {
  SOCKET_URL = SOCKET_URL.slice(0, -1);
}

export const socket = io(SOCKET_URL);
