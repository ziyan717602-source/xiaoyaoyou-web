/**
 * Integration Tests
 *
 * Tests the full server workflow: multiple clients connect, create rooms,
 * join rooms, start games, and interact via the message protocol.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import WebSocket from 'ws';
import { createServer } from '../index';

let server: Awaited<ReturnType<typeof createServer>>;
let port: number;

function getAvailablePort(): number {
  return 20000 + Math.floor(Math.random() * 40000);
}

function createClient(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function sendMsg(ws: WebSocket, msg: object): void {
  ws.send(JSON.stringify(msg));
}

function waitForMsg(ws: WebSocket, type: string, timeoutMs = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for message type: ${type}`)),
      timeoutMs,
    );
    const handler = (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === type) {
        clearTimeout(timer);
        ws.removeListener('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

function waitForAnyMsg(ws: WebSocket, timeoutMs = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for message')), timeoutMs);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
  });
}

function closeClient(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }
    ws.once('close', () => resolve());
    ws.close();
  });
}

beforeEach(async () => {
  port = getAvailablePort();
  server = await createServer(port);
});

afterEach(async () => {
  // Close any lingering connections
  if (server) {
    server.wss.clients.forEach((ws) => ws.close());
    server.connectionManager.stop();
  }
});

describe('Integration: Server', () => {
  describe('Client Connection', () => {
    it('should accept client connections', async () => {
      const client = await createClient();
      expect(client.readyState).toBe(WebSocket.OPEN);
      await closeClient(client);
    });

    it('should accept multiple clients', async () => {
      const client1 = await createClient();
      const client2 = await createClient();
      expect(client1.readyState).toBe(WebSocket.OPEN);
      expect(client2.readyState).toBe(WebSocket.OPEN);
      await closeClient(client1);
      await closeClient(client2);
    });
  });

  describe('Room Management', () => {
    it('should create a room and return room_created', async () => {
      const client = await createClient();
      sendMsg(client, { type: 'create_room', payload: { playerCount: 4, packages: [1] } });

      const msg = await waitForMsg(client, 'room_created');
      expect(msg.payload.roomId).toBeDefined();
      expect(msg.payload.roomId.length).toBe(6);

      await closeClient(client);
    });

    it('should join a room and receive room_joined', async () => {
      const host = await createClient();
      sendMsg(host, { type: 'create_room', payload: { playerName: 'Host', playerCount: 4, packages: [1] } });

      const created = await waitForMsg(host, 'room_created');
      const roomId = created.payload.roomId;
      // Host is auto-joined on create_room
      expect(created.payload.players.length).toBe(1);

      // Second player joins
      const player2 = await createClient();
      sendMsg(player2, { type: 'join_room', payload: { roomId, playerName: 'P2' } });
      const joined = await waitForMsg(player2, 'room_joined');
      expect(joined.payload.roomId).toBe(roomId);
      expect(joined.payload.players.length).toBe(2);

      await closeClient(host);
      await closeClient(player2);
    });

    it('should list rooms', async () => {
      const client = await createClient();

      // Create a room first
      sendMsg(client, { type: 'create_room', payload: { playerCount: 4, packages: [1] } });
      await waitForMsg(client, 'room_created');

      // List rooms
      sendMsg(client, { type: 'list_rooms' });
      const msg = await waitForMsg(client, 'room_list');
      expect(msg.payload.rooms.length).toBe(1);

      await closeClient(client);
    });

    it('should notify other players when someone joins', async () => {
      const host = await createClient();
      sendMsg(host, { type: 'create_room', payload: { playerName: 'Host', playerCount: 4, packages: [1] } });
      const created = await waitForMsg(host, 'room_created');
      const roomId = created.payload.roomId;
      // Host is auto-joined

      // Second player joins
      const player2 = await createClient();
      sendMsg(player2, { type: 'join_room', payload: { roomId, playerName: 'Player2' } });

      // Both should see the join notification
      const [hostNotification, player2Joined] = await Promise.all([
        waitForMsg(host, 'player_joined'),
        waitForMsg(player2, 'room_joined'),
      ]);

      expect(hostNotification.payload.playerName).toBe('Player2');
      expect(hostNotification.payload.players.length).toBe(2);
      expect(player2Joined.payload.players.length).toBe(2);

      await closeClient(host);
      await closeClient(player2);
    });

    it('should return error when room is full', async () => {
      const host = await createClient();
      sendMsg(host, { type: 'create_room', payload: { playerName: 'Host', playerCount: 2, packages: [1] } });
      const created = await waitForMsg(host, 'room_created');
      const roomId = created.payload.roomId;
      // Host is auto-joined (1/2)

      // Player2 joins (2/2 - room full)
      const player2 = await createClient();
      sendMsg(player2, { type: 'join_room', payload: { roomId, playerName: 'Player2' } });
      await waitForMsg(player2, 'room_joined');

      // Player3 tries to join a full room
      const player3 = await createClient();
      sendMsg(player3, { type: 'join_room', payload: { roomId, playerName: 'Player3' } });
      const error = await waitForMsg(player3, 'error');
      expect(error.payload.code).toBe('ROOM_FULL');

      await closeClient(host);
      await closeClient(player2);
      await closeClient(player3);
    });

    it('should return error for non-existent room', async () => {
      const client = await createClient();
      sendMsg(client, { type: 'join_room', payload: { roomId: 'XXXXXX', playerName: 'Alice' } });

      const error = await waitForMsg(client, 'error');
      expect(error.payload.code).toBe('ROOM_NOT_FOUND');

      await closeClient(client);
    });

    it('should return error for duplicate player name', async () => {
      const host = await createClient();
      sendMsg(host, { type: 'create_room', payload: { playerCount: 4, packages: [1] } });
      const created = await waitForMsg(host, 'room_created');
      const roomId = created.payload.roomId;

      sendMsg(host, { type: 'join_room', payload: { roomId, playerName: 'Alice' } });
      await waitForMsg(host, 'room_joined');

      // Same name tries to join
      sendMsg(host, { type: 'join_room', payload: { roomId, playerName: 'Alice' } });
      const error = await waitForMsg(host, 'error');
      expect(error.payload.code).toBe('NAME_TAKEN');

      await closeClient(host);
    });
  });

  describe('Ping/Pong', () => {
    it('should respond to ping with pong', async () => {
      const client = await createClient();
      sendMsg(client, { type: 'ping', payload: { timestamp: 12345 } });

      const msg = await waitForMsg(client, 'pong');
      expect(msg.payload.timestamp).toBe(12345);

      await closeClient(client);
    });
  });

  describe('Message Routing', () => {
    it('should return error for unknown message type', async () => {
      const client = await createClient();
      sendMsg(client, { type: 'totally_unknown' });

      const msg = await waitForMsg(client, 'error');
      expect(msg.payload.code).toBe('UNKNOWN_TYPE');

      await closeClient(client);
    });
  });

  describe('Full Room Workflow', () => {
    it('should handle create -> list -> leave workflow', async () => {
      const client = await createClient();

      // Create room (host auto-joined)
      sendMsg(client, { type: 'create_room', payload: { playerName: 'Alice', playerCount: 4, packages: [1] } });
      const created = await waitForMsg(client, 'room_created');
      const roomId = created.payload.roomId;

      // List rooms - should show 1 room with 1 player
      sendMsg(client, { type: 'list_rooms' });
      const list = await waitForMsg(client, 'room_list');
      expect(list.payload.rooms.length).toBe(1);
      expect(list.payload.rooms[0].playerCount).toBe(1);

      // Leave room
      sendMsg(client, { type: 'leave_room' });
      const left = await waitForMsg(client, 'room_left');
      expect(left.payload.roomId).toBe(roomId);

      // List rooms - should show 0 rooms (auto-destroyed)
      sendMsg(client, { type: 'list_rooms' });
      const list2 = await waitForMsg(client, 'room_list');
      expect(list2.payload.rooms.length).toBe(0);

      await closeClient(client);
    });
  });

  describe('Error Recovery', () => {
    it('should handle invalid JSON gracefully', async () => {
      const client = await createClient();
      client.send('this is not json');

      const msg = await waitForMsg(client, 'error');
      expect(msg.payload.code).toBe('INVALID_MESSAGE');

      await closeClient(client);
    });

    it('should remain connected after receiving an error', async () => {
      const client = await createClient();

      // Send invalid message
      client.send('garbage');
      await waitForMsg(client, 'error');

      // Should still be able to send valid messages
      sendMsg(client, { type: 'ping', payload: { timestamp: 999 } });
      const pong = await waitForMsg(client, 'pong');
      expect(pong.payload.timestamp).toBe(999);

      await closeClient(client);
    });
  });
});
