import * as THREE from "three";

const textContainer = document.getElementById("textContainer");
let easeFactor = 0.02;
let scene, camera, renderer, planeMesh;
let mousePosition = { x: 0.5, y: 0.5 };
let targetMousePosition = { x: 0.5, y: 0.5 };
let prevPosition = { x: 0.5, y: 0.5 };

//Shaders
const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
 varying vec2 vUv;
 uniform sampler2D u_texture;
 uniform vec2 u_mouse;
 uniform vec2 u_prevMouse;

 void main() {
  vec2 gridUV = floor(vUv * vec2(40.0, 40.0)) / vec2(40.0, 40.0);
  vec2 centreOfPixel = gridUV + vec2(1.0/40.0, 1.0/40.0);

  vec2 mouseDirection = u_mouse - u_prevMouse;

  vec2 pixelToMouseDirection = centreOfPixel - u_mouse;
  float pixelDistanceToMouse = length(pixelToMouseDirection);
  float strength = smoothstep(0.0, 0.2, pixelDistanceToMouse);

  vec2 uvOffset = strength * -mouseDirection * 0.3;
  vec2 uv = vUv - uvOffset;

  vec4 color = texture2D(u_texture, uv);
  gl_FragColor = color;
}
`;

function createTextTexture(text, font, size, color, fontWeight = "100") {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");

	const canvasWidth = window.innerWidth * 2;
	const canvasHeight = window.innerHeight * 2;

	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	ctx.fillStyle = color || "#ffffff";
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);

	const fontSize = size || Math.floor(canvasWidth * 2);
	ctx.fillStyle = "#1a1a1a";
	ctx.font = `${fontWeight} ${fontSize}px ${font || "Rampart One"}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";

	const textMetrics = ctx.measureText(text);
	const textWidth = textMetrics.width;

	const scaleFactor = Math.min(1, (canvasWidth * 1) / textWidth);
	const aspectCorrection = canvasWidth / canvasHeight;

	ctx.setTransform(
		scaleFactor,
		0,
		0,
		scaleFactor / aspectCorrection,
		canvasWidth / 2,
		canvasHeight / 2
	);

	ctx.strokeStyle = "#1a1a1a";
	ctx.lineWidth = fontSize * 0.005;
	for (let i = 0; i < 3; i++) {
		ctx.strokeText(text, 0, 0);
	}

	ctx.fillText(text, 0, 0);

	return new THREE.CanvasTexture(canvas);
}

function init() {
	scene = new THREE.Scene();
	const aspectRatio = window.innerWidth / window.innerHeight;
	camera = new THREE.OrthographicCamera(
		-1,
		1,
		1 / aspectRatio,
		-1 / aspectRatio,
		0.1,
		1000
	);

	camera.position.z = 1;

	let shaderUniforms = {
		u_mouse: { type: "v2", value: new THREE.Vector2() },
		u_prevMouse: { type: "v2", value: new THREE.Vector2() },
		u_texture: { type: "t", value: texture },
	};
}
