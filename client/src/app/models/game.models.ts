export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface Player {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  totalBetInRound: number;
  isFolded: boolean;
  isAllIn: boolean;
  position: number;
  isConnected: boolean;
}

export interface GameState {
  communityCards: Card[];
  pot: number;
  currentBet: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  phase: GamePhase;
  players: Player[];
  minRaise: number;
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

export interface Room {
  id: string;
  name: string;
  players: Player[];
  maxPlayers: number;
  gameState: GameState | null;
  smallBlind: number;
  bigBlind: number;
  isGameStarted: boolean;
}

export interface WinnerResult {
  playerId: string;
  playerName: string;
  handResult: {
    rank: number;
    rankName: string;
    highCards: number[];
    cards: Card[];
  };
  winAmount: number;
}
