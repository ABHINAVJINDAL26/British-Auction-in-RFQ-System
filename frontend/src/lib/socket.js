import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';

let SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';

// Remove trailing slash if present
if (SOCKET_URL.endsWith('/')) {
  SOCKET_URL = SOCKET_URL.slice(0, -1);
}

// Ensure the URL points to the Spring WebSocket endpoint
const WS_ENDPOINT = `${SOCKET_URL}/ws`;

export const stompClient = new Client({
  webSocketFactory: () => new SockJS(WS_ENDPOINT),
  reconnectDelay: 5000,
  heartbeatIncoming: 4000,
  heartbeatOutgoing: 4000,
});
