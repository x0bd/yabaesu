import { createStore } from "zustand/vanilla";
import { Socket, io } from "socket.io-client";

// Define types for our state
interface Player {
	username: string;
	wins: number;
}

// Add userColors to the state
interface GameState {
	// User state
	username: string | null;
	isLoggedIn: boolean;

	// Matchmaking state
	isInQueue: boolean;
	waitingPlayersCount: number;
	roomId: string | null;
	roomPlayers: string[];

	// Game state
	isDrawingEnabled: boolean;
	currentWord: string | null;
	previousWord: string | null;
	isMyTurn: boolean;
	turnType: "draw" | "guess" | null;
	timeRemaining: number;

	// UI state
	notifications: { id: number; message: string; color: string }[];
	chatMessages: { username: string; message: string; color?: string }[];
	leaderboard: Player[];
	userColors: Map<string, string>;

	// Socket connection
	socket: Socket | null;
}

interface GameActions {
	login: (username: string) => void;
	sendChatMessage: (message: string) => void;
	submitGuess: (guess: string) => void;
	sendDrawing: (x1: number, y1: number, x2: number, y2: number) => void;
	clearNotification: (id: number) => void;
	showNotification: (message: string, color?: string) => void;
	getUserColor: (username: string) => string;
	setPreviousWord: (word: string | null) => void;
	leaveRoom: () => void;
}

let notificationId = 0;

