import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../models/game.models';

@Component({
  selector: 'app-community-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './community-cards.component.html',
  styleUrl: './community-cards.component.scss'
})
export class CommunityCardsComponent {
  @Input() cards: Card[] = [];

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
}
