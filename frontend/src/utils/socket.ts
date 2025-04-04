// frontend/src/utils/socket.ts
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ["websocket", "polling"],
});

export default socket;
