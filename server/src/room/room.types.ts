import { Player, Room, GameState } from '../poker/poker.types';

export interface CreateRoomDto {
  name: string;
  maxPlayers?: number;
  smallBlind?: number;
  bigBlind?: number;
}

export interface JoinRoomDto {
  roomId: string;
  playerName: string;
  buyIn: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isGameStarted: boolean;
  smallBlind: number;
  bigBlind: number;
}

export interface RoomEvent {
  type: 'player-joined' | 'player-left' | 'game-started' | 'game-ended';
  roomId: string;
  data: unknown;
}

export type { Player, Room, GameState };
