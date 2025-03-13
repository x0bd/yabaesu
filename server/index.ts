// backend/index.ts

// backend/index.ts

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
const drawingTimeLimit = 10; // seconds
let timeRemaining: number = drawingTimeLimit;
const leaderboard: Array<{ username: string; wins: number }> = [];
// --- End Game State ---

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
		io.emit("chat-message", {
			username: "System",
			message: `${data.username} guessed: ${data.guess}`,
		});
		// We'll add guess checking logic later
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

		if (drawingUserSocketId) {
			io.to(drawingUserSocketId).emit("start-drawing-turn");
		}
		if (guessingUserSocketId) {
			io.to(guessingUserSocketId).emit("start-guessing-turn");
		}

		// Start the drawing timer
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
		io.emit("timer-update", timeRemaining); // Send timer update to all clients

		if (timeRemaining <= 0) {
			clearInterval(drawingTimerInterval);
			drawingTimerInterval = null;
			console.log("Drawing time ended!");
			io.emit("drawing-time-ended"); // Notify clients the time is up
			// Here we would typically switch turns and potentially reveal the word
			// We'll implement turn switching logic in the next step
		}
	}, 1000);
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
