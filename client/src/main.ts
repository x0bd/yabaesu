import "./style.css";
import { gsap } from "gsap";
import { gameStore, subscribe } from "./store";
import io from "socket.io-client";

// Debug logging
const DEBUG = true;
function debugLog(message: string, data?: any) {
	if (DEBUG) {
		console.log(`[CLIENT DEBUG] ${message}`, data || "");
	}
}

// Get DOM elements
const loginContainer = document.getElementById(
	"login-container"
) as HTMLDivElement;
const gameContainer = document.getElementById(
	"game-container"
) as HTMLDivElement;
const matchmakingContainer = document.getElementById(
	"matchmaking-container"
) as HTMLDivElement;
const usernameInput = document.getElementById("username") as HTMLInputElement;
const loginButton = document.getElementById(
	"login-button"
) as HTMLButtonElement;
const loginError = document.getElementById(
	"login-error"
) as HTMLParagraphElement;
const waitingPlayersCount = document.getElementById(
	"waiting-players-count"
) as HTMLSpanElement;
const leaveQueueButton = document.getElementById(
	"leave-queue-button"
) as HTMLButtonElement;

const canvas = document.getElementById("drawing-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
const chatInput = document.getElementById("chat-input") as HTMLInputElement;
const sendChatButton = document.getElementById(
	"send-chat-button"
) as HTMLButtonElement;
const chatMessages = document.getElementById("chat-messages") as HTMLDivElement;
const guessInput = document.getElementById("guess-input") as HTMLInputElement;
const submitGuessButton = document.getElementById(
	"submit-guess-button"
) as HTMLButtonElement;
const timerDisplay = document.getElementById("timer") as HTMLDivElement;
const leaderboardList = document.getElementById(
	"leaderboard-list"
) as HTMLUListElement;
const notification = document.getElementById("notification") as HTMLDivElement;
const wordDisplay = document.getElementById("word-display") as HTMLDivElement;
const wordText = document.getElementById("word-text") as HTMLSpanElement;
const gameStatus = document.getElementById("game-status") as HTMLDivElement;
const statusTitle = document.getElementById(
	"status-title"
) as HTMLHeadingElement;
const statusMessage = document.getElementById(
	"status-message"
) as HTMLParagraphElement;
const statusButton = document.getElementById(
	"status-button"
) as HTMLButtonElement;
const turnIndicator = document.getElementById(
	"turn-indicator"
) as HTMLDivElement;

// Update the wordDisplayLabel to "YOUR PREVIOUS WORD: "
const wordDisplayLabel = document.querySelector(".word-display") as HTMLElement;
if (wordDisplayLabel) {
	wordDisplayLabel.innerHTML =
		'YOUR PREVIOUS WORD: <span id="word-text"></span>';
}

// Drawing variables
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Initialize socket connection
const socket = io("http://localhost:4000");
debugLog("Socket connection initialized");

// Subscribe to matchmaking state
subscribe(
	(state) => ({
		isInQueue: state.isInQueue,
		waitingPlayersCount: state.waitingPlayersCount,
		roomId: state.roomId,
		roomPlayers: state.roomPlayers,
	}),
	(state) => {
		debugLog("Matchmaking state updated", state);
		updateMatchmakingUI(state);
	}
);

// Subscribe to game state
subscribe(
	(state) => ({
		isLoggedIn: state.isLoggedIn,
		isDrawingEnabled: state.isDrawingEnabled,
		currentWord: state.currentWord,
		isMyTurn: state.isMyTurn,
		turnType: state.turnType,
		timeRemaining: state.timeRemaining,
	}),
	(state) => {
		debugLog("Game state updated", state);
		updateGameUI(state);
	}
);

// Socket event handlers
socket.on("connected-users", (users: string[]) => {
	debugLog("Connected users received", users);
	const waitingCount = users.length;
	gameStore.setState({ waitingPlayersCount: waitingCount });

	// Update UI directly to ensure it's visible
	if (waitingPlayersCount) {
		waitingPlayersCount.textContent = waitingCount.toString();
	}

	// Update queue status message based on count
	const queueStatus = document.getElementById("queue-status");
	if (queueStatus) {
		if (waitingCount <= 1) {
			queueStatus.textContent = "Waiting for more players...";
		} else if (waitingCount === 2) {
			queueStatus.textContent = "Found a player! Matching...";
		} else {
			queueStatus.textContent = `${waitingCount} players in queue`;
		}
	}
});

socket.on("start-drawing-turn", () => {
	debugLog("Received start-drawing-turn event");
	gameStore.setState({
		isInQueue: false,
		isDrawingEnabled: true,
		isMyTurn: true,
		turnType: "draw",
	});
	showGameScreen();
});

socket.on("start-guessing-turn", () => {
	debugLog("Received start-guessing-turn event");
	gameStore.setState({
		isInQueue: false,
		isDrawingEnabled: false,
		isMyTurn: true,
		turnType: "guess",
		currentWord: null,
	});
	showGameScreen();
});

socket.on("your-word", (word: string) => {
	debugLog("Received your-word event", word);
	gameStore.setState({ currentWord: word });

	// Add system chat message informing the drawer of their word
	const systemMessage = {
		username: "System",
		message: `You are drawing: ${word}`,
		color: "#ef4444", // Red color for emphasis
	};

	// Add to chat messages array
	const messages = gameStore.getState().chatMessages;
	gameStore.setState({
		chatMessages: [...messages, systemMessage],
	});

	// Directly append to chat UI for immediate display
	appendChatMessage(systemMessage);

	// Show a persistent notification for the drawer (20 seconds)
	displayNotification(`Your word to draw: ${word}`, "green", 20);

	// Show the word toast
	showWordToast(word);
});

socket.on("timer-update", (time: number) => {
	debugLog("Received timer-update event", time);
	gameStore.setState({ timeRemaining: time });
});

socket.on("drawing-time-ended", () => {
	debugLog("Received drawing-time-ended event");
	gameStore.setState({
		isMyTurn: false,
		turnType: null,
		isDrawingEnabled: false,
		currentWord: null,
	});

	// Explicitly hide the word display when drawing time ends
	if (wordDisplay) {
		wordDisplay.style.display = "none";
		wordDisplay.classList.remove("active");
	}
});

socket.on("clear-canvas", () => {
	debugLog("Received clear-canvas event");
	clearCanvas();
	resetUIVisibility();

	// Ensure word display is hidden when canvas is cleared
	wordDisplay.style.display = "none";
});

socket.on("chat-message", (data) => {
	debugLog("Received chat-message event", data);

	// Add to chat messages array
	const messages = gameStore.getState().chatMessages;
	gameStore.setState({
		chatMessages: [...messages, data],
	});

	// Directly append to chat UI to ensure immediate display
	appendChatMessage(data);

	// Show notification for certain messages
	if (data.username === "System") {
		gameStore.getState().showNotification(data.message, data.color);
	}
});

socket.on("draw", (data) => {
	debugLog("Received draw event", data);
	if (ctx) {
		ctx.beginPath();
		ctx.moveTo(data.x1, data.y1);
		ctx.lineTo(data.x2, data.y2);
		ctx.stroke();
		ctx.closePath();
	}
});

// Subscribe to state changes
subscribe(
	(state) => state.chatMessages,
	(messages, prevMessages) => {
		if (messages.length > prevMessages.length) {
			const latestMessage = messages[messages.length - 1];
			appendChatMessage(latestMessage);
		}
	}
);

subscribe(
	(state) => state.notifications,
	(notifications, prevNotifications) => {
		if (notifications.length > prevNotifications.length) {
			const latest = notifications[notifications.length - 1];
			displayNotification(latest.message, latest.color);
		}
	}
);

// Updated to handle the current word
subscribe(
	(state) => state.currentWord,
	(word) => {
		if (word) {
			wordText.textContent = word;
			wordDisplay.classList.add("active");

			gsap.fromTo(
				wordDisplay,
				{ y: -50, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.5, ease: "back.out" }
			);

			gsap.to(wordText, {
				scale: 1.1,
				color: "#ff0000",
				duration: 0.3,
				repeat: 1,
				yoyo: true,
			});
		}
	}
);

// New subscription for previous word
subscribe(
	(state) => state.previousWord,
	(word) => {
		if (word) {
			wordText.textContent = word;
			wordDisplay.classList.add("active");

			gsap.fromTo(
				wordDisplay,
				{ y: -50, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.5, ease: "back.out" }
			);
		} else {
			wordDisplay.classList.remove("active");
		}
	}
);

// Define the leaderboard entry type
interface LeaderboardEntry {
	username: string;
	wins: number;
}

// Update the leaderboard handler with proper types
socket.on("leaderboard-update", (leaderboardData: LeaderboardEntry[]) => {
	debugLog("Received leaderboard update", leaderboardData);

	// Update the store
	gameStore.setState({ leaderboard: leaderboardData });

	// Clear existing leaderboard items
	if (leaderboardList) {
		leaderboardList.innerHTML = "";
		leaderboardList.style.opacity = "1"; // Ensure visibility

		// Create leaderboard items
		leaderboardData.forEach((entry: LeaderboardEntry) => {
			const li = document.createElement("li");
			li.className =
				"border-b border-gray-200 py-2 flex justify-between items-center";

			const username = document.createElement("span");
			username.textContent = entry.username;
			username.style.fontWeight = "bold";

			const wins = document.createElement("span");
			wins.textContent = `${entry.wins} wins`;
			wins.className = "text-green-600 font-bold";

			li.appendChild(username);
			li.appendChild(wins);
			leaderboardList.appendChild(li);
		});
	}
});

// Subscribe to the socket to handle drawing events from other players
subscribe(
	(state) => state.socket,
	(socket) => {
		if (socket) {
			socket.on(
				"draw",
				(data: { x1: number; y1: number; x2: number; y2: number }) => {
					if (ctx) {
						ctx.beginPath();
						ctx.moveTo(data.x1, data.y1);
						ctx.lineTo(data.x2, data.y2);
						ctx.stroke();
						ctx.closePath();
					}
				}
			);
		}
	}
);

// Add a game-state-update event handler for synchronization
socket.on(
	"game-state-update",
	(data: {
		drawingUser: string | undefined;
		guessingUser: string | undefined;
		currentWord: string | null;
		isDrawingTurn: boolean;
	}) => {
		debugLog("Received game-state-update event", data);
		const { username } = gameStore.getState();

		// Clear the canvas when game state updates
		clearCanvas();

		// Reset UI visibility
		resetUIVisibility();

		if (username === data.drawingUser) {
			debugLog("Current user is the drawer");
			gameStore.setState({
				isInQueue: false,
				isDrawingEnabled: true,
				isMyTurn: true,
				turnType: "draw",
				currentWord: data.currentWord,
			});
			showGameScreen();

			// Show word to draw more prominently with extended notification (20 seconds)
			if (data.currentWord) {
				// Add emphasized system chat message
				const drawSystemMessage = {
					username: "System",
					message: `You are drawing: ${data.currentWord}`,
					color: "#ef4444", // Red color for emphasis
				};

				// Add to chat messages array
				const messages = gameStore.getState().chatMessages;
				gameStore.setState({
					chatMessages: [...messages, drawSystemMessage],
				});

				// Directly append to chat UI for immediate display
				appendChatMessage(drawSystemMessage);

				// Show persistent notification
				displayNotification(
					`Your word to draw: ${data.currentWord}`,
					"green",
					20
				);

				// Also create a pulsing effect on the word display element
				wordDisplay.style.display = "block";
				wordText.textContent = data.currentWord;
				wordDisplay.classList.add("active");

				// Add pulsing animation to make it more noticeable
				gsap.timeline({ repeat: 3 })
					.to(wordDisplay, {
						scale: 1.05,
						boxShadow: "0 0 12px rgba(0, 0, 0, 0.3)",
						duration: 0.5,
					})
					.to(wordDisplay, {
						scale: 1,
						boxShadow: "4px 4px 0 #000",
						duration: 0.5,
					});

				// Show the word toast
				showWordToast(data.currentWord);
			}
		} else if (username === data.guessingUser) {
			debugLog("Current user is the guesser");
			gameStore.setState({
				isInQueue: false,
				isDrawingEnabled: false,
				isMyTurn: true,
				turnType: "guess",
				currentWord: null,
			});
			showGameScreen();

			// Tell the guesser who's drawing with 5-second notification
			displayNotification(
				`${data.drawingUser} is drawing now. Try to guess the word!`,
				"blue",
				5
			);
		}

		// Update turn indicator visibility
		if (turnIndicator) {
			turnIndicator.classList.remove("hidden");
		}
	}
);

// UI update functions
function updateMatchmakingUI(state: {
	isInQueue: boolean;
	waitingPlayersCount: number;
	roomId: string | null;
	roomPlayers: string[];
}) {
	if (state.isInQueue) {
		// Direct DOM update for reliability
		if (waitingPlayersCount) {
			waitingPlayersCount.textContent =
				state.waitingPlayersCount.toString();

			// Update the queue status text
			const queueStatus = document.getElementById("queue-status");
			if (queueStatus) {
				if (state.waitingPlayersCount <= 1) {
					queueStatus.textContent = "Waiting for more players...";
				} else if (state.waitingPlayersCount === 2) {
					queueStatus.textContent = "Found a player! Matching...";
				} else {
					queueStatus.textContent = `${state.waitingPlayersCount} players in queue`;
				}
			}
		}
	}
}

function updateGameUI(state: {
	isLoggedIn: boolean;
	isDrawingEnabled: boolean;
	currentWord: string | null;
	isMyTurn: boolean;
	turnType: "draw" | "guess" | null;
	timeRemaining: number;
}) {
	if (state.isLoggedIn) {
		loginContainer.style.display = "none";

		// Only show the game container if we're in a game
		if (state.turnType) {
			gameContainer.style.display = "flex";
			matchmakingContainer.style.display = "none";
		}
	}

	// Make the turnIndicator visible and ensure it has the right style
	turnIndicator.classList.remove("hidden");
	turnIndicator.style.display = "block";
	turnIndicator.style.position = "absolute";
	turnIndicator.style.zIndex = "100";

	// Update turn indicator
	if (state.turnType === "draw") {
		turnIndicator.textContent = "YOUR TURN TO DRAW";
		turnIndicator.style.backgroundColor = "#fde047"; // Yellow
		debugLog("Updated UI for drawing turn");

		// Make sure drawing is enabled
		canvas.style.cursor = "crosshair";
		canvas.style.pointerEvents = "auto";
	} else if (state.turnType === "guess") {
		turnIndicator.textContent = "YOUR TURN TO GUESS";
		turnIndicator.style.backgroundColor = "#93c5fd"; // Blue
		debugLog("Updated UI for guessing turn");

		// Make sure drawing is disabled
		canvas.style.cursor = "default";
		canvas.style.pointerEvents = "none";

		// Ensure word display is hidden for guessers
		wordDisplay.style.display = "none";
	} else {
		turnIndicator.textContent = "WAITING FOR PLAYERS";
		turnIndicator.style.backgroundColor = "#e5e7eb"; // Gray
		debugLog("Updated UI for waiting state");

		// Ensure word display is hidden when waiting
		wordDisplay.style.display = "none";
	}

	// Only show the word display if currently drawing
	if (state.currentWord && state.turnType === "draw" && state.isMyTurn) {
		wordDisplay.style.display = "block";
		wordDisplay.style.position = "absolute";
		wordDisplay.style.zIndex = "100";
		wordText.textContent = state.currentWord;
		debugLog("Displayed word for drawing turn", state.currentWord);
	} else {
		wordDisplay.style.display = "none";
		debugLog("Hiding word display");
	}

	// Update timer
	timerDisplay.textContent = `TIME: ${state.timeRemaining}`;
	timerDisplay.style.zIndex = "50";
	debugLog("Updated timer display", state.timeRemaining);

	// Ensure chat container is visible
	const chatContainer = document.getElementById("chat-container");
	if (chatContainer) {
		chatContainer.style.zIndex = "50";
		chatContainer.style.position = "relative";
	}

	// Ensure canvas has the right style
	canvas.style.zIndex = "10";
}

function showMatchmakingScreen() {
	gameContainer.style.display = "none";
	loginContainer.style.display = "none";
	matchmakingContainer.style.display = "flex";
	matchmakingContainer.style.zIndex = "10";

	// Make sure all game elements are hidden
	turnIndicator.style.display = "none";
	wordDisplay.style.display = "none";

	// Enhanced animation for the matchmaking container
	gsap.timeline()
		.from(matchmakingContainer, {
			opacity: 0,
			y: 30,
			scale: 0.97,
			duration: 0.5,
			ease: "back.out(1.4)",
		})
		.from("#queue-status", {
			opacity: 0,
			y: 10,
			duration: 0.3,
			delay: 0.1,
		})
		.from(
			".matchmaking-animation",
			{
				opacity: 0,
				scale: 0.8,
				duration: 0.5,
				ease: "elastic.out(1, 0.5)",
			},
			"-=0.2"
		)
		.from(
			"#leave-queue-button",
			{
				opacity: 0,
				y: 10,
				duration: 0.3,
			},
			"-=0.3"
		);
}

function showGameScreen() {
	matchmakingContainer.style.display = "none";
	gameContainer.style.display = "flex";
	gameContainer.style.opacity = "1";
	gameContainer.style.zIndex = "10";

	// Reset UI visibility to ensure all elements are visible
	resetUIVisibility();

	// Make sure turnIndicator is visible
	if (turnIndicator) {
		turnIndicator.classList.remove("hidden");
		turnIndicator.style.display = "block";
	}

	// Ensure word display has the right visibility based on current state
	const state = gameStore.getState();
	if (state.currentWord && state.turnType === "draw" && state.isMyTurn) {
		wordDisplay.style.display = "block";
		wordDisplay.style.opacity = "1";
	} else {
		wordDisplay.style.display = "none";
	}

	// Animate the game container
	gsap.from(gameContainer, {
		opacity: 0,
		y: 20,
		duration: 0.5,
		ease: "power2.out",
		onComplete: resetUIVisibility, // Call resetUIVisibility after animation completes
	});
}

function showLoginScreen() {
	matchmakingContainer.style.display = "none";
	gameContainer.style.display = "none";
	loginContainer.style.display = "flex";
	loginContainer.style.zIndex = "10";

	// Make sure all game elements are hidden
	turnIndicator.style.display = "none";
	wordDisplay.style.display = "none";

	// Animate the login container
	gsap.from(loginContainer, {
		opacity: 0,
		y: 20,
		duration: 0.5,
		ease: "power2.out",
	});
}

// Event listeners
loginButton.addEventListener("click", () => {
	const username = usernameInput.value.trim();
	if (username) {
		debugLog("Emitting user-joined event", username);
		socket.emit("user-joined", username);
		gameStore.setState({
			isLoggedIn: true,
			username: username,
			isInQueue: true,
		});
		showMatchmakingScreen();
	} else {
		loginError.textContent = "Please enter a username";
		loginError.classList.remove("hidden");
	}
});

leaveQueueButton.addEventListener("click", () => {
	gameStore.getState().leaveRoom();
	showLoginScreen();
});

if (ctx) {
	ctx.lineWidth = 3;
	ctx.strokeStyle = "black";
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	canvas.addEventListener("mousedown", (e) => {
		if (!gameStore.getState().isDrawingEnabled) return;
		isDrawing = true;
		lastX = e.offsetX;
		lastY = e.offsetY;
	});

	canvas.addEventListener("mousemove", (e) => {
		if (!isDrawing || !gameStore.getState().isDrawingEnabled) return;
		const currentX = e.offsetX;
		const currentY = e.offsetY;
		drawLine(lastX, lastY, currentX, currentY);
		lastX = currentX;
		lastY = currentY;
	});

	canvas.addEventListener("mouseup", () => {
		isDrawing = false;
	});

	canvas.addEventListener("mouseout", () => {
		isDrawing = false;
	});
}

function drawLine(x1: number, y1: number, x2: number, y2: number) {
	if (!ctx) return;

	// Only draw if we're the drawer
	if (!gameStore.getState().isDrawingEnabled) return;

	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.closePath();

	debugLog("Emitting drawing event", { x1, y1, x2, y2 });
	// Send drawing event to server
	socket.emit("drawing", { x1, y1, x2, y2 });
}

function clearCanvas() {
	if (ctx) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
}

sendChatButton.addEventListener("click", () => {
	const message = chatInput.value.trim();
	if (message) {
		debugLog("Sending chat message from button click", message);
		socket.emit("chat-message", {
			username: gameStore.getState().username,
			message: message,
		});
		chatInput.value = "";

		// Small animation feedback for sending message
		gsap.fromTo(
			chatInput,
			{ backgroundColor: "#f0f9ff" },
			{ backgroundColor: "#ffffff", duration: 0.5 }
		);
	}
});

chatInput.addEventListener("keypress", (event) => {
	if (event.key === "Enter") {
		const message = chatInput.value.trim();
		if (message) {
			debugLog("Sending chat message from Enter key", message);
			socket.emit("chat-message", {
				username: gameStore.getState().username,
				message: message,
			});
			chatInput.value = "";

			// Small animation feedback for sending message
			gsap.fromTo(
				chatInput,
				{ backgroundColor: "#f0f9ff" },
				{ backgroundColor: "#ffffff", duration: 0.5 }
			);
		}
	}
});

// Updated chat message display with colors
function appendChatMessage(data: {
	username: string;
	message: string;
	color?: string;
}) {
	const messageElement = document.createElement("div");
	messageElement.className = "chat-message"; // Add a class for styling

	// Create a username span to apply color
	const usernameSpan = document.createElement("span");
	usernameSpan.textContent = `${data.username}:`;
	usernameSpan.style.color = data.color || "#000000";
	usernameSpan.style.fontWeight = "bold";

	// Create a message span
	const messageSpan = document.createElement("span");
	messageSpan.textContent = ` ${data.message}`;
	messageSpan.style.color = "#000000"; // Ensure message text is black

	// Append both spans to the message element
	messageElement.appendChild(usernameSpan);
	messageElement.appendChild(messageSpan);

	messageElement.style.opacity = "0";
	messageElement.style.transform = "translateY(10px)";
	messageElement.style.marginBottom = "8px"; // Add spacing between messages
	messageElement.style.padding = "4px 0"; // Add padding
	messageElement.style.borderBottom = "1px solid rgba(0,0,0,0.1)"; // Add subtle separator

	// Highlight system messages for correct guesses
	if (data.username === "System" && data.message.includes("guessed it!")) {
		messageElement.classList.add("correct-guess", "rainbow-text");

		// Special animation for correct guesses
		messageElement.style.fontWeight = "bold";
	}

	chatMessages.appendChild(messageElement);

	// Animate message appearance
	gsap.to(messageElement, {
		opacity: 1,
		y: 0,
		duration: 0.3,
		ease: "power1.out",
	});

	// Ensure scroll to bottom
	setTimeout(() => {
		chatMessages.scrollTop = chatMessages.scrollHeight;
	}, 10);
}

submitGuessButton.addEventListener("click", () => {
	const guess = guessInput.value.trim();
	if (guess) {
		debugLog("Submitting guess from button click", guess);
		socket.emit("guess", {
			username: gameStore.getState().username,
			guess: guess,
		});
		guessInput.value = "";

		// Animation feedback for submitting guess
		gsap.fromTo(
			guessInput,
			{ backgroundColor: "#f0fdf4" },
			{ backgroundColor: "#ffffff", duration: 0.5 }
		);

		gsap.fromTo(
			submitGuessButton,
			{ scale: 0.95 },
			{ scale: 1, duration: 0.2, ease: "back.out" }
		);
	}
});

guessInput.addEventListener("keypress", (event) => {
	if (event.key === "Enter") {
		const guess = guessInput.value.trim();
		if (guess) {
			debugLog("Submitting guess from Enter key", guess);
			socket.emit("guess", {
				username: gameStore.getState().username,
				guess: guess,
			});
			guessInput.value = "";

			// Animation feedback for submitting guess
			gsap.fromTo(
				guessInput,
				{ backgroundColor: "#f0fdf4" },
				{ backgroundColor: "#ffffff", duration: 0.5 }
			);
		}
	}
});

// Display notification (UI only) - this is separate from the store's notification
function displayNotification(
	message: string,
	color: string = "black",
	duration: number = 3
) {
	notification.textContent = message;
	notification.style.backgroundColor =
		color === "red"
			? "#fee2e2"
			: color === "blue"
			? "#dbeafe"
			: color === "green"
			? "#dcfce7"
			: "white";
	notification.style.borderColor =
		color === "red"
			? "#ef4444"
			: color === "blue"
			? "#3b82f6"
			: color === "green"
			? "#22c55e"
			: "black";
	notification.style.zIndex = "1000";
	notification.style.display = "block";
	notification.style.position = "fixed";

	gsap.timeline()
		.to(notification, {
			opacity: 1,
			y: 10,
			duration: 0.3,
			ease: "power1.out",
		})
		.to(notification, {
			opacity: 0,
			y: -10,
			duration: 0.3,
			delay: duration,
			ease: "power1.in",
		});
}

// Function to show game status modals
function showGameStatus(title: string, message: string, buttonText: string) {
	statusTitle.textContent = title;
	statusMessage.textContent = message;
	statusButton.textContent = buttonText;

	gsap.timeline().to(gameStatus, {
		opacity: 1,
		scale: 1,
		duration: 0.4,
		ease: "back.out",
		pointerEvents: "auto",
	});

	// Add event listener for the button (and remove previous ones)
	const closeModal = () => {
		gsap.to(gameStatus, {
			opacity: 0,
			scale: 0.8,
			duration: 0.3,
			pointerEvents: "none",
		});
		statusButton.removeEventListener("click", closeModal);
	};

	statusButton.addEventListener("click", closeModal);
}

// Initialize game UI
statusButton.addEventListener("click", () => {
	gsap.to(gameStatus, {
		opacity: 0,
		scale: 0.8,
		duration: 0.3,
		pointerEvents: "none",
	});
});

// Animation for the timer
gsap.from(timerDisplay, {
	y: -20,
	opacity: 0,
	duration: 1,
	ease: "elastic.out",
	delay: 0.5,
});

// Add a dedicated function to reset UI element visibility
function resetUIVisibility() {
	// Make sure the game container is fully visible
	gameContainer.style.opacity = "1";
	gameContainer.style.display = "flex";

	// Ensure turn indicator is visible
	turnIndicator.style.display = "block";
	turnIndicator.style.opacity = "1";
	turnIndicator.style.zIndex = "100";

	// Reset canvas opacity
	if (canvas) {
		canvas.style.opacity = "1";
	}

	// Make sure chat container is visible
	const chatContainer = document.getElementById("chat-container");
	if (chatContainer) {
		chatContainer.style.opacity = "1";
		chatContainer.style.zIndex = "50";
	}

	// Make sure notifications are on top
	notification.style.zIndex = "1000";

	// Timer display should be visible
	timerDisplay.style.opacity = "1";
	timerDisplay.style.zIndex = "50";

	// Leaderboard should be visible
	if (leaderboardList) {
		leaderboardList.style.opacity = "1";
		leaderboardList.style.zIndex = "50";
	}

	// Word display visibility should depend on game state
	const { currentWord, turnType, isMyTurn } = gameStore.getState();
	if (currentWord && turnType === "draw" && isMyTurn) {
		wordDisplay.style.display = "block";
		wordDisplay.style.opacity = "1";
		wordDisplay.style.zIndex = "100";
	} else {
		wordDisplay.style.display = "none";
	}

	debugLog("Reset UI element visibility");
}

// Add a function to periodically check and fix UI visibility
function startUIVisibilityChecker() {
	// Run every 5 seconds
	setInterval(() => {
		// Only run if we're in game mode
		const { isLoggedIn, isInQueue } = gameStore.getState();

		if (isLoggedIn && !isInQueue) {
			resetUIVisibility();
			debugLog("Periodic UI visibility check");
		}
	}, 5000);
}

// Call this function when the socket connects
socket.on("connect", () => {
	debugLog("Socket connected");
	startUIVisibilityChecker();
});

// Also call it immediately
startUIVisibilityChecker();

// Add a specialized word toast notification for drawing turn
function showWordToast(word: string) {
	// Create toast element if it doesn't exist yet
	let wordToast = document.getElementById("word-toast");
	if (!wordToast) {
		wordToast = document.createElement("div");
		wordToast.id = "word-toast";
		wordToast.style.position = "fixed";
		wordToast.style.top = "50%";
		wordToast.style.left = "50%";
		wordToast.style.transform = "translate(-50%, -50%) skew(-2deg)";
		wordToast.style.background = "#fef08a";
		wordToast.style.border = "3px solid black";
		wordToast.style.boxShadow = "8px 8px 0 #000";
		wordToast.style.padding = "30px 50px";
		wordToast.style.zIndex = "1001";
		wordToast.style.textAlign = "center";
		wordToast.style.fontSize = "24px";
		wordToast.style.fontWeight = "bold";
		wordToast.style.textTransform = "uppercase";
		wordToast.style.opacity = "0";
		wordToast.style.pointerEvents = "none";
		document.body.appendChild(wordToast);
	}

	// Set content
	wordToast.innerHTML = `
		<div style="margin-bottom: 15px; font-size: 16px;">You are drawing:</div>
		<div style="font-size: 36px; color: #ef4444; letter-spacing: 2px;">${word}</div>
	`;

	// Animate
	gsap.timeline()
		.to(wordToast, {
			opacity: 1,
			scale: 1,
			duration: 0.5,
			ease: "back.out(1.4)",
		})
		.to(wordToast, {
			opacity: 0,
			y: -30,
			scale: 0.8,
			duration: 0.5,
			delay: 4,
			ease: "power2.in",
		});
}
