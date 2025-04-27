import * as THREE from "three";
import { gsap } from "gsap";

export function createSplashScreen(onEnterClick: () => void) {
  // Create and return the splash screen element
  const splashContainer = document.createElement("div");
  splashContainer.id = "splash-container";
  splashContainer.style.position = "fixed";
  splashContainer.style.top = "0";
  splashContainer.style.left = "0";
  splashContainer.style.width = "100%";
  splashContainer.style.height = "100%";
  splashContainer.style.zIndex = "9999";
  splashContainer.style.display = "flex";
  splashContainer.style.flexDirection = "column";
  splashContainer.style.justifyContent = "center";
  splashContainer.style.alignItems = "center";
  splashContainer.style.backgroundColor = "#f3f4f6"; // Light gray background similar to app
  
  // Add grid pattern that matches the main app
  splashContainer.classList.add('grid-pattern');
  
  // Create text container for Three.js effect
  const textEffectContainer = document.createElement("div");
  textEffectContainer.id = "splash-text-effect";
  textEffectContainer.style.width = "100%";
  textEffectContainer.style.height = "50%"; // Reduced height to make room for button
  textEffectContainer.style.position = "relative";
  textEffectContainer.style.display = "flex";
  textEffectContainer.style.justifyContent = "center";
  textEffectContainer.style.alignItems = "center";
  
  // Create a container for the button
  const buttonContainer = document.createElement("div");
  buttonContainer.style.marginTop = "20px"; 
  buttonContainer.style.display = "flex";
  buttonContainer.style.flexDirection = "column";
  buttonContainer.style.alignItems = "center";
  buttonContainer.style.gap = "20px";
  
  // Create the play button with the game's aesthetic
  const playButton = document.createElement("button");
  playButton.textContent = "PLAY";
  playButton.style.backgroundColor = "#000000";
  playButton.style.color = "#ffffff";
  playButton.style.border = "none";
  playButton.style.padding = "16px 32px";
  playButton.style.fontSize = "16px";
  playButton.style.fontWeight = "bold";
  playButton.style.fontFamily = "'Geist Mono', monospace";
  playButton.style.textTransform = "uppercase";
  playButton.style.cursor = "pointer";
  playButton.style.boxShadow = "6px 6px 0 #ef4444"; // Red shadow
  playButton.style.transition = "transform 0.2s, box-shadow 0.2s";
  
  // Add hover and active effects
  playButton.onmouseover = () => {
    playButton.style.transform = "scale(1.02)";
  };
  
  playButton.onmouseout = () => {
    playButton.style.transform = "scale(1)";
  };
  
  playButton.onmousedown = () => {
    playButton.style.transform = "translate(2px, 2px)";
    playButton.style.boxShadow = "4px 4px 0 #ef4444";
  };
  
  playButton.onmouseup = () => {
    playButton.style.transform = "scale(1)";
    playButton.style.boxShadow = "6px 6px 0 #ef4444";
  };
  
  // Add click event to transition to login screen
  playButton.onclick = () => {
    gsap.to(splashContainer, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        splashContainer.remove();
        onEnterClick(); // Call the callback function
      }
    });
  };
  
  // Add loading text (which appears below the button)
  const loadingContainer = document.createElement("div");
  loadingContainer.style.display = "flex";
  loadingContainer.style.alignItems = "center";
  loadingContainer.style.gap = "10px";
  loadingContainer.innerHTML = `
    <div class="splash-loading">
      <div class="dot-1"></div>
      <div class="dot-2"></div>
      <div class="dot-3"></div>
      <div class="dot-4"></div>
    </div>
    <p class="splash-loading-text">ready when you are</p>
  `;
  
  // Add elements to splash container
  buttonContainer.appendChild(playButton);
  buttonContainer.appendChild(loadingContainer);
  
  splashContainer.appendChild(textEffectContainer);
  splashContainer.appendChild(buttonContainer);
  
  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    @import url("https://fonts.googleapis.com/css2?family=Rampart+One&display=swap");
    
    .grid-pattern {
      background-image: linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    
    .splash-loading {
      position: relative;
      width: 60px;
      height: 60px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .splash-loading-text {
      font-family: 'Geist Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: 14px;
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    .splash-loading .dot-1,
    .splash-loading .dot-2,
    .splash-loading .dot-3,
    .splash-loading .dot-4 {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ef4444;
    }
    
    @keyframes orbit {
      0% {
        transform: rotate(0deg) translateX(20px) rotate(0deg);
      }
      100% {
        transform: rotate(360deg) translateX(20px) rotate(-360deg);
      }
    }
    
    .splash-loading .dot-1 {
      animation: orbit 1.5s linear infinite;
    }
    
    .splash-loading .dot-2 {
      animation: orbit 1.5s linear infinite;
      animation-delay: -0.375s;
    }
    
    .splash-loading .dot-3 {
      animation: orbit 1.5s linear infinite;
      animation-delay: -0.75s;
    }
    
    .splash-loading .dot-4 {
      animation: orbit 1.5s linear infinite;
      animation-delay: -1.125s;
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(splashContainer);
  
  // Initialize Three.js effect
  initTextEffect(textEffectContainer);
  
  return splashContainer;
}

function initTextEffect(container: HTMLElement) {
  let scene: THREE.Scene, 
      camera: THREE.OrthographicCamera, 
      renderer: THREE.WebGLRenderer, 
      planeMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  
  let mousePosition = { x: 0.5, y: 0.5 };
  let targetMousePosition = { x: 0.5, y: 0.5 };
  let prevPosition = { x: 0.5, y: 0.5 };
  let easeFactor = 0.02;
  
  // Shaders
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

  function createTextTexture(text: string, font: string, size: number | null, color: string) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const canvasWidth = window.innerWidth * 2;
    const canvasHeight = window.innerHeight * 2;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fill the background
    ctx.fillStyle = color || "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw the text
    const fontSize = size || Math.floor(canvasWidth * 0.15); // Adjusted for better size
    ctx.fillStyle = "#000000"; // Black text
    ctx.font = `700 ${fontSize}px ${font || "Rampart One"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Measure and place text
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;

    const scaleFactor = Math.min(1, (canvasWidth * 0.8) / textWidth);
    const aspectCorrection = canvasWidth / canvasHeight;

    ctx.setTransform(
      scaleFactor,
      0,
      0,
      scaleFactor / aspectCorrection,
      canvasWidth / 2,
      canvasHeight / 2
    );

    // Add outline
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = fontSize * 0.005;
    for (let i = 0; i < 3; i++) {
      ctx.strokeText(text, 0, 0);
    }

    ctx.fillText(text, 0, 0);
    
    // Add subtitle text
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `400 ${fontSize * 0.15}px Geist Mono`;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText("SILLY DRAW & GUESS GAME", canvasWidth / 2, canvasHeight * 0.6);

    return new THREE.CanvasTexture(canvas);
  }

  function init() {
    scene = new THREE.Scene();
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(
      -1, 1, 1 / aspectRatio, -1 / aspectRatio, 0.1, 1000
    );
    camera.position.z = 1;

    // Create texture with the Japanese text
    const texture = createTextTexture("ヤベス", "Rampart One", null, "#ffffff");

    // Set up shader uniforms
    let shaderUniforms = {
      u_mouse: { value: new THREE.Vector2() },
      u_prevMouse: { value: new THREE.Vector2() },
      u_texture: { value: texture },
    };

    // Create plane with shader material
    planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: shaderUniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
      })
    );

    scene.add(planeMesh);

    // Set up renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xffffff, 1);
    renderer.setPixelRatio(window.devicePixelRatio);

    container.appendChild(renderer.domElement);

    // Event listeners for mouse interaction
    container.addEventListener("mousemove", handleMouseMove);
    
    // Auto animation for splash screen
    animateMouseMovement();
  }

  function animateMouseMovement() {
    // Create an automatic mouse movement animation
    const timeline = gsap.timeline({
      repeat: -1,
      yoyo: true,
      onUpdate: () => {
        prevPosition = { ...targetMousePosition };
      }
    });
    
    // Move in a circular pattern
    timeline.to(targetMousePosition, {
      x: 0.3,
      y: 0.3,
      duration: 2,
      ease: "sine.inOut"
    });
    
    timeline.to(targetMousePosition, {
      x: 0.7,
      y: 0.3,
      duration: 2,
      ease: "sine.inOut"
    });
    
    timeline.to(targetMousePosition, {
      x: 0.7,
      y: 0.7,
      duration: 2,
      ease: "sine.inOut"
    });
    
    timeline.to(targetMousePosition, {
      x: 0.3,
      y: 0.7,
      duration: 2,
      ease: "sine.inOut"
    });
  }

  function handleMouseMove(event: MouseEvent) {
    easeFactor = 0.04;
    let rect = container.getBoundingClientRect();
    prevPosition = { ...targetMousePosition };

    targetMousePosition.x = (event.clientX - rect.left) / rect.width;
    targetMousePosition.y = (event.clientY - rect.top) / rect.height;
  }

  function animate() {
    requestAnimationFrame(animate);

    mousePosition.x += (targetMousePosition.x - mousePosition.x) * easeFactor;
    mousePosition.y += (targetMousePosition.y - mousePosition.y) * easeFactor;

    planeMesh.material.uniforms.u_mouse.value.set(
      mousePosition.x,
      1.0 - mousePosition.y
    );

    planeMesh.material.uniforms.u_prevMouse.value.set(
      prevPosition.x,
      1.0 - prevPosition.y
    );

    renderer.render(scene, camera);
  }

  // Handle window resizing
  function onWindowResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera.top = 1 / aspectRatio;
    camera.bottom = -1 / aspectRatio;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  window.addEventListener('resize', onWindowResize);
  
  // Initialize and start animation
  init();
  animate();
}

// Function to remove the splash screen with animation
export function removeSplashScreen() {
  const splashContainer = document.getElementById("splash-container");
  if (splashContainer) {
    gsap.to(splashContainer, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        splashContainer.remove();
      }
    });
  }
} 