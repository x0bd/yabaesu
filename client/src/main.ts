import "./style.css";
import { gsap } from "gsap";
import { gameStore, subscribe } from "./store";
import io from "socket.io-client";
import { createSplashScreen } from "./splash";
import { createLoadingAnimation } from "./animations"; // Import the animation utility

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
const playSoloButton = document.getElementById(
	"play-solo-button"
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
/*
const statusTitle = document.getElementById(
	"status-title"
) as HTMLHeadingElement;
const statusMessage = document.getElementById(
	"status-message"
) as HTMLParagraphElement;
*/
const statusButton = document.getElementById(
	"status-button"
) as HTMLButtonElement;
const turnIndicator = document.getElementById(
	"turn-indicator"
) as HTMLDivElement;

// We're removing the previous word display
const wordDisplayLabel = document.querySelector(".word-display") as HTMLElement;
if (wordDisplayLabel) {
	wordDisplayLabel.innerHTML = '<span id="word-text"></span>';
}

// Drawing variables
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Initialize socket connection
const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:4000"; // Use env var, fallback to localhost
const socket = io(serverUrl);
debugLog(`Socket connection initialized to ${serverUrl}`);

// Global variable to hold the matchmaking animation tween
let matchmakingLoadingTween: gsap.core.Tween | null = null;

// Common words to use in solo mode
const soloModeWords = [
	// Animals
	"cat", "dog", "bird", "fish", "snake", "bear", "lion", "tiger", "elephant", "monkey",
	"horse", "cow", "pig", "sheep", "duck", "chicken", "frog", "owl", "bee", "ant", "spider",
	"butterfly", "snail", "crab", "whale", "shark", "octopus", "giraffe", "zebra", "penguin",

	// Food
	"apple", "banana", "orange", "grape", "strawberry", "pizza", "burger", "cake", "ice cream",
	"cookie", "bread", "cheese", "egg", "corn", "carrot", "broccoli", "sushi", "donut", "hot dog",

	// Objects
	"house", "car", "tree", "sun", "moon", "star", "book", "phone", "chair", "table", "door",
	"window", "computer", "cup", "key", "clock", "watch", "shoe", "hat", "glasses", "camera",
	"pencil", "pen", "ball", "balloon", "boat", "train", "airplane", "bicycle", "robot", "alien",
	"box", "drum", "guitar", "lamp", "sock", "shirt", "pants", "bed", "kite", "ladder", "shovel",
	"hammer", "nail", "screw", "button", "zipper", "coin", "flag", "map", "present", "candle",

	// Nature
	"flower", "cloud", "rain", "snow", "rainbow", "leaf", "rock", "fire", "mountain", "river",

	// Simple Shapes/Concepts (can be components of other drawings)
	"circle", "square", "triangle", "heart", "arrow", "line", "dot"
];

// Function to get a random word for solo mode
function getRandomWord(): string {
	const randomIndex = Math.floor(Math.random() * soloModeWords.length);
	return soloModeWords[randomIndex];
}

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

socket.on("waiting-players-count", (count: number) => {
	debugLog("Received waiting-players-count event", count);
	gameStore.setState({ waitingPlayersCount: count });
});

socket.on("start-drawing-turn", () => {
	debugLog("Received start-drawing-turn event");
	gameStore.setState({
		isInQueue: false,
		isDrawingEnabled: true,
		isMyTurn: true,
		turnType: "draw",
		isSoloMode: false // Ensure we're not in solo mode
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
		isSoloMode: false // Ensure we're not in solo mode
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
		wordDisplay.style.cssText = "display: none !important"; // Force hidden
		wordDisplay.classList.remove("active");
	}
});

socket.on("clear-canvas", () => {
	debugLog("Received clear-canvas event");
	clearCanvas();
	resetUIVisibility();

	// Ensure word display is hidden when canvas is cleared
	if (wordDisplay) {
		wordDisplay.style.cssText = "display: none !important"; // Keep it hidden
	}
	
	// Make sure canvas background stays white
	if (ctx) {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
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
	(currentWordValue) => {
		// Only manipulate the word display elements if they exist
		if (!wordDisplay || !wordText) return;
		
		const { isMyTurn, turnType } = gameStore.getState(); // Get other relevant state parts

		if (currentWordValue && isMyTurn && turnType === "draw") {
			wordText.textContent = currentWordValue;
			wordDisplay.style.cssText = "display: block !important"; // Ensure it's display: block
			wordDisplay.classList.add("active"); // This moves it down with top: 10px

			// Animation for appearing
			gsap.fromTo(
				wordDisplay,
				{ y: -50, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.5, ease: "back.out" }
			);

			// Animation for the text itself
			gsap.to(wordText, {
				scale: 1.1,
				color: "#ff0000",
				duration: 0.3,
				repeat: 1,
				yoyo: true,
			});
		} else {
			// If the conditions are not met, hide it.
			wordDisplay.style.cssText = "display: none !important";
			wordDisplay.classList.remove("active");
		}
	}
);

// We're removing the previous word subscription since we don't need it anymore

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

				// Also create a pulsing effect on the word display element if it exists
				if (wordDisplay && wordText) {
					wordDisplay.style.cssText = "display: block !important"; // Override the !important CSS
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
				}

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

// Acknowledgement for solo mode
socket.on("solo-mode-started", () => {
	debugLog("Received solo-mode-started acknowledgement");
	// No action needed here as we've already set up the UI,
	// but this confirms the server has updated its state
});

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
	debugLog("Updating game UI", state);
	
	// Update turn indicator
	const turnIndicator = document.getElementById("turn-indicator");
	if (turnIndicator) {
		turnIndicator.style.display = "block";
		
		// Add quit solo mode button if in solo mode
		const isSoloMode = gameStore.getState().isSoloMode;
		if (isSoloMode) {
			// Check if the button already exists
			let quitSoloButton = document.getElementById("quit-solo-button");
			if (!quitSoloButton) {
				quitSoloButton = document.createElement("button");
				quitSoloButton.id = "quit-solo-button";
				quitSoloButton.className = "bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-none focus:outline-none mt-2 ml-4 uppercase transform-skew hover-scale";
				quitSoloButton.style.boxShadow = "4px 4px 0 #000";
				quitSoloButton.textContent = "Quit Solo Mode";
				
				// Add click event
				quitSoloButton.addEventListener("click", () => {
					// Clean up timer
					if (soloModeTimerInterval) {
						clearInterval(soloModeTimerInterval);
						soloModeTimerInterval = null;
					}
					
					// Reset state
					gameStore.setState({
						isInQueue: true,
						roomId: null,
						roomPlayers: [],
						isSoloMode: false,
						isDrawingEnabled: false,
						isMyTurn: false,
						turnType: null,
						currentWord: null,
						previousWord: null
					});
					
					// Notify server (to get back in queue)
					socket.emit("user-joined", gameStore.getState().username);
					
					// Show matchmaking screen
					showMatchmakingScreen();
				});
				
				// Find appropriate place to add it
				const headerContainer = document.querySelector(".flex.justify-between.items-center");
				if (headerContainer) {
					headerContainer.appendChild(quitSoloButton);
				}
			}
		} else {
			// Remove quit solo button if it exists but not in solo mode
			const quitSoloButton = document.getElementById("quit-solo-button");
			if (quitSoloButton) {
				quitSoloButton.remove();
			}
		}
		
		if (state.isMyTurn) {
			if (state.turnType === "draw") {
				turnIndicator.textContent = "YOUR TURN TO DRAW";
				turnIndicator.className = "turn-indicator bg-blue-600 text-white px-4 py-1";
				
				// Make sure drawing is enabled
				canvas.style.cursor = "crosshair";
				canvas.style.pointerEvents = "auto";
				
				// Add the finish drawing button in solo mode
				const isSoloMode = gameStore.getState().isSoloMode;
				if (isSoloMode) {
					// Check if the button already exists
					let finishButton = document.getElementById("finish-drawing-button");
					if (!finishButton) {
						finishButton = document.createElement("button");
						finishButton.id = "finish-drawing-button";
						finishButton.className = "bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-none focus:outline-none mt-2 ml-4 uppercase transform-skew hover-scale";
						finishButton.style.boxShadow = "4px 4px 0 #000";
						finishButton.textContent = "Finish Drawing";
						
						// Add click event
						finishButton.addEventListener("click", () => {
							// Switch from drawing to guessing
							gameStore.setState({
								isDrawingEnabled: false,
								turnType: "guess"
							});
							
							// Update UI
							updateGameUI({
								...state,
								isDrawingEnabled: false,
								turnType: "guess"
							});
							
							// Add system message
							appendChatMessage({
								username: "SYSTEM",
								message: "You finished drawing! Now try to guess your own drawing in the chat.",
								color: "#6d28d9"
							});
							
							// Remove the button
							if (finishButton) {
								finishButton.remove();
							}
						});
						
						// Append near the turn indicator
						if (turnIndicator.parentNode) {
							turnIndicator.parentNode.appendChild(finishButton);
						}
					}
				}
			} else if (state.turnType === "guess") {
				turnIndicator.textContent = "YOUR TURN TO GUESS";
				turnIndicator.className = "turn-indicator bg-green-600 text-white px-4 py-1";
				
				// Make sure drawing is disabled
				canvas.style.cursor = "default";
				canvas.style.pointerEvents = "none";
				
				// Ensure word display is hidden for guessers
				if (wordDisplay) {
					wordDisplay.style.cssText = "display: none !important"; // Keep it hidden
				}
				
				// Remove finish drawing button if it exists
				const finishButton = document.getElementById("finish-drawing-button");
				if (finishButton) {
					finishButton.remove();
				}
			}
		} else {
			turnIndicator.textContent = "WAITING FOR OPPONENT";
			turnIndicator.className = "turn-indicator bg-yellow-500 text-white px-4 py-1";
			
			// Ensure word display is hidden when waiting
			if (wordDisplay) {
				wordDisplay.style.cssText = "display: none !important"; // Keep it hidden
			}
		}
	}
	
	// Update word display - only if element exists
	if (wordDisplay && wordText) {
		if (state.currentWord && state.turnType === "draw" && state.isMyTurn) {
			wordText.textContent = state.currentWord;
			wordDisplay.style.cssText = "display: block !important"; // Override the !important CSS
			wordDisplay.classList.add("active");
		} else {
			wordDisplay.style.cssText = "display: none !important"; // Keep it hidden
			wordDisplay.classList.remove("active");
		}
	}
	
	// Update timer
	timerDisplay.textContent = `TIME: ${state.timeRemaining}`;
	
	// Add urgency to timer when low
	if (state.timeRemaining <= 10) {
		timerDisplay.classList.add("timer-urgent");
	} else {
		timerDisplay.classList.remove("timer-urgent");
	}
}

function showMatchmakingScreen() {
	loginContainer.style.display = "none";
	gameContainer.style.display = "none";
	matchmakingContainer.style.display = "flex";
	
	// Start the loading animation
	const loadingIndicatorElement = document.getElementById("matchmaking-loading-indicator");
	if (loadingIndicatorElement) {
		// Kill previous animation if it exists
		if (matchmakingLoadingTween) {
			matchmakingLoadingTween.kill();
		}
		matchmakingLoadingTween = createLoadingAnimation(loadingIndicatorElement);
	}

	// Show screen with animation
	gsap.fromTo(
		"#matchmaking-container",
		{ opacity: 0, scale: 0.95 },
		{ opacity: 1, scale: 1, duration: 0.3, ease: "power1.out" }
	);
}

function showGameScreen() {
	loginContainer.style.display = "none";
	matchmakingContainer.style.display = "none";
	gameContainer.style.display = "flex";
	
	// Adjust layout for mobile if needed
	if (isMobileDevice()) {
		gameContainer.style.flexDirection = "column";
		const canvasContainer = document.querySelector(".canvas-container");
		if (canvasContainer) {
			canvasContainer.classList.add("w-full");
		}
	}
	
	// Reset canvas with proper white background
	clearCanvas();
	
	// Double check canvas styling
	canvas.style.backgroundColor = "#ffffff";
	
	// Ensure UI elements are visible
	resetUIVisibility();
	
	// Show game UI elements with animation
	gsap.fromTo(
		"#game-container",
		{ opacity: 0, y: 20 },
		{ opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
	);

	// Stop matchmaking animation if it's running
	if (matchmakingLoadingTween) {
		matchmakingLoadingTween.kill();
		matchmakingLoadingTween = null;
	}
}

function showLoginScreen() {
	gameContainer.style.display = "none";
	matchmakingContainer.style.display = "none";
	loginContainer.style.display = "block";

	// Stop matchmaking animation if it's running
	if (matchmakingLoadingTween) {
		matchmakingLoadingTween.kill();
		matchmakingLoadingTween = null;
	}
	
	// Clean up solo mode timer if running
	if (soloModeTimerInterval) {
		clearInterval(soloModeTimerInterval);
		soloModeTimerInterval = null;
	}

	// Animate the login screen appearance
	gsap.fromTo(
		"#login-container",
		{ opacity: 0, y: 20 },
		{ opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
	);
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
	debugLog("Leave queue button clicked");
	socket.emit("leave-queue");
	gameStore.setState({ isInQueue: false, roomId: null, roomPlayers: [] });
	showLoginScreen(); // This already handles killing the animation
});

// Add event listener for Play Against Yourself button
playSoloButton.addEventListener("click", () => {
	debugLog("Play against yourself button clicked");
	socket.emit("play-solo");
	gameStore.setState({ 
		isInQueue: false, 
		roomId: "solo-" + Date.now(), 
		roomPlayers: [gameStore.getState().username as string],
		isSoloMode: true
	});
	showGameScreen();
	
	// Create a nicer notification explaining solo mode
	displayNotification("Solo Practice Mode Activated! Draw and guess by yourself!", "#6d28d9", 5);
	
	// Start the drawing turn automatically
	gameStore.setState({
		isDrawingEnabled: true,
		isMyTurn: true,
		turnType: "draw",
		timeRemaining: 100,
		currentWord: getRandomWord()
	});
	
	// Set up the UI for drawing
	const word = gameStore.getState().currentWord;
	if (word) {
		updateGameUI({
			isLoggedIn: true,
			isDrawingEnabled: true,
			currentWord: word,
			isMyTurn: true,
			turnType: "draw",
			timeRemaining: 100
		});
		
		// Show the word to draw
		showWordToast(word);
	}
	
	// Add a helpful system message explaining solo mode
	appendChatMessage({
		username: "SYSTEM",
		message: "Welcome to Solo Practice Mode! Draw the word shown, then try to guess it in the chat when you're done.",
		color: "#6d28d9"
	});
	
	// Start the timer for solo mode
	startSoloModeTimer();
});

// Variable to hold the solo mode timer interval
let soloModeTimerInterval: number | null = null;

// Function to start the timer for solo mode
function startSoloModeTimer() {
	// Clear any existing timer
	if (soloModeTimerInterval) {
		clearInterval(soloModeTimerInterval);
	}
	
	// Initial time
	let timeRemaining = 100;
	
	// Update the UI with the initial time
	updateGameUI({
		...gameStore.getState(),
		timeRemaining
	});
	
	// Start the timer interval
	soloModeTimerInterval = window.setInterval(() => {
		timeRemaining--;
		
		// Update game state
		gameStore.setState({
			timeRemaining
		});
		
		// Update UI
		updateGameUI({
			...gameStore.getState(),
			timeRemaining
		});
		
		// Check if time is up
		if (timeRemaining <= 0) {
			clearInterval(soloModeTimerInterval as number);
			soloModeTimerInterval = null;
			
			const state = gameStore.getState();
			
			// Handle time up based on current turn type
			if (state.turnType === "draw") {
				// Force switch to guessing
				gameStore.setState({
					isDrawingEnabled: false,
					turnType: "guess"
				});
				
				// Update UI
				updateGameUI({
					...state,
					isDrawingEnabled: false,
					turnType: "guess",
					timeRemaining: 0
				});
				
				// Show notification
				displayNotification("Time's up! Now try to guess your drawing.", "#6d28d9", 3);
				
				// Add message
				appendChatMessage({
					username: "SYSTEM",
					message: "Drawing time is up! Now try to guess your own drawing in the chat.",
					color: "#6d28d9"
				});
				
				// Start a new timer for guessing
				timeRemaining = 60;
				startSoloModeTimer();
			} else if (state.turnType === "guess") {
				// Switch back to drawing with a new word
				const newWord = getRandomWord();
				
				// Show what the word was
				appendChatMessage({
					username: "SYSTEM",
					message: `Time's up! The word was "${state.currentWord}". Starting new round.`,
					color: "#ef4444"
				});
				
				// Switch to drawing
				gameStore.setState({
					isDrawingEnabled: true,
					turnType: "draw",
					currentWord: newWord
				});
				
				// Clear canvas
				clearCanvas();
				
				// Update UI
				updateGameUI({
					...state,
					isDrawingEnabled: true,
					turnType: "draw",
					currentWord: newWord,
					timeRemaining: 0
				});
				
				// Show new word
				showWordToast(newWord);
				
				// Start a new timer for drawing
				timeRemaining = 100;
				startSoloModeTimer();
			}
		}
	}, 1000);
}

if (ctx) {
	ctx.lineWidth = 3;
	ctx.strokeStyle = "black";
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	
	// Ensure canvas has the same white background as the rest of the app
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

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
		// Use the same white color as the app background
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
}

sendChatButton.addEventListener("click", () => {
	const message = chatInput.value.trim();
	if (message) {
		debugLog("Sending chat message from button click", message);
		
		// In solo mode, check if the message matches the current word
		const state = gameStore.getState();
		if (state.isSoloMode && state.currentWord) {
			const normalizedGuess = message.toLowerCase().trim();
			const normalizedWord = state.currentWord.toLowerCase().trim();
			
			if (normalizedGuess === normalizedWord) {
				// Correct guess
				appendChatMessage({
					username: "SYSTEM",
					message: `🎉 Correct! The word was "${state.currentWord}"`,
					color: "#16a34a" // Green
				});
				
				// Show success notification
				displayNotification("Correct guess! You win!", "#16a34a", 3);
				
				// Save previous word and generate a new one
				const previousWord = state.currentWord;
				const newWord = getRandomWord();
				
				// Switch roles (from guessing to drawing)
				gameStore.setState({
					previousWord: previousWord,
					currentWord: newWord,
					isDrawingEnabled: true,
					turnType: "draw",
					timeRemaining: 100
				});
				
				// Clear the canvas for the next round
				clearCanvas();
				
				// Show the new word toast
				showWordToast(newWord);
				
				// Give instructions for next round
				setTimeout(() => {
					appendChatMessage({
						username: "SYSTEM",
						message: "New round started! Draw the new word shown above.",
						color: "#6d28d9"
					});
				}, 1000);
			} else {
				// Normal chat message in solo mode
				appendChatMessage({
					username: state.username || "You",
					message: message
				});
			}
		} else {
			// Normal multiplayer chat message
			socket.emit("chat-message", {
				username: state.username,
				message: message,
			});
		}
		
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
			
			// In solo mode, check if the message matches the current word
			const state = gameStore.getState();
			if (state.isSoloMode && state.currentWord) {
				const normalizedGuess = message.toLowerCase().trim();
				const normalizedWord = state.currentWord.toLowerCase().trim();
				
				if (normalizedGuess === normalizedWord) {
					// Correct guess
					appendChatMessage({
						username: "SYSTEM",
						message: `🎉 Correct! The word was "${state.currentWord}"`,
						color: "#16a34a" // Green
					});
					
					// Show success notification
					displayNotification("Correct guess! You win!", "#16a34a", 3);
					
					// Save previous word and generate a new one
					const previousWord = state.currentWord;
					const newWord = getRandomWord();
					
					// Switch roles (from guessing to drawing)
					gameStore.setState({
						previousWord: previousWord,
						currentWord: newWord,
						isDrawingEnabled: true,
						turnType: "draw",
						timeRemaining: 100
					});
					
					// Clear the canvas for the next round
					clearCanvas();
					
					// Show the new word toast
					showWordToast(newWord);
					
					// Give instructions for next round
					setTimeout(() => {
						appendChatMessage({
							username: "SYSTEM",
							message: "New round started! Draw the new word shown above.",
							color: "#6d28d9"
						});
					}, 1000);
				} else {
					// Normal chat message in solo mode
					appendChatMessage({
						username: state.username || "You",
						message: message
					});
				}
			} else {
				// Normal multiplayer chat message
				socket.emit("chat-message", {
					username: state.username,
					message: message,
				});
			}
			
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
/*
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
*/

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

	// Word display visibility should depend on game state - if element exists
	if (wordDisplay) {
		const { currentWord, turnType, isMyTurn } = gameStore.getState();
		if (currentWord && turnType === "draw" && isMyTurn) {
			wordDisplay.style.cssText = "display: block !important"; // Override the !important CSS
			wordDisplay.style.opacity = "1";
			wordDisplay.style.zIndex = "100";
		} else {
			wordDisplay.style.cssText = "display: none !important"; // Keep it hidden
		}
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

// Check if the device is mobile
function isMobileDevice() {
	return (window.innerWidth <= 768) || 
		   (navigator.maxTouchPoints > 0 && /Mobi|Android/i.test(navigator.userAgent));
}

// Function to handle responsiveness
function handleResponsiveness() {
	const isMobile = isMobileDevice();
	
	// Update UI elements based on device
	if (isMobile) {
		// Adjust canvas size for mobile
		const canvas = document.getElementById("drawing-canvas") as HTMLCanvasElement;
		if (canvas) {
			canvas.width = Math.min(window.innerWidth - 40, 400);
			canvas.height = canvas.width;
		}
		
		// Adjust chat container for mobile
		const chatMessages = document.getElementById("chat-messages");
		if (chatMessages) {
			chatMessages.style.maxHeight = "120px";
		}
	}
}

// Initialize the app with splash screen
function initApp() {
	// Hide the login container initially
	document.getElementById("login-container")?.classList.add("hidden");
	
	// Create splash screen with callback to show login container
	createSplashScreen(() => {
		// After splash screen is removed, show login container
		document.getElementById("login-container")?.classList.remove("hidden");
		gsap.from("#login-container", {
			y: 20,
			opacity: 0,
			duration: 0.5,
			ease: "power2.out"
		});
		
		// Check responsiveness
		handleResponsiveness();
	});
}

// Initialize immediately when the document is loaded
document.addEventListener("DOMContentLoaded", () => {
	initApp();
	
	// Add resize listener for responsiveness
	window.addEventListener("resize", handleResponsiveness);
});
