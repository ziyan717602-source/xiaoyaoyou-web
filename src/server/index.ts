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
import { validateMessage, RateLimiter } from './validation';

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
  const rateLimiter = new RateLimiter();

  // --- Event Handlers ---

  connectionManager.onConnect((connectionId) => {
    console.log(`[Server] Client connected: ${connectionId}`);
  });

  connectionManager.onDisconnect((connectionId) => {
    console.log(`[Server] Client disconnected: ${connectionId}`);
    rateLimiter.cleanup(connectionId);

    const mapping = connectionToPlayer.get(connectionId);
    if (mapping) {
      const { roomId, uid } = mapping;

      // Mark player as disconnected
      roomManager.markPlayerDisconnected(roomId, uid);

      // Notify GameSession to resolve pending inputs (prevents 30s timeout)
      const room = roomManager.getRoom(roomId);
      if (room && room.gameSession) {
        room.gameSession.handlePlayerDisconnect(uid);
      }

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
    // Rate limiting
    if (rateLimiter.isRateLimited(connectionId)) {
      connectionManager.send(connectionId, {
        type: 'error',
        payload: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' },
      });
      return;
    }

    // Input validation
    const validation = validateMessage(message);
    if (!validation.valid) {
      connectionManager.send(connectionId, {
        type: 'error',
        payload: { code: validation.code, message: validation.message },
      });
      return;
    }

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
          payload: { roomId, players: joinResult.players || [], myUid: hostUid, maxPlayers: playerCount },
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
            payload: { roomId, players: result.players, myUid: result.uid!, maxPlayers: roomManager.getRoom(roomId)?.maxPlayers ?? 6 },
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

        // Notify GameSession to resend pending requests
        if (room.gameSession) {
          room.gameSession.handlePlayerReconnect(existingPlayer.uid);
        }

        // Send reconnect success with player list and uid
        const players = roomManager.getPlayerList(roomId);
        connectionManager.send(connectionId, {
          type: 'room_joined',
          payload: { roomId, players, myUid: existingPlayer.uid, maxPlayers: room.maxPlayers },
        });

        // Notify other players with updated player list
        const updatedPlayers = roomManager.getPlayerList(roomId);
        connectionManager.broadcast(roomId, {
          type: 'player_reconnected',
          payload: { playerName, players: updatedPlayers },
        });

        // If game is in progress, send current game state (with this player's uid so they see their hand)
        if (room.gameSession) {
          const state = room.gameSession.getState(existingPlayer.uid);
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

      case 'add_ai': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId } = mapping;
          const room = roomManager.getRoom(roomId);
          if (!room) break;

          // Check if requester is the host
          const players = roomManager.getPlayerList(roomId);
          const player = players.find((p) => p.uid === mapping.uid);
          if (!player || players.length === 0 || players[0].uid !== player.uid) {
            connectionManager.send(connectionId, createErrorMessage('NOT_HOST', 'Only the host can add AI'));
            break;
          }

          // Fill all empty slots with AI players
          const emptySlots = room.maxPlayers - room.playerCount;
          if (emptySlots <= 0) {
            connectionManager.send(connectionId, createErrorMessage('ROOM_FULL', 'Room is already full'));
            break;
          }

          for (let i = 0; i < emptySlots; i++) {
            const uid = room.playerCount + 1;
            const aiName = `AI${uid}`;
            room.players.set(uid, {
              uid,
              name: aiName,
              isReady: true,
              isConnected: false,
            });
            room.playerCount++;
          }

          // Broadcast updated room info
          const updatedPlayers = roomManager.getPlayerList(roomId);
          connectionManager.broadcast(roomId, {
            type: 'room_joined',
            payload: {
              roomId,
              players: updatedPlayers,
              myUid: mapping.uid,
              maxPlayers: room.maxPlayers,
            },
          });
        }
        break;
      }

      case 'start_game': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId } = mapping;
          const room = roomManager.getRoom(roomId);

          if (room && room.playerCount >= 1) {
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
                  connectionToPlayer,
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

      case 'player_ready': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId, uid } = mapping;
          const room = roomManager.getRoom(roomId);

          if (room && room.gameSession) {
            room.gameSession.handlePlayerReady(uid);
          }
        }
        break;
      }

      case 'player_input': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId, uid } = mapping;
          const room = roomManager.getRoom(roomId);
          console.log(`[Server] player_input uid=${uid} room=${roomId}`);

          if (room && room.gameSession) {
            const { input } = message.payload;
            const consumed = room.gameSession.handlePlayerInput(uid, input);
            console.log(`[Server] player_input consumed=${consumed} input="${input}"`);
          }
        }
        break;
      }

      case 'decision_response': {
        const mapping = connectionToPlayer.get(connectionId);
        if (mapping) {
          const { roomId, uid } = mapping;
          const room = roomManager.getRoom(roomId);

          if (room && room.gameSession) {
            room.gameSession.handleDecisionResponse(uid, message.payload);
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
        // Try connection mapping first, then fall back to roomId/playerName from payload
        const mapping = connectionToPlayer.get(connectionId);
        let stateRoomId: string | null = null;
        let stateUid: number = 0;

        if (mapping) {
          stateRoomId = mapping.roomId;
          stateUid = mapping.uid;
        } else if (message.payload.roomId && message.payload.playerName) {
          // Fallback: look up room and player by name
          const room = roomManager.getRoom(message.payload.roomId);
          if (room) {
            const player = Array.from(room.players.values()).find(p => p.name === message.payload.playerName);
            if (player) {
              stateRoomId = message.payload.roomId;
              stateUid = player.uid;
              // Also set the mapping for future use
              connectionToPlayer.set(connectionId, { roomId: stateRoomId, uid: stateUid });
              const conn = connectionManager.getConnection(connectionId);
              if (conn) {
                conn.roomId = stateRoomId;
                conn.playerName = message.payload.playerName;
              }
            }
          }
        }

        if (stateRoomId) {
          const room = roomManager.getRoom(stateRoomId);
          if (room && room.gameSession) {
            const state = room.gameSession.getState(stateUid);
            connectionManager.send(connectionId, {
              type: 'game_state',
              payload: { state },
            });
          }
        }
        break;
      }

      case 'get_room': {
        const { roomId } = message.payload;
        const room = roomManager.getRoom(roomId);

        if (!room) {
          connectionManager.send(
            connectionId,
            createErrorMessage('ROOM_NOT_FOUND', 'Room not found'),
          );
          break;
        }

        const players = roomManager.getPlayerList(roomId);
        const mapping = connectionToPlayer.get(connectionId);
        const myUid = mapping?.uid ?? 0;

        connectionManager.send(connectionId, {
          type: 'room_info',
          payload: { roomId, players, myUid },
        });
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
  const PORT = parseInt(process.env.PORT || '5181', 10);
  createServer(PORT).catch(console.error);
}
