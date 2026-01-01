import { Card, HandRank, HandResult, Suit } from './poker.types';
import { getRankValue } from './deck';

export class HandEvaluator {
  /**
   * Evaluate the best 5-card hand from 7 cards (2 hole + 5 community)
   */
  static evaluate(holeCards: Card[], communityCards: Card[]): HandResult {
    const allCards = [...holeCards, ...communityCards];
    const combinations = this.getCombinations(allCards, 5);

    let bestHand: HandResult | null = null;

    for (const combo of combinations) {
      const result = this.evaluateFiveCards(combo);
      if (!bestHand || this.compareHands(result, bestHand) > 0) {
        bestHand = result;
      }
    }

    return bestHand!;
  }

  private static evaluateFiveCards(cards: Card[]): HandResult {
    const sortedCards = [...cards].sort(
      (a, b) => getRankValue(b.rank) - getRankValue(a.rank),
    );

    const isFlush = this.isFlush(sortedCards);
    const straightHighCard = this.getStraightHighCard(sortedCards);
    const isStraight = straightHighCard !== null;

    const rankCounts = this.getRankCounts(sortedCards);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    // Royal Flush
    if (isFlush && isStraight && straightHighCard === 14) {
      return {
        rank: HandRank.ROYAL_FLUSH,
        rankName: 'Royal Flush',
        highCards: [14, 13, 12, 11, 10],
        cards: sortedCards,
      };
    }

    // Straight Flush
    if (isFlush && isStraight) {
      return {
        rank: HandRank.STRAIGHT_FLUSH,
        rankName: 'Straight Flush',
        highCards: [straightHighCard],
        cards: sortedCards,
      };
    }

    // Four of a Kind
    if (counts[0] === 4) {
      const fourKindRank = this.getRankWithCount(rankCounts, 4);
      const kicker = this.getRankWithCount(rankCounts, 1);
      return {
        rank: HandRank.FOUR_OF_A_KIND,
        rankName: 'Four of a Kind',
        highCards: [fourKindRank, kicker],
        cards: sortedCards,
      };
    }

    // Full House
    if (counts[0] === 3 && counts[1] === 2) {
      const threeKindRank = this.getRankWithCount(rankCounts, 3);
      const pairRank = this.getRankWithCount(rankCounts, 2);
      return {
        rank: HandRank.FULL_HOUSE,
        rankName: 'Full House',
        highCards: [threeKindRank, pairRank],
        cards: sortedCards,
      };
    }

    // Flush
    if (isFlush) {
      return {
        rank: HandRank.FLUSH,
        rankName: 'Flush',
        highCards: sortedCards.map((c) => getRankValue(c.rank)),
        cards: sortedCards,
      };
    }

    // Straight
    if (isStraight) {
      return {
        rank: HandRank.STRAIGHT,
        rankName: 'Straight',
        highCards: [straightHighCard],
        cards: sortedCards,
      };
    }

    // Three of a Kind
    if (counts[0] === 3) {
      const threeKindRank = this.getRankWithCount(rankCounts, 3);
      const kickers = this.getRanksWithCount(rankCounts, 1);
      return {
        rank: HandRank.THREE_OF_A_KIND,
        rankName: 'Three of a Kind',
        highCards: [threeKindRank, ...kickers],
        cards: sortedCards,
      };
    }

    // Two Pair
    if (counts[0] === 2 && counts[1] === 2) {
      const pairs = this.getRanksWithCount(rankCounts, 2);
      const kicker = this.getRankWithCount(rankCounts, 1);
      return {
        rank: HandRank.TWO_PAIR,
        rankName: 'Two Pair',
        highCards: [...pairs, kicker],
        cards: sortedCards,
      };
    }

    // One Pair
    if (counts[0] === 2) {
      const pairRank = this.getRankWithCount(rankCounts, 2);
      const kickers = this.getRanksWithCount(rankCounts, 1);
      return {
        rank: HandRank.ONE_PAIR,
        rankName: 'One Pair',
        highCards: [pairRank, ...kickers],
        cards: sortedCards,
      };
    }

    // High Card
    return {
      rank: HandRank.HIGH_CARD,
      rankName: 'High Card',
      highCards: sortedCards.map((c) => getRankValue(c.rank)),
      cards: sortedCards,
    };
  }

  private static isFlush(cards: Card[]): boolean {
    const suit = cards[0].suit;
    return cards.every((c) => c.suit === suit);
  }

  private static getStraightHighCard(cards: Card[]): number | null {
    const values = cards.map((c) => getRankValue(c.rank)).sort((a, b) => b - a);

    // Check normal straight
    let isSequential = true;
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] - values[i + 1] !== 1) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) {
      return values[0];
    }

    // Check wheel (A-2-3-4-5)
    if (
      values[0] === 14 &&
      values[1] === 5 &&
      values[2] === 4 &&
      values[3] === 3 &&
      values[4] === 2
    ) {
      return 5; // Wheel's high card is 5
    }

    return null;
  }

  private static getRankCounts(cards: Card[]): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const card of cards) {
      const value = getRankValue(card.rank);
      counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
  }

  private static getRankWithCount(
    counts: Record<number, number>,
    count: number,
  ): number {
    const ranks = Object.entries(counts)
      .filter(([_, c]) => c === count)
      .map(([r, _]) => parseInt(r))
      .sort((a, b) => b - a);
    return ranks[0];
  }

  private static getRanksWithCount(
    counts: Record<number, number>,
    count: number,
  ): number[] {
    return Object.entries(counts)
      .filter(([_, c]) => c === count)
      .map(([r, _]) => parseInt(r))
      .sort((a, b) => b - a);
  }

  private static getCombinations<T>(arr: T[], k: number): T[][] {
    const result: T[][] = [];

    function combine(start: number, combo: T[]) {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    }

    combine(0, []);
    return result;
  }

  /**
   * Compare two hands. Returns:
   * - positive if hand1 wins
   * - negative if hand2 wins
   * - 0 if tie
   */
  static compareHands(hand1: HandResult, hand2: HandResult): number {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }

    // Same rank, compare high cards
    for (let i = 0; i < hand1.highCards.length; i++) {
      if (hand1.highCards[i] !== hand2.highCards[i]) {
        return hand1.highCards[i] - hand2.highCards[i];
      }
    }

    return 0; // Tie
  }
}
