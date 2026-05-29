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

import { Game, type GameConfig, type GameResult, type InputProvider } from '../shared/game/game';
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
  private heroSelectionResolvers: Map<number, (heroId: number) => void> = new Map();
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
    const inputProvider: InputProvider = {
      getInput: (uid, format, code, arg) => this.waitForInput(uid, format, code, arg),
    };
    const config: GameConfig = {
      playerCount: room.playerCount,
      packages: room.packages,
      seed: Date.now(),
      maxRounds: 100,
      aiStrategies: this.createAIStrategies(),
      libGroupData: room.libGroupData,
      levelCode: room.levelCode,
      inputProvider,
    };

    this.game = new Game(config);
    room.gameSession = this;
  }

  /**
   * Start the game. Broadcasts game_started, runs hero selection,
   * runs the game loop, broadcasts results, and cleans up.
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

      // Run hero selection phase
      await this.runHeroSelection();

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
    this.heroSelectionResolvers.clear();
  }

  /**
   * Run the hero selection phase.
   * For each non-AI player, request hero selection and wait for response.
   * AI players select heroes automatically.
   */
  private async runHeroSelection(): Promise<void> {
    const libGroup = this.game.getLibGroup();
    const availableHeroes = libGroup.hl.listAllSeleable(this.room.levelCode);

    if (availableHeroes.length === 0) {
      // No heroes available, skip selection
      return;
    }

    // Build hero info list for the protocol
    const heroInfoList = availableHeroes.map(h => ({
      avatar: h.avatar,
      name: h.name,
      group: h.group,
      gender: h.gender,
      hp: h.hp,
      str: h.str,
      dex: h.dex,
    }));

    // For each player, request hero selection
    for (const [uid, player] of this.game.getPlayers()) {
      const aiPlayer = this.game.getAIPlayers().get(uid);
      if (aiPlayer) {
        // AI player selects hero automatically
        const heroId = aiPlayer.selectHero(availableHeroes);
        const hero = libGroup.hl.instanceHero(heroId);
        if (hero) {
          player.selectHero = heroId;
          player.initFromHero(hero, true, false, false);
        }
      } else {
        // Network player - request hero selection
        this.connectionManager.broadcast(this.room.id, {
          type: 'hero_select_request',
          payload: { uid, availableHeroes: heroInfoList },
        });

        // Wait for the player's response (with timeout)
        const heroId = await this.waitForHeroSelection(uid);
        if (heroId > 0) {
          const hero = libGroup.hl.instanceHero(heroId);
          if (hero) {
            player.selectHero = heroId;
            player.initFromHero(hero, true, false, false);
          }
        }
      }
    }
  }

  /**
   * Handle a player's hero selection response.
   * @returns true if the selection was consumed, false if no pending request.
   */
  handleHeroSelect(uid: number, heroId: number): boolean {
    const resolver = this.heroSelectionResolvers.get(uid);
    if (resolver) {
      resolver(heroId);
      this.heroSelectionResolvers.delete(uid);
      return true;
    }
    return false;
  }

  /**
   * Wait for a player's hero selection from the network.
   * Returns a Promise that resolves when handleHeroSelect is called.
   * Times out after 60 seconds with 0 (no selection).
   */
  private waitForHeroSelection(uid: number): Promise<number> {
    return new Promise<number>((resolve) => {
      this.heroSelectionResolvers.set(uid, resolve);

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.heroSelectionResolvers.has(uid)) {
          this.heroSelectionResolvers.delete(uid);
          resolve(0);
        }
      }, 60000);
    });
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
   * Get the current game state for a specific player.
   * Hand cards are only visible to the requesting player.
   * If the game hasn't been initialized yet, returns a minimal state.
   */
  getState(requestUid: number = 0): GameState {
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
          handCount: 0,
          team: 0,
        })),
        currentTurn: 0,
        phase: 'waiting',
        board: {
          tuxPileCount: 0,
          monPileCount: 0,
          evePileCount: 0,
          activeMonster: null,
        },
      };
    }

    const roundManager = this.game.getRoundManager();

    const libGroup = this.game.getLibGroup();

    // Decode active monster if one is on the board
    let activeMonster: import('../shared/network/protocol').ActiveMonster | null = null;
    if (board.monster1 > 0) {
      const mon = libGroup.ml.decode(board.monster1);
      if (mon) {
        activeMonster = {
          code: mon.code,
          name: mon.name,
          str: mon.str,
          agl: mon.agl,
          element: mon.element as unknown as number,
          level: mon.level as unknown as number,
        };
      }
    }

    return {
      players: Array.from(players.values()).map((p) => ({
        uid: p.uid,
        name: p.name,
        hp: p.hp,
        hand: p.uid === requestUid
          ? p.tux.map(id => {
              const tux = libGroup.tl.encodeTuxDbSerial(id);
              return tux ? tux.code : String(id);
            })
          : [],
        handCount: p.tux.length,
        team: p.team,
      })),
      currentTurn: roundManager.currentPlayer.uid,
      phase: roundManager.currentPhase,
      board: {
        tuxPileCount: board.tuxPiles.count,
        monPileCount: board.monPiles.count,
        evePileCount: board.evePiles.count,
        activeMonster,
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
      payload: { uid, format, code, arg },
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
   * Sends personalized state to each player (hand cards filtered per player).
   */
  private startStateBroadcast(): void {
    this.stateBroadcastTimer = setInterval(() => {
      if (this.stopped) return;
      try {
        // Send personalized state to each player in the room
        const players = this.roomManager.getPlayerList(this.room.id);
        for (const player of players) {
          const state = this.getState(player.uid);
          // Find connection for this player and send state
          const conn = this.connectionManager.findConnectionByPlayer(this.room.id, player.name);
          if (conn) {
            this.connectionManager.send(conn.id, {
              type: 'game_state',
              payload: { state },
            });
          }
        }
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
