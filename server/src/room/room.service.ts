import { Injectable } from '@nestjs/common';
import { Room, Player } from '../poker/poker.types';
import { PokerEngine } from '../poker/poker.engine';
import { CreateRoomDto, RoomInfo } from './room.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RoomService {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId -> roomId
  private gameEngines: Map<string, PokerEngine> = new Map(); // roomId -> engine

  createRoom(dto: CreateRoomDto): Room {
    const room: Room = {
      id: uuidv4(),
      name: dto.name,
      players: [],
      maxPlayers: dto.maxPlayers || 6,
      gameState: null,
      smallBlind: dto.smallBlind || 10,
      bigBlind: dto.bigBlind || 20,
      isGameStarted: false,
    };

    this.rooms.set(room.id, room);
    return room;
  }

  joinRoom(
    roomId: string,
    playerId: string,
    playerName: string,
    buyIn: number,
  ): { success: boolean; error?: string; room?: Room } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    if (room.isGameStarted) {
      return { success: false, error: 'Game already started' };
    }

    // Check if player already in room
    const existingPlayer = room.players.find((p) => p.id === playerId);
    if (existingPlayer) {
      return { success: false, error: 'Already in room' };
    }

    // Find available position
    const usedPositions = new Set(room.players.map((p) => p.position));
    let position = 0;
    while (usedPositions.has(position)) {
      position++;
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      chips: buyIn,
      cards: [],
      currentBet: 0,
      totalBetInRound: 0,
      isFolded: false,
      isAllIn: false,
      position,
      isConnected: true,
      hasActedThisRound: false,
    };

    room.players.push(player);
    this.playerRooms.set(playerId, roomId);

    return { success: true, room };
  }

  leaveRoom(playerId: string): { success: boolean; roomId?: string; room?: Room } {
    const roomId = this.playerRooms.get(playerId);

    if (!roomId) {
      return { success: false };
    }

    const room = this.rooms.get(roomId);

    if (!room) {
      this.playerRooms.delete(playerId);
      return { success: false };
    }

    room.players = room.players.filter((p) => p.id !== playerId);
    this.playerRooms.delete(playerId);

    // If room is empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.gameEngines.delete(roomId);
      return { success: true, roomId };
    }

    return { success: true, roomId, room };
  }

  startGame(roomId: string): { success: boolean; error?: string; gameState?: any } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.length < 2) {
      return { success: false, error: 'Need at least 2 players' };
    }

    if (room.isGameStarted) {
      return { success: false, error: 'Game already started' };
    }

    // Create game engine
    const dealerIndex = Math.floor(Math.random() * room.players.length);
    const engine = new PokerEngine(
      room.players,
      dealerIndex,
      room.smallBlind,
      room.bigBlind,
    );

    const gameState = engine.startGame();
    this.gameEngines.set(roomId, engine);
    room.isGameStarted = true;
    room.gameState = gameState;

    return { success: true, gameState };
  }

  processAction(
    roomId: string,
    playerId: string,
    action: string,
    amount?: number,
  ): { success: boolean; error?: string; gameState?: any; winners?: any } {
    const engine = this.gameEngines.get(roomId);

    if (!engine) {
      return { success: false, error: 'Game not started' };
    }

    const result = engine.processAction(
      playerId,
      action as any,
      amount,
    );

    if (!result.success) {
      return result;
    }

    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = result.gameState;
    }

    // Check if game is over
    if (engine.isGameOver()) {
      const winners = engine.determineWinners();
      engine.distributeWinnings(winners);
      return { success: true, gameState: engine.getState(), winners };
    }

    return { success: true, gameState: result.gameState };
  }

  endGame(roomId: string): void {
    const room = this.rooms.get(roomId);

    if (room) {
      room.isGameStarted = false;
      room.gameState = null;
      // Reset player states but keep chips
      room.players.forEach((p) => {
        p.cards = [];
        p.currentBet = 0;
        p.totalBetInRound = 0;
        p.isFolded = false;
        p.isAllIn = false;
      });
    }

    this.gameEngines.delete(roomId);
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayerId(playerId: string): Room | undefined {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getRoomList(): RoomInfo[] {
    return Array.from(this.rooms.values()).map((room) => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      isGameStarted: room.isGameStarted,
      smallBlind: room.smallBlind,
      bigBlind: room.bigBlind,
    }));
  }

  getGameEngine(roomId: string): PokerEngine | undefined {
    return this.gameEngines.get(roomId);
  }

  setPlayerConnection(playerId: string, isConnected: boolean): void {
    const room = this.getRoomByPlayerId(playerId);
    if (room) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.isConnected = isConnected;
      }
    }
  }
}
