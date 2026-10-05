import { io } from 'socket.io-client';

const RAW_URL = import.meta.env.VITE_API_URL || 'https://eslaah-core-production-bfca.up.railway.app';
const SOCKET_URL = RAW_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});
