import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { GameState, Player, Room, WinnerResult, Card } from '../../models/game.models';
import { BettingControlsComponent } from '../betting-controls/betting-controls.component';
import { PlayerSeatComponent } from '../player-seat/player-seat.component';
import { CommunityCardsComponent } from '../community-cards/community-cards.component';

@Component({
  selector: 'app-game-table',
  standalone: true,
  imports: [CommonModule, BettingControlsComponent, PlayerSeatComponent, CommunityCardsComponent],
  templateUrl: './game-table.component.html',
  styleUrl: './game-table.component.scss'
})
export class GameTableComponent implements OnInit, OnDestroy {
  room: Room | null = null;
  gameState: GameState | null = null;
  playerId: string | null = null;
  winners: WinnerResult[] | null = null;

  private destroy$ = new Subject<void>();

  // Position mapping for 6 players around the table
  readonly seatPositions = [
    { top: '75%', left: '50%' },   // 0 - bottom center (current player)
    { top: '60%', left: '15%' },   // 1 - bottom left
    { top: '25%', left: '15%' },   // 2 - top left
    { top: '10%', left: '50%' },   // 3 - top center
    { top: '25%', left: '85%' },   // 4 - top right
    { top: '60%', left: '85%' },   // 5 - bottom right
  ];

  constructor(
    private socketService: SocketService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.playerId = this.socketService.getPlayerId();

    this.socketService.currentRoom$
      .pipe(takeUntil(this.destroy$))
      .subscribe(room => {
        console.log('GameTable received room update, players:', room?.players?.length);
        this.room = room;
        this.cdr.detectChanges();
        if (!room) {
          this.router.navigate(['/']);
        }
      });

    this.socketService.gameState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        console.log('GameTable received gameState update, phase:', state?.phase);
        this.gameState = state;
        if (state) {
          this.winners = null;
        }
        this.cdr.detectChanges();
      });

    this.socketService.winners$
      .pipe(takeUntil(this.destroy$))
      .subscribe(winners => {
        this.winners = winners;
        this.cdr.detectChanges();
      });

    this.socketService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        console.error('Game error:', error);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentPlayer(): Player | undefined {
    return this.gameState?.players.find(p => p.id === this.playerId);
  }

  get isMyTurn(): boolean {
    if (!this.gameState || !this.playerId) return false;
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    return currentPlayer?.id === this.playerId;
  }

  get canStartGame(): boolean {
    return !!this.room && !this.room.isGameStarted && this.room.players.length >= 2;
  }

  getPlayerAtSeat(seatIndex: number): Player | undefined {
    return this.gameState?.players.find(p => p.position === seatIndex) ||
           this.room?.players.find(p => p.position === seatIndex);
  }

  isDealer(player: Player): boolean {
    if (!this.gameState) return false;
    return this.gameState.players[this.gameState.dealerIndex]?.id === player.id;
  }

  isSmallBlind(player: Player): boolean {
    if (!this.gameState) return false;
    return this.gameState.players[this.gameState.smallBlindIndex]?.id === player.id;
  }

  isBigBlind(player: Player): boolean {
    if (!this.gameState) return false;
    return this.gameState.players[this.gameState.bigBlindIndex]?.id === player.id;
  }

  isCurrentTurn(player: Player): boolean {
    if (!this.gameState) return false;
    return this.gameState.players[this.gameState.currentPlayerIndex]?.id === player.id;
  }

  startGame(): void {
    this.socketService.startGame();
  }

  leaveRoom(): void {
    this.socketService.leaveRoom();
  }

  newHand(): void {
    this.socketService.newHand();
  }

  getWinnerInfo(playerId: string): WinnerResult | undefined {
    return this.winners?.find(w => w.playerId === playerId);
  }
}
