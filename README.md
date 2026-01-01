# Poker LAN

Texas Hold'em multiplayer game for LAN play, built with Angular and NestJS.

## Quick Start

### 1. Start the Server

```bash
cd server
npm run start:dev
```

Server will run at `http://localhost:3000`

### 2. Start the Client

```bash
cd client
npm start
```

Client will run at `http://localhost:4200`

### 3. Play on LAN

1. Find your local IP address:
   - **Mac/Linux**: `ifconfig` or `ip addr`
   - **Windows**: `ipconfig`

2. Other players connect using your IP:
   - Change server URL in the lobby to: `http://YOUR_IP:3000`

## How to Play

1. **Connect**: Enter your name and click "Connect"
2. **Create/Join Room**: Create a new room or join an existing one
3. **Start Game**: When 2+ players are ready, click "Start Game"
4. **Play**: Use the betting controls when it's your turn
   - **Fold**: Give up your hand
   - **Check**: Pass if no one has bet
   - **Call**: Match the current bet
   - **Raise**: Increase the bet
   - **All-In**: Bet all your chips

## Game Rules (Texas Hold'em)

1. Each player gets 2 private cards
2. 5 community cards are dealt:
   - **Flop**: 3 cards
   - **Turn**: 1 card
   - **River**: 1 card
3. Make the best 5-card hand from your 2 cards + 5 community cards
4. Best hand wins the pot!

## Hand Rankings (Best to Worst)

1. Royal Flush (A-K-Q-J-10 same suit)
2. Straight Flush (5 consecutive same suit)
3. Four of a Kind
4. Full House (3 of a kind + pair)
5. Flush (5 same suit)
6. Straight (5 consecutive)
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

## Project Structure

```
poker-lan/
├── client/          # Angular Frontend
│   └── src/app/
│       ├── components/
│       ├── models/
│       └── services/
└── server/          # NestJS Backend
    └── src/
        ├── game/    # WebSocket Gateway
        ├── poker/   # Game Engine
        └── room/    # Room Management
```

## Tech Stack

- **Frontend**: Angular 19
- **Backend**: NestJS 11
- **Real-time**: Socket.io
