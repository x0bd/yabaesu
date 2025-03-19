import "./style.css";
import { io } from "socket.io-client";
import { gsap } from "gsap";

const loginContainer = document.getElementById(
	"login-container"
) as HTMLDivElement;
const gameContainer = document.getElementById(
	"game-container"
) as HTMLDivElement;
const usernameInput = document.getElementById("username") as HTMLInputElement;
const loginButton = document.getElementById(
	"login-button"
) as HTMLButtonElement;
const loginError = document.getElementById(
	"login-error"
) as HTMLParagraphElement;

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

// New UI elements
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

let username: string | null = null;
let isDrawingEnabled = false;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Initialize Socket.IO connection
const socket = io("http://localhost:4000");

socket.on("connect", () => {
	console.log("Connected to Socket.IO server!");
	if (username) {
		socket.emit("user-joined", username);
	}
});

socket.on("disconnect", () => {
	console.log("Disconnected from Socket.IO server!");
	showNotification("Connection lost! Reconnecting...", "red");
});

socket.on("connect_error", (err) => {
	console.error("Socket.IO connection error:", err);
	showNotification("Connection error! Retrying...", "red");
});

socket.on("connected-users", (users: string) => {
	console.log("Connected Users:", users);
	showNotification(`${users} connected!`, "blue");
});

socket.on("start-drawing-turn", () => {
	if (username) {
		showGameStatus(
			"Your Turn to Draw!",
			"Draw the word you've been given!",
			"Ready"
		);
		isDrawingEnabled = true;
		guessInput.disabled = true;
		submitGuessButton.disabled = true;
		clearCanvas();

		// Update turn indicator
		turnIndicator.textContent = "YOUR TURN TO DRAW";
		turnIndicator.style.backgroundColor = "#fde047"; // Yellow
		gsap.fromTo(
			turnIndicator,
			{ opacity: 0, y: -20 },
			{ opacity: 1, y: 0, duration: 0.5, ease: "back.out" }
		);
		turnIndicator.classList.remove("hidden");
	}
});

socket.on("start-guessing-turn", () => {
	if (username) {
		showGameStatus(
			"Your Turn to Guess!",
			"Try to guess what's being drawn!",
			"Ready"
		);
		isDrawingEnabled = false;
		guessInput.disabled = false;
		submitGuessButton.disabled = false;
		clearCanvas();

		// Update turn indicator
		turnIndicator.textContent = "YOUR TURN TO GUESS";
		turnIndicator.style.backgroundColor = "#93c5fd"; // Blue
		gsap.fromTo(
			turnIndicator,
			{ opacity: 0, y: -20 },
			{ opacity: 1, y: 0, duration: 0.5, ease: "back.out" }
		);
		turnIndicator.classList.remove("hidden");
	}
});

socket.on("timer-update", (time: number) => {
	timerDisplay.textContent = `TIME: ${time}`;

	// Add animation when time is running low
	if (time <= 5) {
		gsap.to(timerDisplay, {
			backgroundColor: "#ef4444",
			color: "white",
			repeat: 1,
			yoyo: true,
			duration: 0.2,
		});
	}
});

socket.on("drawing-time-ended", () => {
	showGameStatus("Time's Up!", "Drawing time has ended.", "OK");
	clearCanvas();

	// Animate the timer
	gsap.to(timerDisplay, {
		scale: 1.1,
		backgroundColor: "#ef4444",
		color: "white",
		duration: 0.3,
		yoyo: true,
		repeat: 1,
	});
});

socket.on("your-word", (word: string) => {
	console.log("Received word to draw:", word);
	if (username) {
		// Show the word in the word display area with animation
		wordText.textContent = word;
		wordDisplay.classList.add("active");

		gsap.fromTo(
			wordDisplay,
			{ y: -50, opacity: 0 },
			{ y: 0, opacity: 1, duration: 0.5, ease: "back.out" }
		);

		// Bounce animation for the word
		gsap.to(wordText, {
			scale: 1.1,
			color: "#ff0000",
			duration: 0.3,
			repeat: 1,
			yoyo: true,
		});
	}
});

socket.on("start-drawing-turn", () => {
	if (username) {
		showGameStatus(
			"Your Turn to Draw!",
			"Draw the word shown at the top of the screen!",
			"Ready"
		);
		isDrawingEnabled = true;
		guessInput.disabled = true;
		submitGuessButton.disabled = true;
		clearCanvas();

		// Update turn indicator
		turnIndicator.textContent = "YOUR TURN TO DRAW";
		turnIndicator.style.backgroundColor = "#fde047"; // Yellow
		gsap.fromTo(
			turnIndicator,
			{ opacity: 0, y: -20 },
			{ opacity: 1, y: 0, duration: 0.5, ease: "back.out" }
		);
		turnIndicator.classList.remove("hidden");
	}
});

