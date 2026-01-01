import { Deck } from './deck';
import { HandEvaluator } from './hand-evaluator';
import {
  Card,
  GamePhase,
  GameState,
  HandRank,
  Player,
  PlayerAction,
  WinnerResult,
} from './poker.types';

export class PokerEngine {
  private deck: Deck;
  private gameState: GameState;

  constructor(
    players: Player[],
    dealerIndex: number,
    smallBlind: number,
    bigBlind: number,
  ) {
    this.deck = new Deck();
    this.gameState = this.initializeGameState(
      players,
      dealerIndex,
      smallBlind,
      bigBlind,
    );
  }

  private initializeGameState(
    players: Player[],
    dealerIndex: number,
    smallBlind: number,
    bigBlind: number,
  ): GameState {
    const activePlayers = players.filter((p) => p.chips > 0);
    const numPlayers = activePlayers.length;

    // Calculate blind positions
    const smallBlindIndex = (dealerIndex + 1) % numPlayers;
    const bigBlindIndex = (dealerIndex + 2) % numPlayers;

    // First to act preflop is after big blind
    const currentPlayerIndex = (bigBlindIndex + 1) % numPlayers;

    return {
      deck: [],
      communityCards: [],
      pot: 0,
      currentBet: bigBlind,
      currentPlayerIndex,
      dealerIndex,
      smallBlindIndex,
      bigBlindIndex,
      phase: 'waiting',
      players: activePlayers.map((p) => ({
        ...p,
        cards: [],
        currentBet: 0,
        totalBetInRound: 0,
        isFolded: false,
        isAllIn: false,
        hasActedThisRound: false,
      })),
      minRaise: bigBlind,
      lastRaiseAmount: bigBlind,
      roundComplete: false,
    };
  }

  startGame(): GameState {
    this.deck.reset();
    this.gameState.phase = 'preflop';
    this.gameState.communityCards = [];
    this.gameState.pot = 0;

    // Reset players
    this.gameState.players.forEach((p) => {
      p.cards = [];
      p.currentBet = 0;
      p.totalBetInRound = 0;
      p.isFolded = false;
      p.isAllIn = false;
      p.hasActedThisRound = false;
    });

    // Post blinds
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();

    return this.getState();
  }

  private postBlinds(): void {
    const smallBlindPlayer = this.gameState.players[this.gameState.smallBlindIndex];
    const bigBlindPlayer = this.gameState.players[this.gameState.bigBlindIndex];

    const smallBlindAmount = Math.min(
      this.gameState.currentBet / 2,
      smallBlindPlayer.chips,
    );
    const bigBlindAmount = Math.min(
      this.gameState.currentBet,
      bigBlindPlayer.chips,
    );

    this.placeBet(smallBlindPlayer, smallBlindAmount);
    this.placeBet(bigBlindPlayer, bigBlindAmount);
  }

  private placeBet(player: Player, amount: number): void {
    const actualAmount = Math.min(amount, player.chips);
    player.chips -= actualAmount;
    player.currentBet += actualAmount;
    player.totalBetInRound += actualAmount;
    this.gameState.pot += actualAmount;

    if (player.chips === 0) {
      player.isAllIn = true;
    }
  }

  private dealHoleCards(): void {
    for (const player of this.gameState.players) {
      player.cards = this.deck.deal(2);
    }
  }

  processAction(
    playerId: string,
    action: PlayerAction,
    raiseAmount?: number,
  ): { success: boolean; error?: string; gameState: GameState } {
    const player = this.gameState.players.find((p) => p.id === playerId);

    if (!player) {
      return { success: false, error: 'Player not found', gameState: this.getState() };
    }

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn', gameState: this.getState() };
    }

    if (player.isFolded || player.isAllIn) {
      return { success: false, error: 'Cannot act', gameState: this.getState() };
    }

