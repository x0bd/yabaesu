import { Server as SocketIOServer } from "socket.io";

// Define common types
interface Player {
	username: string;
	wins: number;
}

// Debug logging
const DEBUG = true;
function debugLog(message: string, data?: any) {
	if (DEBUG) {
		console.log(`[ROOM DEBUG] ${message}`, data || "");
	}
}

export class GameRoom {
	id: string;
	player1: string; // socketId
	player2: string; // socketId
	drawingUserId: string | null = null;
	guessingUserId: string | null = null;
	currentWord: string | null = null;
	drawingTimerInterval: NodeJS.Timeout | null = null;
	timeRemaining: number = 100; // seconds
	leaderboard: Player[] = [];
	io: SocketIOServer;
	connectedUsers: Map<string, string>;
	userColors: Map<string, string>;
	words: string[];

	constructor(
		id: string,
		player1: string,
		player2: string,
		io: SocketIOServer,
		connectedUsers: Map<string, string>,
		userColors: Map<string, string>,
		words: string[]
	) {
		this.id = id;
		this.player1 = player1;
		this.player2 = player2;
		this.io = io;
		this.connectedUsers = connectedUsers;
		this.userColors = userColors;
		this.words = words;
	}

	startGame() {
		debugLog(`Starting game in room ${this.id}`, {
			player1: this.player1,
			player1Name: this.connectedUsers.get(this.player1),
			player2: this.player2,
			player2Name: this.connectedUsers.get(this.player2),
		});

		this.chooseInitialDrawer();
	}

	chooseInitialDrawer() {
		this.drawingUserId = Math.random() < 0.5 ? this.player1 : this.player2;
		this.guessingUserId =
			this.drawingUserId === this.player1 ? this.player2 : this.player1;

		debugLog(`Room ${this.id} - Drawer selected`, {
			drawer: this.drawingUserId,
			drawerUsername: this.connectedUsers.get(this.drawingUserId),
			guesser: this.guessingUserId,
			guesserUsername: this.connectedUsers.get(this.guessingUserId),
		});

		this.currentWord = this.selectRandomWord();
		debugLog(`Room ${this.id} - Word selected`, this.currentWord);

		// Send clear canvas to both players
		this.io.to(this.player1).emit("clear-canvas");
		this.io.to(this.player2).emit("clear-canvas");

		// Send game state update to both players
		const drawingUsername =
			this.connectedUsers.get(this.drawingUserId || "") || "";
		const guessingUsername =
			this.connectedUsers.get(this.guessingUserId || "") || "";

		const gameStateUpdate = {
			drawingUser: drawingUsername,
			guessingUser: guessingUsername,
			currentWord: this.currentWord,
			isDrawingTurn: true,
		};

		this.io.to(this.player1).emit("game-state-update", gameStateUpdate);
		this.io.to(this.player2).emit("game-state-update", gameStateUpdate);

		// Send specific role events
		if (this.drawingUserId) {
			this.io.to(this.drawingUserId).emit("start-drawing-turn");
			this.io.to(this.drawingUserId).emit("your-word", this.currentWord);
		}

		if (this.guessingUserId) {
			this.io.to(this.guessingUserId).emit("start-guessing-turn");
		}

		// Send a system message
		this.sendSystemMessage(
			`Game started! ${drawingUsername} is drawing, ${guessingUsername} is guessing.`
		);

		this.startDrawingTimer();
	}

	startDrawingTimer() {
		this.timeRemaining = 100; // Reset timer

		if (this.drawingTimerInterval !== null) {
			clearInterval(this.drawingTimerInterval);
		}

		this.drawingTimerInterval = setInterval(() => {
			this.timeRemaining--;

			// Send timer update to both players
			this.io.to(this.player1).emit("timer-update", this.timeRemaining);
			this.io.to(this.player2).emit("timer-update", this.timeRemaining);

			if (this.timeRemaining <= 0) {
				if (this.drawingTimerInterval !== null) {
					clearInterval(this.drawingTimerInterval);
					this.drawingTimerInterval = null;
				}

				this.sendSystemMessage(
					`Time's up! The word was "${this.currentWord}".`
				);
				this.endRound();
			}
		}, 1000);
	}

