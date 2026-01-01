import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-betting-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './betting-controls.component.html',
  styleUrl: './betting-controls.component.scss'
})
export class BettingControlsComponent {
  @Input() currentBet = 0;
  @Input() playerBet = 0;
  @Input() playerChips = 0;
  @Input() minRaise = 0;
  @Input() pot = 0;

  raiseAmount = 0;

  constructor(private socketService: SocketService) {}

  get callAmount(): number {
    return this.currentBet - this.playerBet;
  }

  get canCheck(): boolean {
    return this.callAmount === 0;
  }

  get canCall(): boolean {
    return this.callAmount > 0 && this.callAmount <= this.playerChips;
  }

  get minRaiseTotal(): number {
    return this.currentBet + this.minRaise;
  }

  get maxRaise(): number {
    return this.playerChips + this.playerBet;
  }

  ngOnChanges(): void {
    this.raiseAmount = this.minRaiseTotal;
  }

  fold(): void {
    this.socketService.playerAction('fold');
  }

  check(): void {
    this.socketService.playerAction('check');
  }

  call(): void {
    this.socketService.playerAction('call');
  }

  raise(): void {
    this.socketService.playerAction('raise', this.raiseAmount);
  }

  allIn(): void {
    this.socketService.playerAction('all-in');
  }

  setRaiseHalf(): void {
    this.raiseAmount = Math.max(this.minRaiseTotal, Math.floor(this.pot / 2) + this.currentBet);
  }

  setRaisePot(): void {
    this.raiseAmount = Math.min(this.maxRaise, this.pot + this.currentBet);
  }
}