    switch (action) {
      case 'fold':
        this.handleFold(player);
        break;
      case 'check':
        if (!this.canCheck(player)) {
          return { success: false, error: 'Cannot check', gameState: this.getState() };
        }
        break;
      case 'call':
        this.handleCall(player);
        break;
      case 'raise':
        if (raiseAmount === undefined) {
          return { success: false, error: 'Raise amount required', gameState: this.getState() };
        }
        const raiseResult = this.handleRaise(player, raiseAmount);
        if (!raiseResult.success) {
          return { success: false, error: raiseResult.error, gameState: this.getState() };
        }
        // Reset hasActedThisRound for other players when there's a raise
        this.gameState.players.forEach((p) => {
          if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
            p.hasActedThisRound = false;
          }
        });
        break;
      case 'all-in':
        const previousBet = this.gameState.currentBet;
        this.handleAllIn(player);
        // If all-in raises, reset hasActedThisRound for other players
        if (this.gameState.currentBet > previousBet) {
          this.gameState.players.forEach((p) => {
            if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
              p.hasActedThisRound = false;
            }
          });
        }
        break;
    }

    // Mark player as having acted this round
    player.hasActedThisRound = true;

    // Check if only one player remains
    const activePlayers = this.gameState.players.filter(
      (p) => !p.isFolded && !p.isAllIn,
    );
    const allInPlayers = this.gameState.players.filter(
      (p) => !p.isFolded && p.isAllIn,
    );

    if (activePlayers.length + allInPlayers.length === 1) {
      // Everyone else folded
      this.gameState.phase = 'showdown';
      return { success: true, gameState: this.getState() };
    }

    // Move to next player
    this.moveToNextPlayer();

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.advancePhase();
    }

    return { success: true, gameState: this.getState() };
  }

  private handleFold(player: Player): void {
    player.isFolded = true;
  }

  private canCheck(player: Player): boolean {
    return player.currentBet >= this.gameState.currentBet;
  }

  private handleCall(player: Player): void {
    const callAmount = this.gameState.currentBet - player.currentBet;
    this.placeBet(player, callAmount);
  }

  private handleRaise(
    player: Player,
    raiseAmount: number,
  ): { success: boolean; error?: string } {
    const totalBet = raiseAmount;
    const raiseSize = totalBet - this.gameState.currentBet;

    if (raiseSize < this.gameState.minRaise && player.chips > raiseAmount - player.currentBet) {
      return { success: false, error: `Minimum raise is ${this.gameState.minRaise}` };
    }

    const amountToCall = totalBet - player.currentBet;
    if (amountToCall > player.chips) {
      return { success: false, error: 'Not enough chips' };
    }

    this.placeBet(player, amountToCall);
    this.gameState.currentBet = totalBet;
    this.gameState.lastRaiseAmount = raiseSize;
    this.gameState.minRaise = raiseSize;

    // Reset round complete flag since there's a new bet
    this.gameState.roundComplete = false;

    return { success: true };
  }

  private handleAllIn(player: Player): void {
    const allInAmount = player.chips;
    const totalBet = player.currentBet + allInAmount;

    if (totalBet > this.gameState.currentBet) {
      const raiseAmount = totalBet - this.gameState.currentBet;
      this.gameState.currentBet = totalBet;
      if (raiseAmount >= this.gameState.minRaise) {
        this.gameState.lastRaiseAmount = raiseAmount;
        this.gameState.minRaise = raiseAmount;
      }
      this.gameState.roundComplete = false;
    }

    this.placeBet(player, allInAmount);
  }

  private moveToNextPlayer(): void {
    let nextIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
    let attempts = 0;

    while (attempts < this.gameState.players.length) {
      const nextPlayer = this.gameState.players[nextIndex];
      if (!nextPlayer.isFolded && !nextPlayer.isAllIn) {
        this.gameState.currentPlayerIndex = nextIndex;
        return;
      }
      nextIndex = (nextIndex + 1) % this.gameState.players.length;
      attempts++;
    }

    // All players are folded or all-in
    this.gameState.currentPlayerIndex = -1;
  }

  private isBettingRoundComplete(): boolean {
    const activePlayers = this.gameState.players.filter(
      (p) => !p.isFolded && !p.isAllIn,
    );

    if (activePlayers.length === 0) {
      return true;
    }

    // All active players must have matched the current bet AND acted this round
    const allMatchedAndActed = activePlayers.every(
      (p) => p.currentBet >= this.gameState.currentBet && p.hasActedThisRound,
    );

    return allMatchedAndActed;
  }

  private advancePhase(): void {
    // Reset current bets and hasActedThisRound for new round
    this.gameState.players.forEach((p) => {
      p.currentBet = 0;
      p.hasActedThisRound = false;
    });
    this.gameState.currentBet = 0;
    this.gameState.roundComplete = false;

    // Check if all remaining players are all-in - auto run out the board
    const activePlayers = this.gameState.players.filter(
      (p) => !p.isFolded && !p.isAllIn,
    );
    const allInPlayers = this.gameState.players.filter(
      (p) => !p.isFolded && p.isAllIn,
    );

    // If no active players left (all are all-in or folded), run out the board
    if (activePlayers.length === 0 && allInPlayers.length >= 2) {
      this.runOutBoard();
      return;
    }

    // If only 1 active player and others are all-in, also run out
    if (activePlayers.length === 1 && allInPlayers.length >= 1) {
      this.runOutBoard();
      return;
    }

    // Set first active player after dealer
    this.setFirstActivePlayer();

    switch (this.gameState.phase) {
      case 'preflop':
        this.gameState.phase = 'flop';
        this.gameState.communityCards.push(...this.deck.deal(3));
        break;
      case 'flop':
        this.gameState.phase = 'turn';
        this.gameState.communityCards.push(...this.deck.deal(1));
        break;
      case 'turn':
        this.gameState.phase = 'river';
        this.gameState.communityCards.push(...this.deck.deal(1));
        break;
      case 'river':
        this.gameState.phase = 'showdown';
        break;
    }
  }

  private setFirstActivePlayer(): void {
    let index = (this.gameState.dealerIndex + 1) % this.gameState.players.length;
    for (let i = 0; i < this.gameState.players.length; i++) {
      const player = this.gameState.players[index];
      if (!player.isFolded && !player.isAllIn) {
        this.gameState.currentPlayerIndex = index;
        return;
      }
      index = (index + 1) % this.gameState.players.length;
    }
    this.gameState.currentPlayerIndex = -1;
  }

  private runOutBoard(): void {
    // Deal all remaining community cards and go to showdown
    const cardsNeeded = 5 - this.gameState.communityCards.length;

    if (this.gameState.phase === 'preflop') {
      // Deal flop (3 cards)
      this.gameState.communityCards.push(...this.deck.deal(3));
    }

    if (this.gameState.communityCards.length < 4) {
      // Deal turn
      this.gameState.communityCards.push(...this.deck.deal(1));
    }

    if (this.gameState.communityCards.length < 5) {
      // Deal river
      this.gameState.communityCards.push(...this.deck.deal(1));
    }

    this.gameState.phase = 'showdown';
    this.gameState.currentPlayerIndex = -1;
  }

  determineWinners(): WinnerResult[] {
    const activePlayers = this.gameState.players.filter((p) => !p.isFolded);

    if (activePlayers.length === 1) {
      return [
        {
          playerId: activePlayers[0].id,
          playerName: activePlayers[0].name,
          handResult: {
            rank: HandRank.HIGH_CARD,
            rankName: 'Winner by fold',
            highCards: [],
            cards: [],
          },
          winAmount: this.gameState.pot,
        },
      ];
    }

    // Evaluate hands
    const playerHands = activePlayers.map((player) => ({
      player,
      hand: HandEvaluator.evaluate(player.cards, this.gameState.communityCards),
    }));

    // Sort by hand strength
    playerHands.sort((a, b) => HandEvaluator.compareHands(b.hand, a.hand));

    // Find winners (could be ties)
    const winners: typeof playerHands = [playerHands[0]];
    for (let i = 1; i < playerHands.length; i++) {
      if (HandEvaluator.compareHands(playerHands[i].hand, winners[0].hand) === 0) {
        winners.push(playerHands[i]);
      } else {
        break;
      }
    }

    // Split pot among winners
    const winAmount = Math.floor(this.gameState.pot / winners.length);

    return winners.map(({ player, hand }) => ({
      playerId: player.id,
      playerName: player.name,
      handResult: hand,
      winAmount,
    }));
  }

  distributeWinnings(winners: WinnerResult[]): void {
    for (const winner of winners) {
      const player = this.gameState.players.find((p) => p.id === winner.playerId);
      if (player) {
        player.chips += winner.winAmount;
      }
    }
    this.gameState.pot = 0;
  }

  getState(): GameState {
    return { ...this.gameState };
  }

  getStateForPlayer(playerId: string): GameState {
    // Return state with hidden cards for other players
    return {
      ...this.gameState,
      deck: [], // Never send deck to client
      players: this.gameState.players.map((p) => ({
        ...p,
        cards: p.id === playerId ? p.cards : [], // Only show own cards
      })),
    };
  }

  getPhase(): GamePhase {
    return this.gameState.phase;
  }

  isGameOver(): boolean {
    return this.gameState.phase === 'showdown';
  }
}