socket.on("your-word", (word: string) => {
	console.log("Received word to draw:", word);
	if (username) {
		// Update the word display
		wordText.textContent = word;
		wordDisplay.classList.add("active");

		// Also show a notification with the word
		showNotification(`Your word to draw is: ${word}`, "green");

		// Add animations
		gsap.fromTo(
			wordDisplay,
			{ y: -50, opacity: 0 },
			{ y: 0, opacity: 1, duration: 0.5, ease: "back.out" }
		);

		gsap.to(wordText, {
			scale: 1.1,
			color: "#ff0000",
			duration: 1,
			repeat: 1,
			yoyo: true,
		});
	}
});

loginButton.addEventListener("click", () => {
	const enteredUsername = usernameInput.value.trim();
	if (enteredUsername) {
		username = enteredUsername;

		// Animate the transition from login to game
		gsap.to(loginContainer, {
			scale: 0.8,
			opacity: 0,
			duration: 0.5,
			onComplete: () => {
				loginContainer.classList.add("hidden");
				gameContainer.classList.remove("hidden");

				// Animate game container entry
				gsap.fromTo(
					gameContainer,
					{ scale: 0.9, opacity: 0 },
					{ scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }
				);
			},
		});

		console.log(
			`User logged in: ${username}. Attempting Socket.IO connection.`
		);
		if (socket.connected) {
			socket.emit("user-joined", username);
		}
		clearCanvas();
	} else {
		loginError.classList.remove("hidden");

		// Shake animation for error
		gsap.to(loginError, {
			x: "+=10",
			duration: 0.1,
			repeat: 5,
			yoyo: true,
		});
	}
});

if (ctx) {
	ctx.lineWidth = 3;
	ctx.strokeStyle = "black";
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	canvas.addEventListener("mousedown", (e) => {
		if (!isDrawingEnabled) return;
		isDrawing = true;
		lastX = e.offsetX;
		lastY = e.offsetY;
	});

	canvas.addEventListener("mousemove", (e) => {
		if (!isDrawing || !isDrawingEnabled) return;
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
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.closePath();

	socket.emit("drawing", { x1, y1, x2, y2 });
}

function clearCanvas() {
	if (ctx) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
}

sendChatButton.addEventListener("click", () => {
	sendChatMessage();
});

chatInput.addEventListener("keypress", (event) => {
	if (event.key === "Enter") {
		sendChatMessage();
	}
});

function sendChatMessage() {
	const message = chatInput.value.trim();
	if (message && username) {
		socket.emit("chat-message", { username, message });
		chatInput.value = "";

		// Small animation feedback for sending message
		gsap.fromTo(
			chatInput,
			{ backgroundColor: "#f0f9ff" },
			{ backgroundColor: "#ffffff", duration: 0.5 }
		);
	}
}

function appendChatMessage(data: { username: string; message: string }) {
	const messageElement = document.createElement("div");
	messageElement.textContent = `${data.username}: ${data.message}`;
	messageElement.style.opacity = "0";
	messageElement.style.transform = "translateY(10px)";

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

	chatMessages.scrollTop = chatMessages.scrollHeight;
}

submitGuessButton.addEventListener("click", () => {
	submitGuess();
});

guessInput.addEventListener("keypress", (event) => {
	if (event.key === "Enter") {
		submitGuess();
	}
});

function submitGuess() {
	const guess = guessInput.value.trim();
	if (guess && username) {
		socket.emit("guess", { username, guess });
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
}

socket.on("chat-message", (data: { username: string; message: string }) => {
	appendChatMessage(data);
});

socket.on(
	"draw",
	(data: { x1: number; y1: number; x2: number; y2: number }) => {
		if (ctx) {
			drawLine(data.x1, data.y1, data.x2, data.y2);
		}
	}
);

socket.on(
	"leaderboard-update",
	(leaderboard: Array<{ username: string; wins: number }>) => {
		leaderboardList.innerHTML = "";
		leaderboard.forEach((entry, index) => {
			const listItem = document.createElement("li");
			listItem.textContent = `${entry.username}: ${entry.wins}`;
			listItem.style.opacity = "0";
			listItem.style.transform = "translateY(10px)";

			// Add crown emoji for the top player
			if (index === 0 && entry.wins > 0) {
				listItem.textContent = `👑 ${entry.username}: ${entry.wins}`;
				listItem.style.fontWeight = "bold";
			}

			leaderboardList.appendChild(listItem);

			// Staggered animation for leaderboard entries
			gsap.to(listItem, {
				opacity: 1,
				y: 0,
				duration: 0.3,
				delay: index * 0.1,
				ease: "power1.out",
			});
		});

		// Highlight the leaderboard container
		gsap.fromTo(
			"#leaderboard-container",
			{ boxShadow: "6px 6px 0 #000" },
			{
				boxShadow: "8px 8px 0 #000",
				duration: 0.3,
				yoyo: true,
				repeat: 1,
			}
		);
	}
);

// Function to show temporary notifications
function showNotification(message: string, color: string = "black") {
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
			delay: 2.5,
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
