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
import { RuleAI } from '../shared/game/ai/rule-ai';
import type { GameState } from '../shared/network/protocol';
import { InputManager } from '../shared/game/input-manager';
import type { Room } from './room';
import type { RoomManager } from './room';
import type { ConnectionManager } from './connection';

/** Mapping from connection ID to player info in a room */
interface ConnectionPlayerMapping {
  roomId: string;
  uid: number;
}

export class GameSession {
  private game: Game;
  private room: Room;
  private roomManager: RoomManager;
  private connectionManager: ConnectionManager;
  private connectionToPlayer: Map<string, ConnectionPlayerMapping>;
  private inputManager = new InputManager();
  private heroSelectionResolvers: Map<number, (heroId: number) => void> = new Map();
  private stateBroadcastTimer: ReturnType<typeof setInterval> | null = null;
  private stateFallbackTimer: ReturnType<typeof setInterval> | null = null;
  private stateDirty = false;
  private stopped = false;

  // Track current hero selection state for re-sending to reconnecting clients
  private currentHeroSelection: { uid: number; availableHeroes: any[] } | null = null;

  // Ready confirmation resolvers
  private readyResolvers: Map<number, (ready: boolean) => void> | null = null;

  constructor(
    room: Room,
    roomManager: RoomManager,
    connectionManager: ConnectionManager,
    connectionToPlayer: Map<string, ConnectionPlayerMapping>,
  ) {
    this.room = room;
    this.roomManager = roomManager;
    this.connectionManager = connectionManager;
    this.connectionToPlayer = connectionToPlayer;

    // Set up InputManager to send input_request messages to players
    this.inputManager.onRequest((uid, format, code, arg) => {
      const connId = this.findConnectionIdByUid(uid);
      if (connId) {
        this.connectionManager.send(connId, {
          type: 'input_request',
          payload: { uid, format, code, arg },
        });
      }
    });

    // Create Game instance with the room's configuration
    const inputProvider: InputProvider = {
      getInput: (uid, format, code, arg) => this.inputManager.waitForInput(uid, format, code, arg),
    };
    const config: GameConfig = {
      playerCount: room.maxPlayers, // Use maxPlayers so AI fills empty slots
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
    console.log(`[GameSession] Starting game in room ${this.room.id}`);
    try {
      // Register all AI players (null strategies are skipped)
      this.game.registerAllAIPlayers();

      // Bridge G-Loop messageHandler to broadcast G-messages to clients
      this.game.getGLoop().setMessageHandler((msg) => {
        if (this.stopped) return;
        this.stateDirty = true;
        // Log the G-message on server side
        this.game.decodeGMessage(msg);
        // Parse U1 messages for targeted delivery
        if (msg.startsWith('U1,')) {
          // U1,uvsn;;involved;;options - send to each involved player
          const parts = msg.split(';;');
          if (parts.length >= 2) {
            const involvedStr = parts[1];
            const uids = involvedStr.split(',').map(s => parseInt(s, 10)).filter(n => n > 0);
            for (const uid of uids) {
              const connId = this.findConnectionIdByUid(uid);
              if (connId) {
                this.connectionManager.send(connId, {
                  type: 'g_message',
                  payload: { msg, targetUid: uid },
                });
              }
            }
            return;
          }
        }
        // All other G-messages: broadcast to entire room
        this.connectionManager.broadcast(this.room.id, {
          type: 'g_message',
          payload: { msg },
        });
      });

      // Broadcast game started
      this.connectionManager.broadcast(this.room.id, {
        type: 'game_started',
        payload: { playerCount: this.room.playerCount },
      });

      // Wait for all players to be ready (with 5 second timeout)
      await this.waitForAllPlayersReady();

      // Start periodic state broadcast
      this.startStateBroadcast();

      // Initialize game data (loads LibGroup) so hero selection can list available heroes
      await this.game.initialize();

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

      // Notify players about the error
      this.connectionManager.broadcast(this.room.id, {
        type: 'game_error',
        payload: {
          message: error instanceof Error ? error.message : '游戏发生异常',
        },
      });

      // Clean up room
      this.roomManager.endGame(this.room.id);

      throw error;
    }
  }

  /**
   * Stop the game session and clean up resources.
   */
  stop(): void {
    this.stopped = true;
    this.stopStateBroadcast();
    this.inputManager.clear();
    this.heroSelectionResolvers.clear();
  }

  /**
   * Handle player disconnection.
   * Resolves any pending input/hero selection with default values
   * to prevent the game from waiting for a disconnected player.
   */
  handlePlayerDisconnect(uid: number): void {
    // Mark player as disconnected in InputManager (resolves pending input)
    this.inputManager.markDisconnected(uid);

    // Resolve pending hero selection with 0 (auto-select)
    const heroResolver = this.heroSelectionResolvers.get(uid);
    if (heroResolver) {
      heroResolver(0);
      this.heroSelectionResolvers.delete(uid);
    }
  }

  /**
   * Handle player reconnection.
   * Resends any pending input/hero selection request to the reconnected player.
   */
  handlePlayerReconnect(uid: number): void {
    // Check if there's a pending input request and resend it
    if (this.inputManager.hasPendingInput(uid)) {
      const request = this.inputManager.getRequest(uid);
      const connId = this.findConnectionIdByUid(uid);
      if (connId && request) {
        this.connectionManager.send(connId, {
          type: 'input_request',
          payload: { uid, format: request.format, code: request.code, arg: request.arg },
        });
      }
    }

    // Check if there's a pending hero selection and resend it
    if (this.heroSelectionResolvers.has(uid) && this.currentHeroSelection) {
      const connId = this.findConnectionIdByUid(uid);
      if (connId) {
        this.connectionManager.send(connId, {
          type: 'hero_select_request',
          payload: this.currentHeroSelection,
        });
      }
    }
  }

  /**
   * Wait for all network players to send a ready message.
   * AI players are considered always ready.
   * Times out after 5 seconds with auto-ready.
   */
  private async waitForAllPlayersReady(): Promise<void> {
    const readyResolvers = new Map<number, (ready: boolean) => void>();
    const readyPlayers = new Set<number>();

    // Find network players (non-AI) that are connected
    const totalNetworkPlayers = new Set<number>();
    for (const [uid] of this.game.getPlayers()) {
      const aiPlayer = this.game.getAIPlayers().get(uid);
      if (!aiPlayer) {
        // Check if player has a connection mapping (is connected)
        const connId = this.findConnectionIdByUid(uid);
        if (connId) {
          totalNetworkPlayers.add(uid);
        }
      }
    }

    // If no network players, return immediately
    if (totalNetworkPlayers.size === 0) {
      return;
    }

    // Store resolvers for handling player_ready messages
    // Each resolver checks if all players are now ready
    let resolvePromise: (() => void) | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const checkReady = () => {
      if (readyPlayers.size >= totalNetworkPlayers.size && resolvePromise) {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolvePromise();
      }
    };

    for (const uid of totalNetworkPlayers) {
      readyResolvers.set(uid, (ready: boolean) => {
        if (ready) {
          readyPlayers.add(uid);
        }
        readyResolvers.delete(uid);
        checkReady();
      });
    }

    this.readyResolvers = readyResolvers;

    // Wait for all players or timeout after 5 seconds
    await new Promise<void>((resolve) => {
      resolvePromise = resolve;
      timeoutHandle = setTimeout(() => {
        // Auto-ready all remaining players on timeout
        for (const [uid, resolver] of readyResolvers) {
          console.warn(`[GameSession] Ready timeout for uid ${uid}, auto-readying`);
          resolver(true);
        }
        resolve();
      }, 5000);
    });

    this.readyResolvers = null;
  }

  /**
   * Handle a player's ready message.
   * @returns true if the ready was consumed, false if no pending request.
   */
  handlePlayerReady(uid: number): boolean {
    const resolver = this.readyResolvers?.get(uid);
    if (resolver) {
      resolver(true);
      return true;
    }
    return false;
  }

  /**
   * Run the hero selection phase.
   * Broadcasts selection request to all players simultaneously, waits for all responses in parallel.
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

    // Separate AI and network players
    const networkPlayers: Array<{ uid: number; player: import('../shared/game/player').Player }> = [];
    const aiPlayers: Array<{ uid: number; player: import('../shared/game/player').Player; ai: import('../shared/game/ai/types').AIPlayer }> = [];

    for (const [uid, player] of this.game.getPlayers()) {
      const aiPlayer = this.game.getAIPlayers().get(uid);
      if (aiPlayer) {
        aiPlayers.push({ uid, player, ai: aiPlayer });
      } else {
        networkPlayers.push({ uid, player });
      }
    }

    // AI players select heroes immediately (with duplicate avoidance)
    const aiTakenHeroes = new Set<number>();
    for (const { player: p, ai } of aiPlayers) {
      let heroId = ai.selectHero(availableHeroes);
      // Avoid duplicates among AI players
      if (aiTakenHeroes.has(heroId)) {
        const nextAvailable = availableHeroes.find(h => !aiTakenHeroes.has(h.avatar));
        heroId = nextAvailable?.avatar ?? heroId;
      }
      aiTakenHeroes.add(heroId);
      const hero = libGroup.hl.instanceHero(heroId);
      if (hero) {
        p.selectHero = heroId;
        p.initFromHero(hero, true, false, false);
      }
    }

    // Network players: send individual request to each
    if (networkPlayers.length > 0) {
      // Track hero selection state for re-sending to reconnecting clients
      this.currentHeroSelection = { uid: 0, availableHeroes: heroInfoList };

      // Send individual hero_select_request to each network player
      for (const { uid } of networkPlayers) {
        const connId = this.findConnectionIdByUid(uid);
        if (connId) {
          this.connectionManager.send(connId, {
            type: 'hero_select_request',
            payload: { uid, availableHeroes: heroInfoList },
          });
        }
      }

      // Wait for all network players in parallel (each with independent 10s timeout)
      const selectionPromises = networkPlayers.map(({ uid }) =>
        this.waitForHeroSelection(uid).then((heroId) => ({ uid, heroId }))
      );

      const results = await Promise.all(selectionPromises);

      // Clear hero selection state
      this.currentHeroSelection = null;

      // Apply all selections atomically, with duplicate detection
      const takenHeroes = new Set<number>();

      // First, mark AI-selected heroes as taken
      for (const { player: p } of aiPlayers) {
        if (p.selectHero > 0) {
          takenHeroes.add(p.selectHero);
        }
      }

      for (const { uid, heroId } of results) {
        const entry = networkPlayers.find(p => p.uid === uid);
        if (!entry) continue;

        let finalHeroId = heroId;
        // Auto-select first available hero on timeout (avoid duplicates)
        if (finalHeroId === 0 && availableHeroes.length > 0) {
          const available = availableHeroes.find(h => !takenHeroes.has(h.avatar));
          finalHeroId = available ? available.avatar : availableHeroes[0].avatar;
          console.log(`[GameSession] Auto-selecting hero ${finalHeroId} for uid ${uid} (timeout)`);
        }

        // Duplicate detection: if hero already taken, assign next available
        if (takenHeroes.has(finalHeroId)) {
          const nextAvailable = availableHeroes.find(h => !takenHeroes.has(h.avatar));
          if (nextAvailable) {
            console.warn(`[GameSession] Hero ${finalHeroId} already taken, reassigning uid ${uid} to ${nextAvailable.avatar}`);
            finalHeroId = nextAvailable.avatar;
          } else {
            console.warn(`[GameSession] No available heroes left for uid ${uid}`);
            finalHeroId = 0;
          }
        }

        if (finalHeroId > 0) {
          takenHeroes.add(finalHeroId);
          const hero = libGroup.hl.instanceHero(finalHeroId);
          if (hero) {
            entry.player.selectHero = finalHeroId;
            entry.player.initFromHero(hero, true, false, false);
          }
        }
      }
    }

    // Mark heroes as selected so Game.selectHeroes() in game.run() is skipped
    this.game.markHeroesSelected();
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
   * Times out after 10 seconds with 0 (no selection).
   */
  private waitForHeroSelection(uid: number): Promise<number> {
    return new Promise<number>((resolve) => {
      this.heroSelectionResolvers.set(uid, resolve);

      // Timeout after 10 seconds - auto-select if player doesn't respond
      setTimeout(() => {
        if (this.heroSelectionResolvers.has(uid)) {
          this.heroSelectionResolvers.delete(uid);
          console.warn(`[GameSession] Hero selection timeout for uid ${uid}, auto-selecting`);
          resolve(0);
        }
      }, 10000);
    });
  }

  /**
   * Handle a player's input response. Resolves the pending waitForInput promise.
   * @returns true if the input was consumed, false if no pending request.
   */
  handlePlayerInput(uid: number, input: string): boolean {
    console.log(`[GameSession] handlePlayerInput uid=${uid} input="${input}" hasPending=${this.inputManager.hasPendingInput(uid)}`);
    if (this.inputManager.hasPendingInput(uid)) {
      this.inputManager.queueInput(uid, input);
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
          heroAvatar: 0,
          hp: 0,
          hpBase: 0,
          hand: [],
          handCount: 0,
          team: 0,
          weapon: 0,
          armor: 0,
          trove: 0,
          exEquip: 0,
          str: 0,
          dex: 0,
          pets: [],
          petCodes: [],
          skills: [],
          blesses: [],
          status: [],
        })),
        currentTurn: 0,
        phase: 'waiting',
        board: {
          tuxPileCount: 0,
          monPileCount: 0,
          evePileCount: 0,
          activeMonster: null,
          activeEvent: null,
          tuxDises: [],
          monDises: [],
          eveDises: [],
        },
        heroSelectRequest: this.currentHeroSelection,
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
        heroAvatar: p.selectHero,
        hp: p.hp,
        hpBase: p.hpBase,
        hand: p.uid === requestUid
          ? p.tux.map(id => {
              const tux = libGroup.tl.decodeTux(id);
              return tux ? tux.code : String(id);
            })
          : [],
        handCount: p.tux.length,
        team: p.team,
        weapon: p.weapon,
        armor: p.armor,
        trove: p.trove,
        exEquip: p.exEquip,
        str: p.str,
        dex: p.dex,
        pets: [...p.pets],
        petCodes: p.pets.map(id => {
          const mon = libGroup.ml.decode(id);
          return mon ? mon.code : '';
        }).filter(Boolean),
        skills: Array.from(p.skills).filter(s => !s.startsWith('BK')),
        blesses: Array.from(p.skills).filter(s => s.startsWith('BK')),
        status: [
          ...(p.immobilized ? ['immobilized'] : []),
          ...(p.petDisabled ? ['petDisabled'] : []),
          ...(p.loved ? ['loved'] : []),
          ...(p.restZP > 0 ? ['restZP'] : []),
        ],
      })),
      currentTurn: roundManager.currentPlayer.uid,
      phase: roundManager.currentPhase,
      board: {
        tuxPileCount: board.tuxPiles.count,
        monPileCount: board.monPiles.count,
        evePileCount: board.evePiles.count,
        activeMonster,
        activeEvent: board.eve > 0 ? (() => {
          const eve = libGroup.el.decodeEvenement(board.eve);
          return eve ? { code: eve.code, name: eve.name, description: eve.description } : null;
        })() : null,
        tuxDises: board.tuxDises,
        monDises: board.monDises,
        eveDises: board.eveDises,
      },
      heroSelectRequest: this.currentHeroSelection,
      nameLookup: this.buildNameLookup(libGroup),
    };
  }

  /**
   * Build a name lookup table for client-side log text generation.
   */
  private buildNameLookup(libGroup: any): import('../shared/network/protocol').NameLookup {
    const cards: Record<number, string> = {};
    const heroes: Record<number, string> = {};
    const monsters: Record<number, string> = {};
    const skills: Record<string, string> = {};
    const events: Record<number, string> = {};

    // Cards (tux)
    for (const tux of libGroup.tl.listAllTuxs(0)) {
      if (tux && tux.id) cards[tux.id] = tux.name;
    }

    // Heroes
    for (const hero of libGroup.hl.listAllSeleable(0)) {
      if (hero && hero.num) heroes[hero.num] = hero.name;
    }

    // Monsters
    for (const mon of libGroup.ml.firsts) {
      if (mon && mon.id) monsters[mon.id] = mon.name;
    }

    // Skills
    for (const skill of libGroup.sl.firsts) {
      if (skill && skill.name) skills[skill.code] = skill.name;
    }

    // Events
    for (const eve of libGroup.el.firsts) {
      if (eve && eve.id) events[eve.id] = eve.name;
    }

    return { cards, heroes, monsters, skills, events };
  }

  /**
   * Wait for player input from the network.
   * Delegates to InputManager which handles sending input_request
   * via the onRequest callback and waiting for queueInput().
   */
  waitForInput(
    uid: number,
    format: string,
    code: string,
    arg: string,
  ): Promise<string> {
    return this.inputManager.waitForInput(uid, format, code, arg);
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
   * Players with active WebSocket connections are network-controlled (null).
   * Players without connections are AI-controlled (RandomAI).
   */
  private createAIStrategies(): AIStrategy[] {
    // Find which UIDs have active WebSocket connections in this room
    const connectedUids = new Set<number>();
    for (const [, mapping] of this.connectionToPlayer) {
      if (mapping.roomId === this.room.id) {
        connectedUids.add(mapping.uid);
      }
    }

    // Create strategies: null for connected humans, RandomAI for unconnected slots
    return Array.from({ length: this.room.playerCount }, (_, i) => {
      const uid = i + 1;
      if (connectedUids.has(uid)) {
        return null; // Human player — controlled via WebSocket
      }
      return new RuleAI(); // AI player — controlled by server, uses rule-based strategy
    });
  }

  /**
   * Start broadcasting game state.
   * Broadcasts immediately when state changes (dirty flag), with a fallback full sync every 2s.
   */
  private startStateBroadcast(): void {
    this.stateBroadcastTimer = setInterval(() => {
      if (this.stopped) return;
      if (!this.stateDirty) return;
      this.stateDirty = false;
      try {
        // Find all connection IDs mapped to this room
        const connIds = new Set<string>();
        for (const [connId, mapping] of this.connectionToPlayer) {
          if (mapping.roomId === this.room.id) {
            connIds.add(connId);
          }
        }

        for (const connId of connIds) {
          const mapping = this.connectionToPlayer.get(connId);
          if (!mapping) continue;
          const state = this.getState(mapping.uid);
          this.connectionManager.send(connId, {
            type: 'game_state',
            payload: { state },
          });
        }
      } catch {
        // Game may have ended or be in invalid state
      }
    }, 100);

    // Fallback: force full sync every 2 seconds
    this.stateFallbackTimer = setInterval(() => {
      if (this.stopped) return;
      this.stateDirty = true;
    }, 2000);
  }

  /**
   * Stop the state broadcast timer.
   */
  private stopStateBroadcast(): void {
    if (this.stateBroadcastTimer) {
      clearInterval(this.stateBroadcastTimer);
      this.stateBroadcastTimer = null;
    }
    if (this.stateFallbackTimer) {
      clearInterval(this.stateFallbackTimer);
      this.stateFallbackTimer = null;
    }
  }

  /**
   * Find a connection ID by player UID using the connectionToPlayer map.
   */
  private findConnectionIdByUid(uid: number): string | null {
    for (const [connId, mapping] of this.connectionToPlayer) {
      if (mapping.roomId === this.room.id && mapping.uid === uid) {
        return connId;
      }
    }
    return null;
  }
}