	endRound() {
		// Swap roles
		const tempDrawer = this.drawingUserId;
		this.drawingUserId = this.guessingUserId;
		this.guessingUserId = tempDrawer;

		debugLog(`Room ${this.id} - Roles switched`, {
			newDrawer: this.drawingUserId,
			newDrawerName: this.connectedUsers.get(this.drawingUserId),
			newGuesser: this.guessingUserId,
			newGuesserName: this.connectedUsers.get(this.guessingUserId),
		});

		this.currentWord = this.selectRandomWord();
		debugLog(`Room ${this.id} - New word selected`, this.currentWord);

		// Clear canvas for new round
		this.io.to(this.player1).emit("clear-canvas");
		this.io.to(this.player2).emit("clear-canvas");

		// Send game state update for new round
		const drawingUsername =
			this.connectedUsers.get(this.drawingUserId || "") || "";
		const guessingUsername =
			this.connectedUsers.get(this.guessingUserId || "") || "";

		const gameStateUpdate = {
			drawingUser: drawingUsername,
			guessingUser: guessingUsername,
			currentWord: this.currentWord,
			isDrawingTurn: true,
		};

		this.io.to(this.player1).emit("game-state-update", gameStateUpdate);
		this.io.to(this.player2).emit("game-state-update", gameStateUpdate);

		// Send role-specific events
		if (this.drawingUserId) {
			this.io.to(this.drawingUserId).emit("start-drawing-turn");
			this.io.to(this.drawingUserId).emit("your-word", this.currentWord);
		}

		if (this.guessingUserId) {
			this.io.to(this.guessingUserId).emit("start-guessing-turn");
		}

		this.sendSystemMessage("New round started! Roles have switched.");
		this.startDrawingTimer();
	}

	updateLeaderboard(username: string) {
		const player = this.leaderboard.find(
			(entry) => entry.username === username
		);
		if (player) {
			player.wins++;
		} else {
			this.leaderboard.push({ username, wins: 1 });
		}

		// Sort leaderboard
		this.leaderboard.sort((a, b) => b.wins - a.wins);

		// Send updated leaderboard to both players
		this.io.to(this.player1).emit("leaderboard-update", this.leaderboard);
		this.io.to(this.player2).emit("leaderboard-update", this.leaderboard);
	}

	sendSystemMessage(message: string) {
		const chatMessage = {
			username: "System",
			message: message,
			color: "#000000", // Black for system messages
		};

		this.io.to(this.player1).emit("chat-message", chatMessage);
		this.io.to(this.player2).emit("chat-message", chatMessage);
	}

	handleGuess(socketId: string, username: string, guess: string) {
		// Only process guesses from the guessing player
		if (socketId !== this.guessingUserId) return;

		const normalizedGuess = guess.trim().toLowerCase();
		const normalizedWord = this.currentWord?.toLowerCase() || "";

		if (normalizedGuess === normalizedWord) {
			this.sendSystemMessage(
				`${username} guessed it! The word was "${this.currentWord}".`
			);
			this.updateLeaderboard(username);
			this.endRound();
		} else {
			// Send the chat message to both players
			const color = this.getUserColor(username);
			const chatMessage = { username, message: guess, color };

			this.io.to(this.player1).emit("chat-message", chatMessage);
			this.io.to(this.player2).emit("chat-message", chatMessage);
		}
	}

	handleDrawing(data: any) {
		// Only forward drawing from the drawer to the guesser
		if (this.guessingUserId) {
			this.io.to(this.guessingUserId).emit("draw", data);
		}
	}

	handleChatMessage(username: string, message: string) {
		const color = this.getUserColor(username);
		const chatMessage = { username, message, color };

		this.io.to(this.player1).emit("chat-message", chatMessage);
		this.io.to(this.player2).emit("chat-message", chatMessage);
	}

	cleanup() {
		if (this.drawingTimerInterval !== null) {
			clearInterval(this.drawingTimerInterval);
			this.drawingTimerInterval = null;
		}
	}

	handlePlayerDisconnect(socketId: string) {
		const username = this.connectedUsers.get(socketId);

		if (socketId === this.player1) {
			if (this.player2) {
				this.sendSystemMessage(
					`${username} disconnected. Waiting for new players...`
				);
			}
		} else if (socketId === this.player2) {
			if (this.player1) {
				this.sendSystemMessage(
					`${username} disconnected. Waiting for new players...`
				);
			}
		}

		// Clean up the room
		this.cleanup();
	}

	getUserColor(username: string): string {
		return this.userColors.get(username) || "#000000";
	}

	selectRandomWord(): string {
		const randomIndex = Math.floor(Math.random() * this.words.length);
		return this.words[randomIndex];
	}
}
