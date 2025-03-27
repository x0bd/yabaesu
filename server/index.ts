import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { GameRoom } from "./GameRoom";

// Debug logging
const DEBUG = true;
function debugLog(message: string, data?: any) {
	if (DEBUG) {
		console.log(`[SERVER DEBUG] ${message}`, data || "");
	}
}

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
const connectedUsers = new Map<string, string>(); // socketId -> username
const userColors = new Map<string, string>(); // username -> color
const waitingPlayers: string[] = []; // socketIds of players waiting for a match
const gameRooms = new Map<string, GameRoom>(); // roomId -> GameRoom

// Color options for users
const colorOptions = [
	"#FF9AA2", // Light red
	"#FFB7B2", // Light coral
	"#FFDAC1", // Light peach
	"#E2F0CB", // Light green
	"#B5EAD7", // Light teal
	"#C7CEEA", // Light blue
	"#F8C8DC", // Light pink
	"#D0D1FF", // Light lavender
	"#DABFDE", // Light purple
	"#89CFF0", // Baby blue
	"#FBCCE7", // Cotton candy
	"#F8B195", // Light orange
];

// --- Word List ---
const words = [
	"fish",
	"bread",
	"sun",
	"key",
	"book",
	"cat",
	"flower",
	"moon",
	"cup",
	"tree",
];

// Serve static files
const frontendBuildPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(frontendBuildPath));

io.on("connection", (socket) => {
	console.log("A user connected:", socket.id);
	debugLog("User connected", socket.id);

	socket.on("user-joined", (username) => {
		debugLog(`User ${username} joined with ID: ${socket.id}`);

		// Store user info
		connectedUsers.set(socket.id, username);
		assignUserColor(username);

		// Add to waiting players
		waitingPlayers.push(socket.id);
		debugLog(
			"Waiting players updated",
			waitingPlayers.map((id) => connectedUsers.get(id))
		);

		// Emit updated waiting players count to all clients
		emitWaitingPlayersCount();

		// Try to create a game if there are at least 2 waiting players
		tryCreateGame();
	});

	socket.on("disconnect", () => {
		const username = connectedUsers.get(socket.id);
		if (username) {
			debugLog(`User ${username} disconnected: ${socket.id}`);

			// Remove from waiting players if present
			const waitingIndex = waitingPlayers.indexOf(socket.id);
			if (waitingIndex !== -1) {
				waitingPlayers.splice(waitingIndex, 1);
				debugLog(
					"Removed from waiting players",
					waitingPlayers.map((id) => connectedUsers.get(id))
				);
				emitWaitingPlayersCount();
			}

			// Check if player is in a game room
			for (const [roomId, room] of gameRooms.entries()) {
				if (room.player1 === socket.id || room.player2 === socket.id) {
					debugLog(`Player was in room ${roomId}`, {
						room: roomId,
						player1: room.player1,
						player2: room.player2,
					});
					room.handlePlayerDisconnect(socket.id);
					gameRooms.delete(roomId);
					break;
				}
			}

			// Remove user from connected users
			connectedUsers.delete(socket.id);
		}
	});

	socket.on("drawing", (data) => {
		debugLog("Drawing received", { socketId: socket.id, data });

		// Find the room this player is in
		for (const room of gameRooms.values()) {
			if (socket.id === room.drawingUserId) {
				room.handleDrawing(data);
				break;
			}
		}
	});

	socket.on("chat-message", (data) => {
		debugLog("Chat message received", data);

		// Find the room this player is in
		for (const room of gameRooms.values()) {
			if (room.player1 === socket.id || room.player2 === socket.id) {
				room.handleChatMessage(data.username, data.message);
				break;
			}
		}
	});

	socket.on("guess", (data) => {
		debugLog("Guess received", data);

		// Find the room this player is in
		for (const room of gameRooms.values()) {
			if (room.player1 === socket.id || room.player2 === socket.id) {
				room.handleGuess(socket.id, data.username, data.guess);
				break;
			}
		}
	});

	socket.on("leave-room", () => {
		const username = connectedUsers.get(socket.id);
		if (username) {
			debugLog(`User ${username} left room`);

			// Check if player is in a game room
			for (const [roomId, room] of gameRooms.entries()) {
				if (room.player1 === socket.id || room.player2 === socket.id) {
					room.handlePlayerDisconnect(socket.id);
					gameRooms.delete(roomId);
					break;
				}
			}

			// Add back to waiting players
			if (!waitingPlayers.includes(socket.id)) {
				waitingPlayers.push(socket.id);
				emitWaitingPlayersCount();
			}
		}
	});
});

function assignUserColor(username: string) {
	if (!userColors.has(username)) {
		const randomIndex = Math.floor(Math.random() * colorOptions.length);
		userColors.set(username, colorOptions[randomIndex]);
	}
}

function getUserColor(username: string): string {
	return userColors.get(username) || "#000000";
}

function emitWaitingPlayersCount() {
	// Send both connected users and waiting players count
	const connectedUsersList = Array.from(connectedUsers.values());
	const waitingPlayersList = waitingPlayers
		.map((id) => connectedUsers.get(id))
		.filter(Boolean);

	// Send more detailed information about players status
	io.emit("connected-users", connectedUsersList);

	debugLog("Emitted waiting players count", {
		totalConnected: connectedUsersList.length,
		waitingCount: waitingPlayersList.length,
		waitingPlayers: waitingPlayersList,
	});
}

function tryCreateGame() {
	if (waitingPlayers.length >= 2) {
		// Take the first two waiting players
		const player1 = waitingPlayers.shift() as string;
		const player2 = waitingPlayers.shift() as string;

		// Create a new game room
		const roomId = uuidv4();
		const gameRoom = new GameRoom(
			roomId,
			player1,
			player2,
			io,
			connectedUsers,
			userColors,
			words
		);
		gameRooms.set(roomId, gameRoom);

		debugLog("Created new game room", {
			roomId,
			player1,
			player1Name: connectedUsers.get(player1),
			player2,
			player2Name: connectedUsers.get(player2),
		});

		// Start the game
		gameRoom.startGame();

		// Update waiting players count
		emitWaitingPlayersCount();
	}
}

httpServer.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
