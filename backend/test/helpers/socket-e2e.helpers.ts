import { io, type Socket } from 'socket.io-client';

const SOCKET_TIMEOUT_MS = 10_000;

export function connectSocket(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connect timeout'));
    }, SOCKET_TIMEOUT_MS);

    const finish = (fn: () => void) => {
      clearTimeout(timer);
      fn();
    };

    socket.on('socket:ready', () => {
      finish(() => resolve(socket));
    });

    socket.on('connect_error', (err) => {
      finish(() => reject(err));
    });
  });
}

export function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 5000,
): Promise<T> {
  return socket.timeout(timeoutMs).emitWithAck(event, payload);
}

export function expectUnauthenticatedSocketRejected(baseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Unauthenticated socket was not rejected in time'));
    }, SOCKET_TIMEOUT_MS);

    socket.on('connect_error', () => {
      clearTimeout(timer);
      socket.disconnect();
      resolve();
    });

    socket.on('disconnect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
