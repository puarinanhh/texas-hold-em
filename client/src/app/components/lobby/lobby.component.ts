import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { RoomInfo } from '../../models/game.models';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss'
})
export class LobbyComponent implements OnInit, OnDestroy {
  rooms: RoomInfo[] = [];
  playerName = '';
  buyIn = 1000;
  isConnected = false;

  // Create room form
  showCreateRoom = false;
  newRoomName = '';
  newRoomMaxPlayers = 6;
  newRoomSmallBlind = 10;
  newRoomBigBlind = 20;

  private destroy$ = new Subject<void>();

  constructor(
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.socketService.roomList$
      .pipe(takeUntil(this.destroy$))
      .subscribe(rooms => {
        this.rooms = rooms;
      });

    this.socketService.currentRoom$
      .pipe(takeUntil(this.destroy$))
      .subscribe(room => {
        if (room) {
          this.router.navigate(['/game']);
        }
      });

    this.socketService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        alert(error);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  connect(): void {
    if (!this.playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    this.socketService.connect(undefined, this.playerName, this.buyIn);
    this.isConnected = true;
  }

  createRoom(): void {
    if (!this.newRoomName.trim()) {
      alert('Please enter room name');
      return;
    }
    this.socketService.createRoom(
      this.newRoomName,
      this.newRoomMaxPlayers,
      this.newRoomSmallBlind,
      this.newRoomBigBlind
    );
    this.showCreateRoom = false;
    this.newRoomName = '';
    // Will auto-join and navigate to game
  }

  joinRoom(roomId: string): void {
    if (!this.playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    this.socketService.joinRoom(roomId, this.playerName, this.buyIn);
  }

  refreshRooms(): void {
    this.socketService.getRooms();
  }
}
