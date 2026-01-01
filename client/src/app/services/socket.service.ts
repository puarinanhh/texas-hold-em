import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { GameState, Player, RoomInfo, Room, WinnerResult, PlayerAction } from '../models/game.models';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private playerName = '';
  private buyIn = 1000;

  constructor(private ngZone: NgZone) {
    // Use the same host that served this page (for LAN play)
    const hostname = window.location.hostname;
    // If accessing via IP, use that IP for socket connection
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      this.serverUrl = `http://${hostname}:3000`;
    } else {
      this.serverUrl = 'http://192.168.99.228:3000';
    }
    console.log('Socket server URL:', this.serverUrl);
  }

  // Subjects for reactive data
  private roomListSubject = new BehaviorSubject<RoomInfo[]>([]);
  private currentRoomSubject = new BehaviorSubject<Room | null>(null);
  private gameStateSubject = new BehaviorSubject<GameState | null>(null);
  private playerIdSubject = new BehaviorSubject<string | null>(null);
  private errorSubject = new Subject<string>();
  private winnersSubject = new Subject<WinnerResult[]>();

  // Public observables
  roomList$ = this.roomListSubject.asObservable();
  currentRoom$ = this.currentRoomSubject.asObservable();
  gameState$ = this.gameStateSubject.asObservable();
  playerId$ = this.playerIdSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  winners$ = this.winnersSubject.asObservable();

  connect(serverUrl?: string, playerName?: string, buyIn?: number): void {
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }
    if (playerName) {
      this.playerName = playerName;
    }
    if (buyIn) {
      this.buyIn = buyIn;
    }

    this.socket = io(this.serverUrl, {
      transports: ['polling', 'websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('room-list', (rooms: RoomInfo[]) => {
      this.ngZone.run(() => this.roomListSubject.next(rooms));
    });

    this.socket.on('room-created', (data: { roomId: string; room: Room }) => {
      console.log('Room created:', data);
    });

    this.socket.on('room-joined', (data: { roomId: string; playerId: string; room: Room }) => {
      this.ngZone.run(() => {
        this.playerIdSubject.next(data.playerId);
        this.currentRoomSubject.next(data.room);
      });
    });

    this.socket.on('player-joined', (data: { player: Player; room: Room }) => {
      console.log('Player joined:', data.player?.name, 'Room players:', data.room?.players?.length);
      this.ngZone.run(() => this.currentRoomSubject.next(data.room));
    });

    this.socket.on('player-left', (data: { playerId: string; room: Room }) => {
      console.log('Player left:', data.playerId);
      this.ngZone.run(() => this.currentRoomSubject.next(data.room));
    });

    this.socket.on('game-state-updated', (data: { gameState: GameState }) => {
      console.log('Game state updated:', data.gameState?.phase, 'Players:', data.gameState?.players?.length);
      this.ngZone.run(() => this.gameStateSubject.next(data.gameState));
    });

    this.socket.on('room-left', () => {
      this.ngZone.run(() => {
        this.currentRoomSubject.next(null);
        this.gameStateSubject.next(null);
        this.playerIdSubject.next(null);
      });
    });

    this.socket.on('game-started', (data: { gameState: GameState }) => {
      console.log('Game started:', data.gameState?.phase);
      this.ngZone.run(() => this.gameStateSubject.next(data.gameState));
    });

    this.socket.on('player-acted', (data: { playerId: string; action: PlayerAction; amount?: number }) => {
      console.log('Player acted:', data);
    });

    this.socket.on('game-ended', (data: { winners: WinnerResult[]; gameState: GameState }) => {
      this.ngZone.run(() => {
        this.gameStateSubject.next(data.gameState);
        this.winnersSubject.next(data.winners);
      });
    });

    this.socket.on('error', (data: { message: string }) => {
      this.ngZone.run(() => this.errorSubject.next(data.message));
    });

    this.socket.on('player-disconnected', (data: { playerId: string }) => {
      console.log('Player disconnected:', data.playerId);
    });

    // Request initial room list
    this.getRooms();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getRooms(): void {
    this.socket?.emit('get-rooms');
  }

  createRoom(name: string, maxPlayers = 6, smallBlind = 10, bigBlind = 20): void {
    this.socket?.emit('create-room', {
      name,
      maxPlayers,
      smallBlind,
      bigBlind,
      playerName: this.playerName,
      buyIn: this.buyIn
    });
  }

  joinRoom(roomId: string, playerName: string, buyIn: number): void {
    this.socket?.emit('join-room', { roomId, playerName, buyIn });
  }

  leaveRoom(): void {
    this.socket?.emit('leave-room');
  }

  startGame(): void {
    this.socket?.emit('start-game');
  }

  playerAction(action: PlayerAction, amount?: number): void {
    this.socket?.emit('player-action', { action, amount });
  }

  newHand(): void {
    this.socket?.emit('new-hand');
  }

  getPlayerId(): string | null {
    return this.playerIdSubject.getValue();
  }

  getCurrentRoom(): Room | null {
    return this.currentRoomSubject.getValue();
  }

  getGameState(): GameState | null {
    return this.gameStateSubject.getValue();
  }
}
