/**
 * GameSession - Server-side game instance host
 *
 * Wraps a Game instance for a room, handles player input injection,
 * and broadcasts game state to connected clients.
 *
 * The Game class uses synchronous input via AI strategies. For network
 * players, the game runs with empty input ('') and the state is broadcast
 * to clients. The waitForInput/handlePlayerInput mechanism is infrastructure
 * for future async input support when the Game class is extended.
 */

import { Game, type GameConfig, type GameResult } from '../shared/game/game';
import type { AIStrategy } from '../shared/game/ai/types';
import type { GameState } from '../shared/network/protocol';
import type { Room } from './room';
import type { RoomManager } from './room';
import type { ConnectionManager } from './connection';

export class GameSession {
  private game: Game;
  private room: Room;
  private roomManager: RoomManager;
  private connectionManager: ConnectionManager;
  private inputResolvers: Map<number, (input: string) => void> = new Map();
  private stateBroadcastTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(
    room: Room,
    roomManager: RoomManager,
    connectionManager: ConnectionManager,
  ) {
    this.room = room;
    this.roomManager = roomManager;
    this.connectionManager = connectionManager;

    // Create Game instance with the room's configuration
    const config: GameConfig = {
      playerCount: room.playerCount,
      packages: room.packages,
      seed: Date.now(),
      maxRounds: 100,
      aiStrategies: this.createAIStrategies(),
      libGroupData: room.libGroupData,
      levelCode: room.levelCode,
    };

    this.game = new Game(config);
    room.gameSession = this;
  }

  /**
   * Start the game. Broadcasts game_started, runs the game loop,
   * broadcasts results, and cleans up.
   */
  async start(): Promise<GameResult> {
    try {
      // Register all AI players (null strategies are skipped)
      this.game.registerAllAIPlayers();

      // Broadcast game started
      this.connectionManager.broadcast(this.room.id, {
        type: 'game_started',
        payload: { playerCount: this.room.playerCount },
      });

      // Start periodic state broadcast
      this.startStateBroadcast();

      // Run the game (this is the main game loop)
      const result = await this.game.run();

      // Stop state broadcast
      this.stopStateBroadcast();

      // Broadcast game result
      this.connectionManager.broadcast(this.room.id, {
        type: 'game_over',
        payload: {
          result: {
            winner: result.winner ? result.winner.uid : null,
            totalRounds: result.totalRounds,
            akaScore: result.akaScore,
            aoScore: result.aoScore,
            reason: result.reason,
          },
        },
      });

      // End game in room manager
      this.roomManager.endGame(this.room.id);

      return result;
    } catch (error) {
      console.error('[GameSession] Error during game:', error);
      this.stopStateBroadcast();
      throw error;
    }
  }

  /**
   * Stop the game session and clean up resources.
   */
  stop(): void {
    this.stopped = true;
    this.stopStateBroadcast();
    this.inputResolvers.clear();
  }

  /**
   * Handle a player's input response. Resolves the pending waitForInput promise.
   * @returns true if the input was consumed, false if no pending request.
   */
  handlePlayerInput(uid: number, input: string): boolean {
    const resolver = this.inputResolvers.get(uid);
    if (resolver) {
      resolver(input);
      this.inputResolvers.delete(uid);
      return true;
    }
    return false;
  }

  /**
   * Get the current game state for broadcasting to clients.
   * If the game hasn't been initialized yet, returns a minimal state
   * based on the room's player configuration.
   */
  getState(): GameState {
    const board = this.game.getBoard();
    const players = this.game.getPlayers();

    // If game hasn't been initialized yet, return room-based state
    if (players.size === 0) {
      return {
        players: this.roomManager.getPlayerList(this.room.id).map((p) => ({
          uid: p.uid,
          name: p.name,
          hp: 0,
          hand: [],
          team: 0,
        })),
        currentTurn: 0,
        phase: 'waiting',
        board: {
          tuxPileCount: 0,
          monPileCount: 0,
          evePileCount: 0,
        },
      };
    }

    const roundManager = this.game.getRoundManager();

    return {
      players: Array.from(players.values()).map((p) => ({
        uid: p.uid,
        name: p.name,
        hp: p.hp,
        hand: [...p.tux],
        team: p.team,
      })),
      currentTurn: roundManager.currentPlayer.uid,
      phase: roundManager.currentPhase,
      board: {
        tuxPileCount: board.tuxPiles.count,
        monPileCount: board.monPiles.count,
        evePileCount: board.evePiles.count,
      },
    };
  }

  /**
   * Wait for player input from the network.
   * Returns a Promise that resolves when handlePlayerInput is called.
   * Times out after 30 seconds with an empty string.
   */
  waitForInput(
    uid: number,
    format: string,
    code: string,
    arg: string,
  ): Promise<string> {
    // Broadcast input request to all room clients
    this.connectionManager.broadcast(this.room.id, {
      type: 'input_request',
      payload: { format, code, arg },
    });

    // Wait for the player's response
    return new Promise<string>((resolve) => {
      this.inputResolvers.set(uid, resolve);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.inputResolvers.has(uid)) {
          this.inputResolvers.delete(uid);
          resolve('');
        }
      }, 30000);
    });
  }

  /**
   * Get the underlying Game instance.
   */
  getGame(): Game {
    return this.game;
  }

  /**
   * Check if the session is stopped.
   */
  isStopped(): boolean {
    return this.stopped;
  }

  // --- Private Methods ---

  /**
   * Create AI strategies for the room's players.
   * Returns an array of null strategies (all players are network-controlled).
   * When AI support is needed, provide AIStrategy instances for AI slots.
   */
  private createAIStrategies(): AIStrategy[] {
    return Array(this.room.playerCount).fill(null);
  }

  /**
   * Start broadcasting game state at 100ms intervals.
   */
  private startStateBroadcast(): void {
    this.stateBroadcastTimer = setInterval(() => {
      if (this.stopped) return;
      try {
        const state = this.getState();
        this.connectionManager.broadcast(this.room.id, {
          type: 'game_state',
          payload: { state },
        });
      } catch {
        // Game may have ended or be in invalid state
      }
    }, 100);
  }

  /**
   * Stop the state broadcast timer.
   */
  private stopStateBroadcast(): void {
    if (this.stateBroadcastTimer) {
      clearInterval(this.stateBroadcastTimer);
      this.stateBroadcastTimer = null;
    }
  }
}
