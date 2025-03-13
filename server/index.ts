import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
	cors: {
		origin: "http://localhost:5173",
		methods: ["GET", "POST"],
	},
});

// --- Game State ---
const connectedUsers = new Map<string, string>();
let gamePlayers: { player1?: string; player2?: string } = {};
let drawingUserSocketId: string | null = null;
let guessingUserSocketId: string | null = null;
let currentWord: string | null = null;
let drawingTimerInterval: NodeJS.Timeout | null = null;
const drawingTimeLimit = 100; // seconds
let timeRemaining: number = drawingTimeLimit;
const leaderboard: Array<{ username: string; wins: number }> = [];
// --- End Game State ---

// --- Word List ---
const words = [
	"apple",
	"banana",
	"car",
	"dog",
	"flower",
	"house",
	"sun",
	"tree",
	"book",
	"computer",
];
// --- End Word List ---

// Serve static files
const frontendBuildPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(frontendBuildPath));

io.on("connection", (socket) => {
	console.log("A user connected:", socket.id);

	socket.on("user-joined", (username) => {
		console.log(`User ${username} joined with ID: ${socket.id}`);
		connectedUsers.set(socket.id, username);
		emitConnectedUsers();
		tryStartGame();
	});

	socket.on("disconnect", () => {
		const username = connectedUsers.get(socket.id);
		if (username) {
			console.log(`User ${username} disconnected: ${socket.id}`);
			connectedUsers.delete(socket.id);
			if (gamePlayers.player1 === socket.id) {
				gamePlayers.player1 = undefined;
			} else if (gamePlayers.player2 === socket.id) {
				gamePlayers.player2 = undefined;
			}
			resetGameState();
			emitConnectedUsers();
		}
	});

	socket.on("drawing", (data) => {
		socket.broadcast.emit("draw", data);
	});

	socket.on("chat-message", (data) => {
		io.emit("chat-message", data);
	});

	socket.on("guess", (data) => {
		console.log(`User ${data.username} guessed: ${data.guess}`);
		const guess = data.guess.trim().toLowerCase();
		if (currentWord && guess === currentWord.toLowerCase()) {
			const guessingUser = connectedUsers.get(socket.id);
			if (guessingUser) {
				io.emit("chat-message", {
					username: "System",
					message: `${guessingUser} guessed it! The word was "${currentWord}".`,
				});
				updateLeaderboard(guessingUser);
				emitLeaderboard();
				endRound();
			}
		} else {
			io.emit("chat-message", {
				username: data.username,
				message: data.guess,
			});
		}
	});
});

function emitConnectedUsers() {
	const usernames = Array.from(connectedUsers.values());
	io.emit("connected-users", usernames);
}

function tryStartGame() {
	if (Object.keys(gamePlayers).length < 2 && connectedUsers.size >= 2) {
		const users = Array.from(connectedUsers.keys());
		gamePlayers = {
			player1: users[0],
			player2: users[1],
		};
		console.log("Game started with players:", gamePlayers);
		chooseInitialDrawer();
	}
}

function chooseInitialDrawer() {
	if (gamePlayers.player1 && gamePlayers.player2) {
		drawingUserSocketId =
			Math.random() < 0.5 ? gamePlayers.player1 : gamePlayers.player2;
		guessingUserSocketId =
			drawingUserSocketId === gamePlayers.player1
				? gamePlayers.player2
				: gamePlayers.player1;

		console.log("Drawing user:", drawingUserSocketId);
		console.log("Guessing user:", guessingUserSocketId);

		currentWord = selectRandomWord();
		console.log("Word to draw:", currentWord);

		// Emit clear canvas event to all clients at the start of a new game
		io.emit("clear-canvas");

		if (drawingUserSocketId) {
			io.to(drawingUserSocketId).emit("start-drawing-turn");
			io.to(drawingUserSocketId).emit("your-word", currentWord);
		}
		if (guessingUserSocketId) {
			io.to(guessingUserSocketId).emit("start-guessing-turn");
		}

		startDrawingTimer();
	}
}

function startDrawingTimer() {
	timeRemaining = drawingTimeLimit;
	if (drawingTimerInterval) {
		clearInterval(drawingTimerInterval);
	}

	drawingTimerInterval = setInterval(() => {
		timeRemaining--;
		io.emit("timer-update", timeRemaining);

		if (timeRemaining <= 0) {
			clearInterval(drawingTimerInterval);
			drawingTimerInterval = null;
			console.log("Drawing time ended! The word was:", currentWord);
			io.emit("drawing-time-ended");
			endRound();
		}
	}, 1000);
}

function selectRandomWord(): string {
	const randomIndex = Math.floor(Math.random() * words.length);
	return words[randomIndex];
}

function updateLeaderboard(username: string) {
	const player = leaderboard.find((entry) => entry.username === username);
	if (player) {
		player.wins++;
	} else {
		leaderboard.push({ username, wins: 1 });
	}
}

function emitLeaderboard() {
	leaderboard.sort((a, b) => b.wins - a.wins);
	io.emit("leaderboard-update", leaderboard);
}

function endRound() {
	if (gamePlayers.player1 && gamePlayers.player2) {
		// Swap roles
		const tempDrawer = drawingUserSocketId;
		drawingUserSocketId = guessingUserSocketId;
		guessingUserSocketId = tempDrawer;

		console.log("Roles switched!");
		console.log("New Drawing user:", drawingUserSocketId);
		console.log("New Guessing user:", guessingUserSocketId);

		currentWord = selectRandomWord();
		console.log("New word to draw:", currentWord);

		io.emit("clear-canvas"); // Clear the canvas for the new turn

		if (drawingUserSocketId) {
			io.to(drawingUserSocketId).emit("start-drawing-turn");
			io.to(drawingUserSocketId).emit("your-word", currentWord);
		}
		if (guessingUserSocketId) {
			io.to(guessingUserSocketId).emit("start-guessing-turn");
		}

		io.emit("chat-message", {
			username: "System",
			message: "New round started! Roles have switched.",
		});

		startDrawingTimer(); // Start the timer for the new drawing turn
	} else {
		io.emit("chat-message", {
			username: "System",
			message: "Not enough players to start a new round.",
		});
		resetGameState(); // Optionally reset the game state if not enough players
	}
}

function resetGameState() {
	gamePlayers = {};
	drawingUserSocketId = null;
	guessingUserSocketId = null;
	currentWord = null;
	if (drawingTimerInterval) {
		clearInterval(drawingTimerInterval);
		drawingTimerInterval = null;
	}
	timeRemaining = drawingTimeLimit;
}

httpServer.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});

function appendChatMessage(data: { username: string; message: string }) {
	const messageElement = document.createElement("div");
	messageElement.textContent = `${data.username}: ${data.message}`;

	// Highlight system messages for correct guesses
	if (data.username === "System" && data.message.includes("guessed it!")) {
		messageElement.classList.add("correct-guess"); // Add a CSS class for styling
	}

	chatMessages.appendChild(messageElement);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}