// Array of pastel colors for user chat
const userColors = [
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

// Add debug logging
const DEBUG = true;
function debugLog(message: string, data?: any) {
	if (DEBUG) {
		console.log(`[STORE DEBUG] ${message}`, data || "");
	}
}

// Create the vanilla store
export const gameStore = createStore<GameState & GameActions>()((set, get) => ({
	// Initial state
	username: null,
	isLoggedIn: false,
	isInQueue: false,
	waitingPlayersCount: 0,
	roomId: null,
	roomPlayers: [],
	isDrawingEnabled: false,
	currentWord: null,
	previousWord: null,
	isMyTurn: false,
	turnType: null,
	timeRemaining: 100,
	notifications: [],
	chatMessages: [],
	leaderboard: [],
	userColors: new Map(),
	socket: null,

	// Actions
	login: (username) => {
		const socket = io("http://localhost:4000");

		// Set up socket event listeners
		socket.on("connect", () => {
			console.log("Connected to Socket.IO server!");
			socket.emit("user-joined", username);
			get().showNotification("Connected to game server!", "green");
		});

		socket.on("disconnect", () => {
			console.log("Disconnected from Socket.IO server!");
			get().showNotification("Connection lost! Reconnecting...", "red");
		});

		socket.on("connect_error", (err) => {
			console.error("Socket.IO connection error:", err);
			get().showNotification("Connection error! Retrying...", "red");
		});

		socket.on("connected-users", (users: string) => {
			console.log("Connected Users:", users);
			get().showNotification(`${users} connected!`, "blue");
		});

		socket.on("start-drawing-turn", () => {
			set({
				isDrawingEnabled: true,
				isMyTurn: true,
				turnType: "draw",
			});
		});

		socket.on("start-guessing-turn", () => {
			set({
				isDrawingEnabled: false,
				isMyTurn: true,
				turnType: "guess",
				currentWord: null,
			});
		});

		socket.on("timer-update", (time: number) => {
			set({ timeRemaining: time });
		});

		socket.on("your-word", (word: string) => {
			console.log("Received word to draw:", word);
			set({ currentWord: word });
			get().showNotification(`Your word to draw is: ${word}`, "green");
		});

		socket.on(
			"chat-message",
			(data: { username: string; message: string }) => {
				const color = get().getUserColor(data.username);
				set((state) => ({
					chatMessages: [...state.chatMessages, { ...data, color }],
				}));
			}
		);

		socket.on(
			"draw",
			(_data: { x1: number; y1: number; x2: number; y2: number }) => {
				// This will be handled by our drawing handlers
			}
		);

		socket.on(
			"leaderboard-update",
			(leaderboard: Array<{ username: string; wins: number }>) => {
				set({ leaderboard });
			}
		);

		socket.on("drawing-time-ended", () => {
			// Store the current word as previous word before resetting
			const currentWord = get().currentWord;
			if (currentWord) {
				get().setPreviousWord(currentWord);
			}

			set({
				isMyTurn: false,
				turnType: null,
				isDrawingEnabled: false,
				currentWord: null,
			});
			get().showNotification("Time's up!", "red");
		});

		// Update state with user and socket
		set({
			username,
			isLoggedIn: true,
			socket,
		});

		// Assign this user a color
		get().getUserColor(username);
	},

	sendChatMessage: (message: string) => {
		const { socket, username } = get();
		if (socket && username) {
			debugLog("Sending chat message", { username, message });
			socket.emit("chat-message", { username, message });
		}
	},

	submitGuess: (guess: string) => {
		const { socket, username } = get();
		if (socket && username) {
			debugLog("Submitting guess", { username, guess });
			socket.emit("guess", { username, guess });
		}
	},

	sendDrawing: (x1, y1, x2, y2) => {
		const { socket, isDrawingEnabled } = get();
		if (socket && isDrawingEnabled) {
			socket.emit("drawing", { x1, y1, x2, y2 });
		}
	},

	showNotification: (message, color = "black") => {
		const id = notificationId++;
		set((state) => ({
			notifications: [...state.notifications, { id, message, color }],
		}));

		// Auto-remove notification after 3 seconds
		setTimeout(() => {
			get().clearNotification(id);
		}, 3000);
	},

	clearNotification: (id) => {
		set((state) => ({
			notifications: state.notifications.filter(
				(notification) => notification.id !== id
			),
		}));
	},

	getUserColor: (username) => {
		const { userColors: colorMap } = get();

		// For system messages, always return black
		if (username === "System") {
			return "#000000";
		}

		// If this username already has a color, return it
		if (colorMap.has(username)) {
			return colorMap.get(username) as string;
		}

		// Otherwise assign a new color
		const index = colorMap.size % userColors.length;
		const color = userColors[index];

		set((state) => {
			const newColorMap = new Map(state.userColors);
			newColorMap.set(username, color);
			return { userColors: newColorMap };
		});

		return color;
	},

	setPreviousWord: (word) => {
		set({ previousWord: word });

		// After 10 seconds, clear the previous word
		if (word) {
			setTimeout(() => {
				set({ previousWord: null });
			}, 10000);
		}
	},

	leaveRoom: () => {
		const { socket, username } = get();
		if (socket && username) {
			socket.emit("leave-room");
			set({
				roomId: null,
				roomPlayers: [],
				isInQueue: false,
				waitingPlayersCount: 0,
			});
		}
	},
}));

// Simple subscription system for vanilla store
type Selector<T> = (state: GameState & GameActions) => T;
type Listener<T> = (selectedState: T, previousSelectedState: T) => void;

interface Subscription<T> {
	selector: Selector<T>;
	listener: Listener<T>;
	previousSelectedState: T;
}

const subscriptions: Subscription<any>[] = [];

export function subscribe<T>(selector: Selector<T>, listener: Listener<T>) {
	const subscription: Subscription<T> = {
		selector,
		listener,
		previousSelectedState: selector(gameStore.getState()),
	};

	subscriptions.push(subscription);

	// Return unsubscribe function
	return () => {
		const index = subscriptions.indexOf(subscription);
		if (index !== -1) {
			subscriptions.splice(index, 1);
		}
	};
}

// Set up store listener to notify subscribers
gameStore.subscribe((state) => {
	subscriptions.forEach((subscription) => {
		const currentSelectedState = subscription.selector(state);
		if (currentSelectedState !== subscription.previousSelectedState) {
			subscription.listener(
				currentSelectedState,
				subscription.previousSelectedState
			);
			subscription.previousSelectedState = currentSelectedState;
		}
	});
});
