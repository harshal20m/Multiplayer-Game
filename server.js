// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from current directory
app.use(express.static(path.join(__dirname, "public")));

// Game state management
const WIN_SCORE = 3;
const rooms = new Map();

// Route to serve the game
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.io connection handler
io.on("connection", (socket) => {
	console.log(`User connected: ${socket.id}`);

	// Handle room creation
	socket.on("createRoom", (playerName) => {
		const roomId = generateRoomId();

		// Create room with initial state
		rooms.set(roomId, {
			id: roomId,
			players: [{ id: socket.id, name: playerName, ready: false, score: 0, card: null }],
			gameStarted: false,
			currentPlayerIndex: 0,
			roundInProgress: false,
		});

		// Join socket to room
		socket.join(roomId);
		socket.emit("roomCreated", { roomId, playerId: socket.id });

		console.log(`Room created: ${roomId} by ${playerName}`);
	});

	// Handle player joining a room
	socket.on("joinRoom", ({ roomId, playerName }) => {
		const room = rooms.get(roomId);

		if (!room) {
			socket.emit("error", "Room not found");
			return;
		}

		if (room.gameStarted) {
			socket.emit("error", "Game already in progress");
			return;
		}

		if (room.players.length >= 4) {
			socket.emit("error", "Room is full");
			return;
		}

		// Add player to room
		room.players.push({
			id: socket.id,
			name: playerName,
			ready: false,
			score: 0,
			card: null,
		});

		// Join socket to room
		socket.join(roomId);
		socket.emit("roomJoined", { roomId, playerId: socket.id });

		// Notify all players in the room about the new player
		io.to(roomId).emit("playersUpdate", { players: room.players });

		console.log(`Player ${playerName} joined room ${roomId}`);
	});

	// Player readiness toggle
	socket.on("toggleReady", (roomId) => {
		const room = rooms.get(roomId);
		if (!room) return;

		const player = room.players.find((p) => p.id === socket.id);
		if (player) {
			player.ready = !player.ready;

			// Check if all players are ready to start
			const allReady = room.players.length >= 2 && room.players.every((p) => p.ready);
			if (allReady && !room.gameStarted) {
				room.gameStarted = true;
				startGame(roomId);
			}

			io.to(roomId).emit("playersUpdate", { players: room.players });
		}
	});

	// Handle card play
	socket.on("playCard", (roomId) => {
		const room = rooms.get(roomId);
		if (!room || !room.gameStarted) return;

		const currentPlayer = room.players[room.currentPlayerIndex];

		// Make sure it's this player's turn
		if (currentPlayer.id !== socket.id) {
			socket.emit("error", "It's not your turn");
			return;
		}

		// Draw a card (random number between 1-10)
		const card = Math.floor(Math.random() * 10) + 1;
		currentPlayer.card = card;

		// Notify all players about the card played
		io.to(roomId).emit("cardPlayed", {
			playerId: socket.id,
			playerName: currentPlayer.name,
			card: card,
		});

		// Move to next player or resolve round
		if (room.currentPlayerIndex < room.players.length - 1) {
			room.currentPlayerIndex++;
			io.to(roomId).emit("nextTurn", {
				currentPlayer: room.players[room.currentPlayerIndex],
			});
		} else {
			// Last player has played, resolve the round
			resolveRound(roomId);
		}
	});

	// Handle player disconnect
	socket.on("disconnect", () => {
		console.log(`User disconnected: ${socket.id}`);

		// Find and clean up any rooms the player was in
		for (const [roomId, room] of rooms.entries()) {
			const playerIndex = room.players.findIndex((p) => p.id === socket.id);

			if (playerIndex !== -1) {
				// Remove player from room
				room.players.splice(playerIndex, 1);

				// If room is empty, delete it
				if (room.players.length === 0) {
					rooms.delete(roomId);
					console.log(`Room ${roomId} deleted (empty)`);
				} else {
					// Notify remaining players
					io.to(roomId).emit("playerLeft", { playerId: socket.id });
					io.to(roomId).emit("playersUpdate", { players: room.players });

					// If game was in progress, and there's only one player left, they win
					if (room.gameStarted && room.players.length === 1) {
						io.to(roomId).emit("gameOver", {
							winner: room.players[0],
							message: "You win! Other players left.",
						});
						room.gameStarted = false;
					}

					// If it was this player's turn, move to next player
					if (room.gameStarted && playerIndex === room.currentPlayerIndex) {
						// Adjust current player index
						room.currentPlayerIndex = room.currentPlayerIndex % room.players.length;
						io.to(roomId).emit("nextTurn", {
							currentPlayer: room.players[room.currentPlayerIndex],
						});
					}
				}
				break;
			}
		}
	});
});

// Helper function to generate a random room ID
function generateRoomId() {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Start a new game in a room
function startGame(roomId) {
	const room = rooms.get(roomId);
	if (!room) return;

	// Reset game state
	room.players.forEach((player) => {
		player.score = 0;
		player.card = null;
	});

	room.currentPlayerIndex = 0;
	room.roundInProgress = true;

	// Notify all players that game has started
	io.to(roomId).emit("gameStarted", {
		message: "Game has started!",
		currentPlayer: room.players[0],
	});

	console.log(`Game started in room ${roomId}`);
}

// Resolve a round and determine winners
function resolveRound(roomId) {
	const room = rooms.get(roomId);
	if (!room) return;

	// Find highest card
	const maxCard = Math.max(...room.players.map((p) => p.card));

	// Find winners (players with highest card)
	const winners = room.players.filter((p) => p.card === maxCard);

	let gameWinner = null;

	// Award points to winners
	if (winners.length === 1) {
		// Single winner for the round
		const winner = winners[0];
		winner.score += 1;

		// Check if they've won the game
		if (winner.score >= WIN_SCORE) {
			gameWinner = winner;
		}
	}

	// Send round results to all players
	io.to(roomId).emit("roundResult", {
		winners: winners,
		players: room.players,
	});

	// If someone won the game
	if (gameWinner) {
		io.to(roomId).emit("gameOver", {
			winner: gameWinner,
			message: `${gameWinner.name} wins the game!`,
		});

		// Reset game state but keep players
		room.gameStarted = false;
		room.players.forEach((p) => {
			p.ready = false;
			p.score = 0;
			p.card = null;
		});
	} else {
		// Reset for next round
		room.players.forEach((p) => (p.card = null));
		room.currentPlayerIndex = 0;

		// After a short delay, start next round
		setTimeout(() => {
			io.to(roomId).emit("nextRound", {
				currentPlayer: room.players[0],
			});
		}, 2000);
	}
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
