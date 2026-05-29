/**
 * Server Entry Point
 *
 * Sets up the WebSocket server, message routing, and connects
 * ConnectionManager, RoomManager, and GameSession together.
 */

import { ConnectionManager } from './connection';
import { RoomManager } from './room';
import { GameSession } from './game-session';
import type { ClientMessage } from '../shared/network/protocol';
import { createErrorMessage } from '../shared/network/protocol';

/** Mapping from connection ID to player info in a room */
interface ConnectionPlayerMapping {
  roomId: string;
  uid: number;
}

/**
 * Create and configure a server instance.
 * Exported for testing; the auto-start block below runs when executed directly.
 */
export async function createServer(port: number) {
  const connectionManager = new ConnectionManager();
  const roomManager = new RoomManager();
  const connectionToPlayer: Map<string, ConnectionPlayerMapping> = new Map();

  // --- Event Handlers ---

  connectionManager.onConnect((connectionId) => {
    console.log(`[Server] Client connected: ${connectionId}`);
  });

  connectionManager.onDisconnect((connectionId) => {
    console.log(`[Server] Client disconnected: ${connectionId}`);

    const mapping = connectionToPlayer.get(connectionId);
    if (mapping) {
      const { roomId, uid } = mapping;

      // Mark player as disconnected
      roomManager.markPlayerDisconnected(roomId, uid);

      // Notify other players in the room with updated player list
      const players = roomManager.getPlayerList(roomId);
      const player = players.find((p) => p.uid === uid);
      if (player) {
        connectionManager.broadcast(roomId, {
          type: 'player_disconnected',
          payload: { playerName: player.name, players },
        });
      }

      connectionToPlayer.delete(connectionId);
    }
  });

  connectionManager.onMessage((connectionId, message) => {
    handleMessage(connectionId, message);
  });

  // --- Message Router ---

  async function handleMessage(
    connectionId: string,
    message: ClientMessage,
  ): Promise<void> {
    switch (message.type) {
      case 'create_room': {
        const { playerCount, packages, playerName } = message.payload;
        const roomId = roomManager.createRoom(playerCount, packages, gameData ?? undefined);

        // Auto-join the creator as the first player (host)
        const hostName = playerName || '房主';
        const joinResult = roomManager.joinRoom(roomId, hostName);
        let hostUid = 1;
        if (joinResult.success && joinResult.players) {
          const host = joinResult.players.find((p) => p.name === hostName);
          if (host) {
            hostUid = host.uid;
            connectionToPlayer.set(connectionId, { roomId, uid: host.uid });
            const conn = connectionManager.getConnection(connectionId);
            if (conn) {
              conn.roomId = roomId;
              conn.playerName = hostName;
            }
          }
        }

        connectionManager.send(connectionId, {
          type: 'room_created',
          payload: { roomId, players: joinResult.players || [], myUid: hostUid },
        });
        break;
      }

      case 'join_room': {
        const { roomId, playerName } = message.payload;
        const result = roomManager.joinRoom(roomId, playerName);

        if (result.success && result.players) {
          // Find the newly joined player's UID
          const newPlayer = result.players.find((p) => p.name === playerName);
          if (newPlayer) {
            connectionToPlayer.set(connectionId, {
              roomId,
              uid: newPlayer.uid,
            });
            // Track the connection's room
            const conn = connectionManager.getConnection(connectionId);
            if (conn) {
              conn.roomId = roomId;
              conn.playerName = playerName;
            }
          }

          connectionManager.send(connectionId, {
            type: 'room_joined',
            payload: { roomId, players: result.players, myUid: result.uid! },
          });

          // Notify other players in the room
          connectionManager.broadcast(roomId, {
            type: 'player_joined',
            payload: { playerName, players: result.players },
          });
        } else {
          connectionManager.send(
            connectionId,
            createErrorMessage(
              result.error || 'UNKNOWN',
              result.message || 'Unknown error',
            ),
          );
        }
        break;
      }

      case 'reconnect': {
        const { roomId, playerName } = message.payload;
        const room = roomManager.getRoom(roomId);

        if (!room) {
          connectionManager.send(
            connectionId,
            createErrorMessage('ROOM_NOT_FOUND', 'Room not found'),
          );
          break;
        }

        // Find the player by name in the room
        const existingPlayer = Array.from(room.players.values())
          .find(p => p.name === playerName);

        if (!existingPlayer) {
          connectionManager.send(
            connectionId,
            createErrorMessage('PLAYER_NOT_FOUND', 'Player not in this room'),
          );
          break;
        }

        // Update connection mapping
        connectionToPlayer.set(connectionId, {
          roomId,
          uid: existingPlayer.uid,
        });
        const conn = connectionManager.getConnection(connectionId);
        if (conn) {
          conn.roomId = roomId;
          conn.playerName = playerName;
        }

        // Mark player as reconnected
        roomManager.markPlayerReconnected(roomId, existingPlayer.uid);

        // Send reconnect success with player list and uid
        const players = roomManager.getPlayerList(roomId);
        connectionManager.send(connectionId, {
          type: 'room_joined',
          payload: { roomId, players, myUid: existingPlayer.uid },
        });

        // Notify other players with updated player list
        const updatedPlayers = roomManager.getPlayerList(roomId);
        connectionManager.broadcast(roomId, {
          type: 'player_reconnected',
          payload: { playerName, players: updatedPlayers },
        });

        // If game is in progress, send current game state
        if (room.gameSession) {
          const state = room.gameSession.getState();
          connectionManager.send(connectionId, {
            type: 'game_state',
            payload: { state },
          });
        }
        break;
      }

      case 'leave_room': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId, uid } = mapping;
          const result = roomManager.leaveRoom(roomId, uid);

          if (result.success) {
            connectionManager.send(connectionId, {
              type: 'room_left',
              payload: { roomId },
            });

            // Notify remaining players
            const players = roomManager.getPlayerList(roomId);
            connectionManager.broadcast(roomId, {
              type: 'player_left',
              payload: { playerName: result.playerName || 'Unknown', players },
            });

            // Clear connection's room
            const conn = connectionManager.getConnection(connectionId);
            if (conn) {
              conn.roomId = null;
              conn.playerName = null;
            }

            connectionToPlayer.delete(connectionId);
          }
        }
        break;
      }

      case 'list_rooms': {
        const rooms = roomManager.listRooms();
        connectionManager.send(connectionId, {
          type: 'room_list',
          payload: { rooms },
        });
        break;
      }

      case 'start_game': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId } = mapping;
          const room = roomManager.getRoom(roomId);

          if (room && room.playerCount >= 2) {
            // Check if requester is the host (first player)
            const players = roomManager.getPlayerList(roomId);
            const player = players.find((p) => p.uid === mapping.uid);
            if (player && players.length > 0 && players[0].uid === player.uid) {
              // Start the game
              const started = roomManager.startGame(roomId);
              if (started) {
                // Create and run game session
                const gameSession = new GameSession(
                  room,
                  roomManager,
                  connectionManager,
                );

                // Run game asynchronously (don't block message handling)
                gameSession.start().catch((error) => {
                  console.error('[Server] Game session error:', error);
                });
              }
            } else {
              connectionManager.send(
                connectionId,
                createErrorMessage('NOT_HOST', 'Only the host can start the game'),
              );
            }
          } else if (room && room.playerCount < 2) {
            connectionManager.send(
              connectionId,
              createErrorMessage('NOT_ENOUGH_PLAYERS', 'Need at least 2 players to start'),
            );
          }
        }
        break;
      }

      case 'player_input': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId, uid } = mapping;
          const room = roomManager.getRoom(roomId);

          if (room && room.gameSession) {
            const { input } = message.payload;
            room.gameSession.handlePlayerInput(uid, input);
          }
        }
        break;
      }

      case 'hero_select': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId, uid } = mapping;
          const room = roomManager.getRoom(roomId);

          if (room && room.gameSession) {
            const { heroId } = message.payload;
            const success = room.gameSession.handleHeroSelect(uid, heroId);

            // Broadcast selection response to all players
            connectionManager.broadcast(roomId, {
              type: 'hero_select_response',
              payload: { uid, heroId, success },
            });
          }
        }
        break;
      }

      case 'get_state': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId, uid } = mapping;
          const room = roomManager.getRoom(roomId);

          if (room && room.gameSession) {
            const state = room.gameSession.getState(uid);
            connectionManager.send(connectionId, {
              type: 'game_state',
              payload: { state },
            });
          }
        }
        break;
      }

      case 'ping': {
        const { timestamp } = message.payload;
        connectionManager.send(connectionId, {
          type: 'pong',
          payload: { timestamp },
        });
        break;
      }

      default: {
        connectionManager.send(
          connectionId,
          createErrorMessage('UNKNOWN_TYPE', 'Unknown message type'),
        );
      }
    }
  }

  // --- Load Game Data ---

  let gameData: import('../shared/game/lib-group').LibGroupData | null = null;
  try {
    const { loadHeroes, loadTuxes, loadMonsters, loadNPCs, loadEvenements, loadSkills, loadOperations, loadNCActions, loadRunes, loadExsps } = await import('../shared/data');
    gameData = {
      heroData: loadHeroes(),
      tuxData: loadTuxes(),
      monsterData: loadMonsters(),
      npcData: loadNPCs(),
      eveData: loadEvenements(),
      skillData: loadSkills(),
      opsData: loadOperations(),
      njData: loadNCActions(),
      runeData: loadRunes(),
      exspData: loadExsps(),
    };
    console.log(`[Server] Game data loaded: ${gameData.heroData.length} heroes, ${gameData.tuxData.length} tux, ${gameData.monsterData.length} monsters`);
  } catch (error) {
    console.error('[Server] Failed to load game data, using empty data:', error);
  }

  // --- Start Server ---

  const wss = connectionManager.start(port);
  console.log(`[Server] WebSocket server running on port ${port}`);

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Server] Shutting down...');
    wss.clients.forEach((ws) => {
      ws.close();
    });
    connectionManager.stop();
    process.exit(0);
  };

  // Remove existing listeners to avoid leak when called multiple times (tests)
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { connectionManager, roomManager, wss, shutdown };
}

// Auto-start when run directly (not when imported for testing)
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('/index.ts') ||
    process.argv[1].endsWith('\\index.ts') ||
    process.argv[1].endsWith('/index.js') ||
    process.argv[1].endsWith('\\index.js'));

if (isDirectRun || process.argv.includes('--server')) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  createServer(PORT).catch(console.error);
}
