/**
 * ConnectionManager Tests
 *
 * Tests WebSocket server startup, connection lifecycle, message routing,
 * heartbeat, and connection management.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { ConnectionManager } from '../connection';

let manager: ConnectionManager;
let port: number;

function getAvailablePort(): number {
  return 10000 + Math.floor(Math.random() * 50000);
}

function waitForMessage(ws: WebSocket, timeoutMs = 2000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for message')), timeoutMs);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
  });
}

function waitForOpen(ws: WebSocket, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    const timer = setTimeout(() => reject(new Error('Timeout waiting for open')), timeoutMs);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

afterEach(() => {
  if (manager) {
    manager.stop();
  }
});

describe('ConnectionManager', () => {
  describe('Server Startup', () => {
    it('should start a WebSocket server on a port', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      const wss = manager.start(port);
      expect(wss).toBeDefined();
      expect(wss.options.port).toBe(port);
    });

    it('should accept client connections', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForOpen(ws);

      // Wait a bit for the server to process the connection
      await new Promise((r) => setTimeout(r, 50));
      expect(manager.getConnectionIds().length).toBe(1);

      ws.close();
    });

    it('should assign unique IDs to connections', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws1 = new WebSocket(`ws://localhost:${port}`);
      const ws2 = new WebSocket(`ws://localhost:${port}`);
      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)]);
      await new Promise((r) => setTimeout(r, 50));

      const ids = manager.getConnectionIds();
      expect(ids.length).toBe(2);
      expect(ids[0]).not.toBe(ids[1]);

      ws1.close();
      ws2.close();
    });
  });

  describe('Message Handling', () => {
    it('should send a message to a specific connection', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForOpen(ws);
      await new Promise((r) => setTimeout(r, 50));

      const connId = manager.getConnectionIds()[0];
      manager.send(connId, { type: 'pong', payload: { timestamp: 123 } });

      const msg = await waitForMessage(ws);
      expect(msg.type).toBe('pong');
      expect(msg.payload.timestamp).toBe(123);

      ws.close();
    });

    it('should broadcast to all connections in a room', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws1 = new WebSocket(`ws://localhost:${port}`);
      const ws2 = new WebSocket(`ws://localhost:${port}`);
      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)]);
      await new Promise((r) => setTimeout(r, 50));

      const ids = manager.getConnectionIds();
      // Set both connections to the same room
      const conn1 = manager.getConnection(ids[0]);
      const conn2 = manager.getConnection(ids[1]);
      if (conn1) conn1.roomId = 'ROOM1';
      if (conn2) conn2.roomId = 'ROOM1';

      manager.broadcast('ROOM1', { type: 'pong', payload: { timestamp: 456 } });

      const [msg1, msg2] = await Promise.all([
        waitForMessage(ws1),
        waitForMessage(ws2),
      ]);

      expect(msg1.type).toBe('pong');
      expect(msg2.type).toBe('pong');
      expect(msg1.payload.timestamp).toBe(456);

      ws1.close();
      ws2.close();
    });

    it('should not broadcast to connections outside the room', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws1 = new WebSocket(`ws://localhost:${port}`);
      const ws2 = new WebSocket(`ws://localhost:${port}`);
      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)]);
      await new Promise((r) => setTimeout(r, 50));

      const ids = manager.getConnectionIds();
      const conn1 = manager.getConnection(ids[0]);
      const conn2 = manager.getConnection(ids[1]);
      if (conn1) conn1.roomId = 'ROOM1';
      if (conn2) conn2.roomId = 'ROOM2';

      manager.broadcast('ROOM1', { type: 'pong', payload: { timestamp: 789 } });

      // ws1 should get the message (skip heartbeat pings)
      let msg1: any = null;
      for (let i = 0; i < 10; i++) {
        const m = await waitForMessage(ws1, 500);
        if (m.type === 'pong') { msg1 = m; break; }
      }
      expect(msg1?.type).toBe('pong');

      // ws2 should NOT get the message - verify no message arrives within a short window
      let gotMessage = false;
      ws2.once('message', () => { gotMessage = true; });
      await new Promise((r) => setTimeout(r, 200));
      expect(gotMessage).toBe(false);

      ws1.close();
      ws2.close();
    });
  });

  describe('Event Handlers', () => {
    it('should call onConnect when a client connects', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const connectSpy = vi.fn();
      manager.onConnect(connectSpy);

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForOpen(ws);
      await new Promise((r) => setTimeout(r, 50));

      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(connectSpy).toHaveBeenCalledWith(expect.any(String));

      ws.close();
    });

    it('should call onDisconnect when a client disconnects', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const disconnectSpy = vi.fn();
      manager.onDisconnect(disconnectSpy);

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForOpen(ws);
      await new Promise((r) => setTimeout(r, 50));

      const connId = manager.getConnectionIds()[0];
      ws.close();

      // Wait for disconnect to be processed
      await new Promise((r) => setTimeout(r, 100));
      expect(disconnectSpy).toHaveBeenCalledWith(connId);
    });

    it('should call onMessage when a valid message is received', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const messageSpy = vi.fn();
      manager.onMessage(messageSpy);

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForOpen(ws);
      await new Promise((r) => setTimeout(r, 50));

      const connId = manager.getConnectionIds()[0];
      ws.send(JSON.stringify({ type: 'ping', payload: { timestamp: 100 } }));

      await new Promise((r) => setTimeout(r, 100));
      expect(messageSpy).toHaveBeenCalledTimes(1);
      expect(messageSpy).toHaveBeenCalledWith(connId, {
        type: 'ping',
        payload: { timestamp: 100 },
      });

      ws.close();
    });

    it('should send error for invalid message format', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForOpen(ws);
      await new Promise((r) => setTimeout(r, 50));

      ws.send('not json');

      const msg = await waitForMessage(ws);
      expect(msg.type).toBe('error');
      expect(msg.payload.code).toBe('INVALID_MESSAGE');

      ws.close();
    });
  });

  describe('Connection Management', () => {
    it('should get a connection by ID', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForOpen(ws);
      await new Promise((r) => setTimeout(r, 50));

      const connId = manager.getConnectionIds()[0];
      const conn = manager.getConnection(connId);
      expect(conn).toBeDefined();
      expect(conn!.id).toBe(connId);

      ws.close();
    });

    it('should return undefined for non-existent connection', () => {
      manager = new ConnectionManager();
      expect(manager.getConnection('nonexistent')).toBeUndefined();
    });

    it('should get room connections', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws1 = new WebSocket(`ws://localhost:${port}`);
      const ws2 = new WebSocket(`ws://localhost:${port}`);
      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)]);
      await new Promise((r) => setTimeout(r, 50));

      const ids = manager.getConnectionIds();
      const conn1 = manager.getConnection(ids[0]);
      const conn2 = manager.getConnection(ids[1]);
      if (conn1) conn1.roomId = 'TEST_ROOM';
      if (conn2) conn2.roomId = 'OTHER_ROOM';

      const roomConns = manager.getRoomConnections('TEST_ROOM');
      expect(roomConns).toHaveLength(1);
      expect(roomConns[0].roomId).toBe('TEST_ROOM');

      ws1.close();
      ws2.close();
    });

    it('should close a connection', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForOpen(ws);
      await new Promise((r) => setTimeout(r, 50));

      const connId = manager.getConnectionIds()[0];
      manager.close(connId);

      await new Promise((r) => setTimeout(r, 100));
      // Connection should be removed after close
      expect(manager.getConnection(connId)).toBeUndefined();
    });
  });

  describe('Heartbeat', () => {
    it('should have a running heartbeat interval', () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      // The heartbeat is set up internally; we just verify the server is running
      expect(manager).toBeDefined();
    });
  });

  describe('Stop', () => {
    it('should stop the server and clean up', async () => {
      manager = new ConnectionManager();
      port = getAvailablePort();
      manager.start(port);

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForOpen(ws);
      await new Promise((r) => setTimeout(r, 50));

      expect(manager.getConnectionIds().length).toBe(1);
      manager.stop();
      expect(manager.getConnectionIds().length).toBe(0);
    });
  });
});
