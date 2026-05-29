/**
 * ConnectionManager - WebSocket connection lifecycle management
 *
 * Manages WebSocket connections: accept, send, broadcast, heartbeat, disconnect.
 * Each connection gets a unique ID and tracks playerName/roomId association.
 */

import { WebSocket, WebSocketServer } from 'ws';
import type { ClientMessage, ServerMessage } from '../shared/network/protocol';
import { parseMessage, createErrorMessage } from '../shared/network/protocol';

export interface Connection {
  id: string;
  ws: WebSocket;
  playerName: string | null;
  roomId: string | null;
  isAlive: boolean;
  lastPing: number;
}

export type MessageHandler = (
  connectionId: string,
  message: ClientMessage,
) => void;

export type ConnectionHandler = (connectionId: string) => void;

export class ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageHandler: MessageHandler | null = null;
  private connectHandler: ConnectionHandler | null = null;
  private disconnectHandler: ConnectionHandler | null = null;
  private wss: WebSocketServer | null = null;
  private idCounter = 0;

  /**
   * Start a WebSocket server on the given port.
   * Returns the WebSocketServer instance.
   */
  start(port: number): WebSocketServer {
    const wss = new WebSocketServer({ port });
    this.wss = wss;

    wss.on('connection', (ws) => {
      const id = this.generateId();
      const connection: Connection = {
        id,
        ws,
        playerName: null,
        roomId: null,
        isAlive: true,
        lastPing: Date.now(),
      };

      this.connections.set(id, connection);

      ws.on('message', (data) => {
        this.handleMessage(id, data.toString());
      });

      ws.on('close', () => {
        this.handleDisconnect(id);
      });

      ws.on('pong', () => {
        this.handlePong(id);
      });

      // Notify new connection
      this.connectHandler?.(id);
    });

    // Start heartbeat detection
    this.startHeartbeat(wss);

    return wss;
  }

  /**
   * Send a message to a specific connection.
   */
  send(connectionId: string, message: ServerMessage): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast a message to all connections in a room.
   */
  broadcast(roomId: string, message: ServerMessage): void {
    for (const connection of this.connections.values()) {
      if (connection.roomId === roomId) {
        this.send(connection.id, message);
      }
    }
  }

  /**
   * Close a specific connection and remove it.
   */
  close(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.ws.close();
      this.connections.delete(connectionId);
    }
  }

  /**
   * Get a connection by ID.
   */
  getConnection(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  /**
   * Get all connections in a room.
   */
  getRoomConnections(roomId: string): Connection[] {
    return Array.from(this.connections.values()).filter(
      (c) => c.roomId === roomId,
    );
  }

  /**
   * Find a connection by room ID and player name.
   */
  findConnectionByPlayer(roomId: string, playerName: string): Connection | undefined {
    return Array.from(this.connections.values()).find(
      (c) => c.roomId === roomId && c.playerName === playerName,
    );
  }

  /**
   * Get all connection IDs.
   */
  getConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Stop the heartbeat and close the WebSocket server.
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.connections.clear();
  }

  // --- Event Handlers ---

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  onConnect(handler: ConnectionHandler): void {
    this.connectHandler = handler;
  }

  onDisconnect(handler: ConnectionHandler): void {
    this.disconnectHandler = handler;
  }

  // --- Private Methods ---

  private handleMessage(connectionId: string, data: string): void {
    const message = parseMessage(data);
    if (message) {
      this.messageHandler?.(connectionId, message);
    } else {
      this.send(
        connectionId,
        createErrorMessage('INVALID_MESSAGE', 'Invalid message format'),
      );
    }
  }

  private handleDisconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = false;
      this.disconnectHandler?.(connectionId);
      // Delayed removal to allow for reconnection
      setTimeout(() => {
        if (!connection.isAlive) {
          this.connections.delete(connectionId);
        }
      }, 5000);
    }
  }

  private handlePong(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = true;
      connection.lastPing = Date.now();
    }
  }

  private startHeartbeat(wss: WebSocketServer): void {
    this.heartbeatInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if ((ws as any).isAlive === false) {
          return ws.terminate();
        }
        (ws as any).isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  private generateId(): string {
    this.idCounter++;
    return `conn_${this.idCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
