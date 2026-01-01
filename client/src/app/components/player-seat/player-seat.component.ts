import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player, Card, WinnerResult } from '../../models/game.models';

@Component({
  selector: 'app-player-seat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-seat.component.html',
  styleUrl: './player-seat.component.scss'
})
export class PlayerSeatComponent {
  @Input() player!: Player;
  @Input() isCurrentPlayer = false;
  @Input() isDealer = false;
  @Input() isSmallBlind = false;
  @Input() isBigBlind = false;
  @Input() isCurrentTurn = false;
  @Input() showCards = false;
  @Input() winner?: WinnerResult;

  getCardDisplay(card: Card): string {
    const suitSymbols: Record<string, string> = {
      hearts: '\u2665',
      diamonds: '\u2666',
      clubs: '\u2663',
      spades: '\u2660'
    };
    return `${card.rank}${suitSymbols[card.suit]}`;
  }

  getCardColor(card: Card): string {
    return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black';
  }

  get positionLabel(): string {
    if (this.isDealer) return 'D';
    if (this.isSmallBlind) return 'SB';
    if (this.isBigBlind) return 'BB';
    return '';
  }
}
