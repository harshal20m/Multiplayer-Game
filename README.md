# Multiplayer Card Game

A real-time multiplayer card game built with Node.js, Express, and Socket.IO where players compete to play the highest card.

## Features

-   Create and join game rooms with unique room codes
-   Support for 2-4 players per room
-   Real-time game state updates
-   Ready/Not Ready system
-   Turn-based gameplay
-   Score tracking
-   Responsive design
-   Visual feedback for game events

## Technology Stack

-   **Backend**: Node.js, Express
-   **Real-time Communication**: Socket.IO
-   **Frontend**: HTML, CSS, JavaScript
-   **No external database required**

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## How to Play

1. Enter your name and either create a new room or join an existing one with a room code
2. Share the room code with friends to invite them to play
3. Click "Ready" when you want to start
4. When it's your turn, click "Play Card" to draw a random card (1-10)
5. The player with the highest card wins the round
6. First player to win 3 rounds wins the game!

## Game Rules

-   2-4 players per room
-   Cards range from 1 to 10
-   One card played per turn
-   Highest card wins the round
-   In case of a tie, no points are awarded
-   First to 3 points wins the game

## Project Structure

```
├── server.js         # Main server file
├── public/
│   └── index.html    # Frontend game interface
├── package.json      # Project dependencies
└── README.md        # Documentation
```

## Development

To modify the game:

-   Game logic is in `server.js`
-   UI and client logic is in `public/index.html`
-   Game constants (like WIN_SCORE) can be modified in `server.js`

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
