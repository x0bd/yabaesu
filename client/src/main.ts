import "./style.css";
import { io } from "socket.io-client";

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
const timerDisplay = document.getElementById("timer") as HTMLDivElement; // Get the timer display element
const leaderboardList = document.getElementById(
	"leaderboard-list"
) as HTMLUListElement;

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
});

socket.on("connect_error", (err) => {
	console.error("Socket.IO connection error:", err);
});

socket.on("connected-users", (users: string) => {
	console.log("Connected Users:", users);
});

socket.on("start-drawing-turn", () => {
	if (username) {
		alert(`${username}, it's your turn to draw!`);
		isDrawingEnabled = true;
		guessInput.disabled = true;
		submitGuessButton.disabled = true;
		clearCanvas();
	}
});

socket.on("start-guessing-turn", () => {
	if (username) {
		alert(`${username}, it's your turn to guess!`);
		isDrawingEnabled = false;
		guessInput.disabled = false;
		submitGuessButton.disabled = false;
	}
});

// --- Timer Display ---
socket.on("timer-update", (time: number) => {
	timerDisplay.textContent = `Time: ${time}`;
});

socket.on("drawing-time-ended", () => {
	alert("Time is up!"); // You can replace this with a more user-friendly UI update
	// Here we might want to show the word or handle the end of the turn
});
// --- End Timer Display ---

loginButton.addEventListener("click", () => {
	const enteredUsername = usernameInput.value.trim();
	if (enteredUsername) {
		username = enteredUsername;
		loginContainer.classList.add("hidden");
		gameContainer.classList.remove("hidden");
		console.log(
			`User logged in: ${username}. Attempting Socket.IO connection.`
		);
		if (socket.connected) {
			socket.emit("user-joined", username);
		}
	} else {
		loginError.classList.remove("hidden");
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
	const message = chatInput.value.trim();
	if (message && username) {
		socket.emit("chat-message", { username, message });
		chatInput.value = "";
	}
});

chatInput.addEventListener("keypress", (event) => {
	if (event.key === "Enter") {
		sendChatButton.click();
	}
});

function appendChatMessage(data: { username: string; message: string }) {
	const messageElement = document.createElement("div");
	messageElement.textContent = `${data.username}: ${data.message}`;
	chatMessages.appendChild(messageElement);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

submitGuessButton.addEventListener("click", () => {
	const guess = guessInput.value.trim();
	if (guess && username) {
		socket.emit("guess", { username, guess });
		guessInput.value = "";
	}
});

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
	(leaderboard: { username: string; wins: number }) => {
		leaderboardList.innerHTML = "";
		leaderboard.forEach((entry) => {
			const listItem = document.createElement("li");
			listItem.textContent = `${entry.username}: ${entry.wins}`;
			leaderboardList.appendChild(listItem);
		});
	}
);
