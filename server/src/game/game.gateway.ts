import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from '../room/room.service';

interface CreateRoomPayload {
  name: string;
  maxPlayers?: number;
  smallBlind?: number;
  bigBlind?: number;
}

interface JoinRoomPayload {
  roomId: string;
  playerName: string;
  buyIn: number;
}

interface PlayerActionPayload {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
}

@WebSocketGateway({
  cors: {
    origin: true,  // Allow all origins
    methods: ['GET', 'POST'],
  },
  transports: ['polling', 'websocket'],
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private playerSockets: Map<string, string> = new Map(); // socketId -> playerId
  private socketPlayers: Map<string, string> = new Map(); // playerId -> socketId

  constructor(private readonly roomService: RoomService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const playerId = this.playerSockets.get(client.id);
    if (playerId) {
      // Get room before leaving
      const room = this.roomService.getRoomByPlayerId(playerId);
      const roomId = room?.id;

      // Remove player from room
      const result = this.roomService.leaveRoom(playerId);

      if (result.success && roomId) {
        // Notify remaining players
        if (result.room) {
          this.server.to(roomId).emit('player-left', {
            playerId,
            room: result.room,
          });
        }

        // Broadcast updated room list to everyone
        this.server.emit('room-list', this.roomService.getRoomList());
      }

      this.playerSockets.delete(client.id);
      this.socketPlayers.delete(playerId);
    }
  }

  @SubscribeMessage('get-rooms')
  handleGetRooms(@ConnectedSocket() client: Socket) {
    const rooms = this.roomService.getRoomList();
    client.emit('room-list', rooms);
  }

  @SubscribeMessage('create-room')
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CreateRoomPayload & { playerName: string; buyIn: number },
  ) {
    const room = this.roomService.createRoom(payload);

    // Auto-join the creator to the room
    const playerId = client.id;
    const joinResult = this.roomService.joinRoom(
      room.id,
      playerId,
      payload.playerName,
      payload.buyIn,
    );

    if (joinResult.success) {
      // Track player-socket mapping
      this.playerSockets.set(client.id, playerId);
      this.socketPlayers.set(playerId, client.id);

      // Join socket room
      client.join(room.id);

      // Send room-joined to creator
      client.emit('room-joined', {
        roomId: room.id,
        playerId,
        room: joinResult.room,
      });
    }

    // Broadcast updated room list
    this.server.emit('room-list', this.roomService.getRoomList());
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const playerId = client.id; // Use socket id as player id

    const result = this.roomService.joinRoom(
      payload.roomId,
      playerId,
      payload.playerName,
      payload.buyIn,
    );

    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    // Track player-socket mapping
    this.playerSockets.set(client.id, playerId);
    this.socketPlayers.set(playerId, client.id);

    // Join socket room
    client.join(payload.roomId);

    // Send room info to joining player
    client.emit('room-joined', {
      roomId: payload.roomId,
      playerId,
      room: result.room,
    });

    // Notify ALL players in room (including the one who just joined)
    this.server.to(payload.roomId).emit('player-joined', {
      player: result.room!.players.find((p) => p.id === playerId),
      room: result.room,
    });

    // Update room list for lobby
    this.server.emit('room-list', this.roomService.getRoomList());
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const playerId = this.playerSockets.get(client.id);
    if (!playerId) return;

    const result = this.roomService.leaveRoom(playerId);

    if (result.success && result.roomId) {
      client.leave(result.roomId);
      client.emit('room-left');

      if (result.room) {
        // Notify remaining players
        this.server.to(result.roomId).emit('player-left', {
          playerId,
          room: result.room,
        });
      }

      // Update room list
      this.server.emit('room-list', this.roomService.getRoomList());
    }

    this.playerSockets.delete(client.id);
    this.socketPlayers.delete(playerId);
  }

  @SubscribeMessage('start-game')
  handleStartGame(@ConnectedSocket() client: Socket) {
    const playerId = this.playerSockets.get(client.id);
    if (!playerId) {
      client.emit('error', { message: 'Not in a room' });
      return;
    }

    const room = this.roomService.getRoomByPlayerId(playerId);
    if (!room) {
      client.emit('error', { message: 'Room not found' });
      return;
    }

    const result = this.roomService.startGame(room.id);

    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    // Send game started with personalized state to each player
    room.players.forEach((player) => {
      const socketId = this.socketPlayers.get(player.id);
      if (socketId) {
        const engine = this.roomService.getGameEngine(room.id);
        if (engine) {
          const playerState = engine.getStateForPlayer(player.id);
          this.server.to(socketId).emit('game-started', {
            gameState: playerState,
          });
        }
      }
    });

    // Update room list
    this.server.emit('room-list', this.roomService.getRoomList());
  }

  @SubscribeMessage('player-action')
  handlePlayerAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlayerActionPayload,
  ) {
    const playerId = this.playerSockets.get(client.id);
    if (!playerId) {
      client.emit('error', { message: 'Not in a room' });
      return;
    }

    const room = this.roomService.getRoomByPlayerId(playerId);
    if (!room) {
      client.emit('error', { message: 'Room not found' });
      return;
    }

    const result = this.roomService.processAction(
      room.id,
      playerId,
      payload.action,
      payload.amount,
    );

    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    // Broadcast action to all players
    this.server.to(room.id).emit('player-acted', {
      playerId,
      action: payload.action,
      amount: payload.amount,
    });

    // Send updated game state to each player
    const engine = this.roomService.getGameEngine(room.id);
    if (engine) {
      room.players.forEach((player) => {
        const socketId = this.socketPlayers.get(player.id);
        if (socketId) {
          const playerState = engine.getStateForPlayer(player.id);
          this.server.to(socketId).emit('game-state-updated', {
            gameState: playerState,
          });
        }
      });
    }

    // Check for game end
    if (result.winners) {
      this.server.to(room.id).emit('game-ended', {
        winners: result.winners,
        gameState: result.gameState,
      });

      // Reset game
      setTimeout(() => {
        this.roomService.endGame(room.id);
        this.server.emit('room-list', this.roomService.getRoomList());
      }, 5000);
    }
  }

  @SubscribeMessage('new-hand')
  handleNewHand(@ConnectedSocket() client: Socket) {
    const playerId = this.playerSockets.get(client.id);
    if (!playerId) return;

    const room = this.roomService.getRoomByPlayerId(playerId);
    if (!room) return;

    // Only start new hand if game is not in progress
    if (!room.isGameStarted) {
      this.handleStartGame(client);
    }
  }
}
