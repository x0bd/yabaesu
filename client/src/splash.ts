import * as THREE from "three";
import { gsap } from "gsap";
import { createLoadingAnimation } from "./animations"; // Import the new function

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
  splashContainer.style.backgroundColor = "#f3f4f6"; // Match the app's main background color
  
  // Re-enable grid pattern class
  splashContainer.classList.add('grid-pattern');
  
  // Create text container for Three.js effect
  const textEffectContainer = document.createElement("div");
  textEffectContainer.id = "splash-text-effect";
  textEffectContainer.style.width = "100%";
  textEffectContainer.style.height = "50%";
  textEffectContainer.style.position = "relative";
  textEffectContainer.style.display = "flex";
  textEffectContainer.style.justifyContent = "center";
  textEffectContainer.style.alignItems = "center";
  textEffectContainer.style.maxWidth = "800px"; // Limit maximum width
  textEffectContainer.style.margin = "0 auto"; // Center the container
  
  // Create a container for the button and new loading indicator
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
  
  // Create NEW minimal loading indicator element (placeholder)
  const loadingIndicator = document.createElement("div");
  loadingIndicator.id = "minimal-loading-indicator";
  // Styling will be applied by createLoadingAnimation
  
  // Add loading text 
  const loadingTextElement = document.createElement("p");
  loadingTextElement.className = "splash-loading-text";
  loadingTextElement.textContent = "ready when you are";
  
  // Create footer element with attribution
  const footer = document.createElement("div");
  footer.classList.add("splash-footer");
  footer.style.position = "absolute";
  footer.style.bottom = "20px";
  footer.style.left = "0";
  footer.style.width = "100%";
  footer.style.textAlign = "center";
  footer.style.fontFamily = "'Geist Mono', monospace";
  footer.style.fontSize = "12px";
  footer.style.padding = "10px";
  footer.style.color = "#333";
  
  // Create color dots
  const dotsContainer = document.createElement("div");
  dotsContainer.style.display = "flex";
  dotsContainer.style.justifyContent = "center";
  dotsContainer.style.gap = "8px";
  dotsContainer.style.marginBottom = "8px";
  
  // Add the color dots representing app colors (from loading animation)
  const colors = ["#ef4444", "#000000", "#cccccc"]; // Red, Black, Light Grey
  colors.forEach(color => {
    const dot = document.createElement("div");
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.borderRadius = "50%";
    dot.style.backgroundColor = color;
    dotsContainer.appendChild(dot);
  });
  
  // Add link to xoboid website
  const link = document.createElement("a");
  link.href = "https://xoboid.vercel.app";
  link.target = "_blank";
  link.style.color = "#333";
  link.style.textDecoration = "none";
  link.style.borderBottom = "1px solid #333";
  link.style.paddingBottom = "2px";
  link.style.transition = "opacity 0.2s";
  link.textContent = "designed and built by xoboid";
  link.onmouseover = () => {
    link.style.opacity = "0.7";
  };
  link.onmouseout = () => {
    link.style.opacity = "1";
  };
  
  // Improve mobile warning with better styling and clearer message
  if (window.innerWidth < 768) {
    const mobileWarning = document.createElement("div");
    mobileWarning.classList.add("mobile-warning");
    mobileWarning.style.position = "absolute";
    mobileWarning.style.top = "10px";
    mobileWarning.style.left = "10px";
    mobileWarning.style.right = "10px";
    mobileWarning.style.padding = "12px 15px";
    mobileWarning.style.backgroundColor = "#fef2f2";
    mobileWarning.style.border = "2px solid #ef4444";
    mobileWarning.style.borderRadius = "4px";
    mobileWarning.style.fontSize = "13px";
    mobileWarning.style.color = "#333";
    mobileWarning.style.textAlign = "center";
    mobileWarning.style.fontFamily = "'Geist Mono', monospace";
    mobileWarning.style.fontWeight = "bold";
    mobileWarning.style.zIndex = "10000";
    mobileWarning.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    mobileWarning.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 5px;">
        <span style="display: inline-block; width: 16px; height: 16px; background-color: #ef4444; border-radius: 50%; margin-right: 8px;"></span>
        <span style="font-size: 14px;">Mobile Experience</span>
      </div>
      <p>This game works better on larger screens. For the best experience, please use a tablet or computer.</p>
    `;
    
    splashContainer.appendChild(mobileWarning);
  }
  
  // Assemble footer
  footer.appendChild(dotsContainer);
  footer.appendChild(link);
  
  // Add elements to splash container
  buttonContainer.appendChild(playButton);
  buttonContainer.appendChild(loadingIndicator); // Add placeholder
  buttonContainer.appendChild(loadingTextElement); // Text below the dots
  
  splashContainer.appendChild(textEffectContainer);
  splashContainer.appendChild(buttonContainer);
  splashContainer.appendChild(footer);
  
  // Add styles (Removed GSAP specific styles from here)
  const style = document.createElement("style");
  style.textContent = `
    @import url("https://fonts.googleapis.com/css2?family=Rampart+One&display=swap");
    
    .grid-pattern {
      background-image: linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    
    .splash-loading-text {
      font-family: 'Geist Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: 14px;
      animation: pulse 1.5s ease-in-out infinite; /* Keep text pulsing */
      margin-top: 5px; // Adjusted margin
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
    
    /* Media queries for better mobile experience */
    @media (max-width: 768px) {
      #splash-text-effect {
        height: 40% !important;
        width: 90% !important; 
        margin: 0 auto !important;
      }
      
      #splash-text-effect canvas {
        width: 100% !important;
        height: auto !important;
      }
      
      .splash-footer {
        bottom: 10px !important;
        padding: 5px !important;
      }
      
      /* Increase play button size on mobile */
      #splash-play-button {
        padding: 20px 40px !important;
        font-size: 18px !important;
      }
      
      .splash-loading-text {
        font-size: 12px;
      }
      
      #minimal-loading-indicator {
          margin-bottom: 5px; /* Add some space between dots and text on mobile */
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(splashContainer);
  
  // Call the reusable animation function
  createLoadingAnimation(loadingIndicator);
  
  // Initialize Three.js effect
  initTextEffect(textEffectContainer);
  
  // Make sure to give the play button an ID for targeting in CSS
  playButton.id = "splash-play-button";
  
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
  
  // Enhanced shader with more responsive distortion but contained within boundaries
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Update the fragment shader with a more impressive effect
  const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D u_texture;
    uniform vec2 u_mouse;
    uniform vec2 u_prevMouse;

    void main() {
      // More pronounced pixelation effect
      vec2 gridUV = floor(vUv * vec2(50.0, 50.0)) / vec2(50.0, 50.0);
      vec2 centreOfPixel = gridUV + vec2(1.0/50.0, 1.0/50.0);

      // Calculate mouse direction with limit to prevent extreme effects
      vec2 mouseDirection = (u_mouse - u_prevMouse);
      // Limit the maximum displacement to avoid joltiness
      float maxDisplacement = 0.05;
      float dirLength = length(mouseDirection);
      if (dirLength > maxDisplacement) {
        mouseDirection = mouseDirection * (maxDisplacement / dirLength);
      }
      mouseDirection = mouseDirection * 3.0; // Amplify but with limits

      vec2 pixelToMouseDirection = centreOfPixel - u_mouse;
      float pixelDistanceToMouse = length(pixelToMouseDirection);
      
      // Enhanced distortion with improved smoothstep for more responsive feel
      float strength = smoothstep(0.0, 0.3, pixelDistanceToMouse);
      
      // Controlled distortion amount
      vec2 uvOffset = strength * -mouseDirection * 0.3;
      
      // Add subtle wavy distortion based on position
      float time = pixelDistanceToMouse * 10.0; // Use distance as a time factor
      float waveStrength = 0.015 * (1.0 - strength);
      uvOffset.x += waveStrength * sin(vUv.y * 20.0 + time);
      uvOffset.y += waveStrength * cos(vUv.x * 20.0 + time);
      
      // Add subtle pulsing effect
      float pulse = 0.005 * sin(pixelDistanceToMouse * 30.0);
      uvOffset += pulse * normalize(pixelToMouseDirection);
      
      // Ensure the UV coordinates stay within valid range
      vec2 uv = clamp(vUv - uvOffset, vec2(0.0), vec2(1.0));

      // Sample the texture with our distorted coordinates
      vec4 color = texture2D(u_texture, uv);
      
      // Add subtle vignette effect
      float vignette = smoothstep(0.0, 0.7, length(vUv - 0.5));
      color.rgb = mix(color.rgb, color.rgb * 0.98, vignette);

      gl_FragColor = color;
    }
  `;

  function createTextTexture(text: string, font: string, size: number | null, color: string) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // Responsive sizing for different screen sizes
    const isMobile = window.innerWidth <= 768;
    
    // Adjust canvas size - smaller for mobile
    const canvasWidth = isMobile ? 
      Math.min(window.innerWidth * 1.5, 1200) : 
      Math.min(window.innerWidth * 2, 2400);
      
    const canvasHeight = isMobile ? 
      Math.min(window.innerHeight * 1.5, 1200) : 
      Math.min(window.innerHeight * 2, 1800);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fill the background
    ctx.fillStyle = color || "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw the text - with MUCH LARGER sizing to fill about 80% of canvas
    const fontSize = size || (isMobile ? 
      Math.min(Math.floor(canvasWidth * 0.32), 600) : // Increased from 0.22 to 0.32
      Math.min(Math.floor(canvasWidth * 0.28), 600)); // Increased from 0.18 to 0.28
      
    ctx.fillStyle = "#000000"; // Black text
    ctx.font = `700 ${fontSize}px ${font || "Rampart One"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Measure and place text
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;

    
    const scaleFactor = isMobile ? 
      Math.min(1, (canvasWidth * 5) / textWidth) : // Increased from 0.9 to 0.95
      Math.min(1, (canvasWidth * 5) / textWidth); // Increased from 0.85 to 0.92
      
    const aspectCorrection = canvasWidth / canvasHeight;

    // Position the text slightly higher to make room for subtitle with larger text
    const yOffset = isMobile ? -0.05 : -0.02;
    ctx.setTransform(
      scaleFactor,
      0,
      0,
      scaleFactor / aspectCorrection,
      canvasWidth / 2,
      canvasHeight / 2 + (canvasHeight * yOffset) // Adjust vertical position
    );

    // Add outline - slightly thicker for better emphasis with larger text
    ctx.strokeStyle = "#ef4444"; // Red outline that matches the app's aesthetic
    ctx.lineWidth = fontSize * 0.014; // Increased from 0.012 to 0.014
    for (let i = 0; i < 3; i++) {
      ctx.strokeText(text, 0, 0);
    }

    ctx.fillText(text, 0, 0);
    
    // Add subtitle text - positioned lower to accommodate larger main text
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Make subtitle text slightly larger and position it higher
    const subtitleSize = isMobile ? 
      Math.min(fontSize * 0.14, 63) : // Increased from 0.12 to 0.14, increased cap
      Math.min(fontSize * 0.13, 70); // Increased from 0.11 to 0.13, increased cap
      
    ctx.font = `500 ${subtitleSize}px Geist Mono`;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    // Position the subtitle slightly higher 
    ctx.fillText("SILLY DRAW & GUESS GAME", canvasWidth / 2, canvasHeight * (isMobile ? 0.72 : 0.70)); // Reduced multipliers to move text up

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

    // Set up renderer with proper sizing
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    // Set initial size more carefully based on container size
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // For mobile, ensure we don't exceed the container width
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const maxWidth = Math.min(containerWidth, window.innerWidth * 0.9);
      renderer.setSize(maxWidth, containerHeight);
    } else {
      renderer.setSize(containerWidth, containerHeight);
    }
    
    // Match the app's main background color for the clear color
    renderer.setClearColor(0xf3f4f6, 1); 
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio

    container.appendChild(renderer.domElement);

    // Explicitly set the canvas background style to match the app's bg
    renderer.domElement.style.backgroundColor = '#f3f4f6'; 

    // Make renderer element respect container bounds
    const rendererElement = renderer.domElement;
    rendererElement.style.maxWidth = "100%";
    rendererElement.style.maxHeight = "100%";
    rendererElement.style.display = "block";
    rendererElement.style.margin = "0 auto";

    // Event listeners for mouse interaction - make the entire container interactive
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("mousemove", handleDocumentMouseMove);
    
    // Initial simulated mouse movement to show interactivity - smoother version
    simulateInitialMouseMovement();
  }
  
  // Smoother initial mouse movement simulation
  function simulateInitialMouseMovement() {
    const timeline = gsap.timeline({ 
      repeat: 0,
      defaults: {
        ease: "sine.inOut" // Smoother easing
      }
    });
    
    // Slower, smoother movements
    timeline.to(targetMousePosition, {
      x: 0.4, // Less extreme values
      y: 0.4,
      duration: 2,
      onUpdate: updateMousePositionSmooth
    });
    
    timeline.to(targetMousePosition, {
      x: 0.6,
      y: 0.6,
      duration: 2,
      onUpdate: updateMousePositionSmooth
    });
    
    // Gentler circle movement
    timeline.to(targetMousePosition, {
      x: 0.6,
      y: 0.4,
      duration: 2,
      onUpdate: updateMousePositionSmooth
    });
    
    timeline.to(targetMousePosition, {
      x: 0.4,
      y: 0.6, 
      duration: 2,
      onUpdate: updateMousePositionSmooth
    });
    
    // Return to center more gently
    timeline.to(targetMousePosition, {
      x: 0.5,
      y: 0.5,
      duration: 1.5,
      onUpdate: updateMousePositionSmooth
    });
  }
  
  // Smoother position update function
  function updateMousePositionSmooth() {
    // Store previous position with interpolation for smoother trails
    prevPosition.x = prevPosition.x + (mousePosition.x - prevPosition.x) * 0.2;
    prevPosition.y = prevPosition.y + (mousePosition.y - prevPosition.y) * 0.2;
    
    // Update current position with a gentler ease factor
    mousePosition.x += (targetMousePosition.x - mousePosition.x) * 0.05;
    mousePosition.y += (targetMousePosition.y - mousePosition.y) * 0.05;
  }

  // Handle mouse movement anywhere on the page - with better constraints
  function handleDocumentMouseMove(event: MouseEvent) {
    const containerRect = container.getBoundingClientRect();
    
    // Calculate normalized coordinates relative to the container
    const x = (event.clientX - containerRect.left) / containerRect.width;
    const y = (event.clientY - containerRect.top) / containerRect.height;
    
    // Only update if the mouse is reasonably close to the container
    const margin = 2; // Allow tracking slightly outside container
    if (x >= -margin && x <= 1+margin && y >= -margin && y <= 1+margin) {
      // Use a lower ease factor for smoother outside tracking
      easeFactor = 0.01;
      
      // Store previous values with smoothing
      prevPosition.x = prevPosition.x + (mousePosition.x - prevPosition.x) * 0.1;
      prevPosition.y = prevPosition.y + (mousePosition.y - prevPosition.y) * 0.1;
      
      // Clamp values to avoid extreme movements
      targetMousePosition.x = Math.max(0, Math.min(1, x));
      targetMousePosition.y = Math.max(0, Math.min(1, y));
    }
  }

  // Handle mouse movement inside container - with smoother tracking
  function handleMouseMove(event: MouseEvent) {
    // Use a moderate ease factor for balance between responsiveness and smoothness
    easeFactor = 0.05;
    
    const rect = container.getBoundingClientRect();
    
    // Store previous values with smoothing
    prevPosition.x = prevPosition.x + (mousePosition.x - prevPosition.x) * 0.2;
    prevPosition.y = prevPosition.y + (mousePosition.y - prevPosition.y) * 0.2;
    
    // Calculate and clamp normalized coordinates
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    targetMousePosition.x = Math.max(0, Math.min(1, x));
    targetMousePosition.y = Math.max(0, Math.min(1, y));
  }

  // Add touch support for mobile devices
  function handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const rect = container.getBoundingClientRect();
      
      easeFactor = 0.05;
      prevPosition.x = prevPosition.x + (mousePosition.x - prevPosition.x) * 0.2;
      prevPosition.y = prevPosition.y + (mousePosition.y - prevPosition.y) * 0.2;
      
      targetMousePosition.x = (touch.clientX - rect.left) / rect.width;
      targetMousePosition.y = (touch.clientY - rect.top) / rect.height;
    }
  }

  function animate() {
    requestAnimationFrame(animate);

    // Calculate delta with a maximum change to avoid jolts
    const maxDelta = 0.05;
    
    // Smoothly update position with a maximum change per frame
    const deltaX = (targetMousePosition.x - mousePosition.x) * easeFactor;
    const deltaY = (targetMousePosition.y - mousePosition.y) * easeFactor;
    
    // Limit maximum movement per frame to avoid jolts
    mousePosition.x += Math.max(-maxDelta, Math.min(maxDelta, deltaX));
    mousePosition.y += Math.max(-maxDelta, Math.min(maxDelta, deltaY));
    
    // Ensure all values stay within bounds
    mousePosition.x = Math.max(0, Math.min(1, mousePosition.x));
    mousePosition.y = Math.max(0, Math.min(1, mousePosition.y));
    prevPosition.x = Math.max(0, Math.min(1, prevPosition.x));
    prevPosition.y = Math.max(0, Math.min(1, prevPosition.y));

    // Update shader uniforms with properly bounded values
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

  // Better window resizing handling
  function onWindowResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    
    // Update camera aspect
    camera.top = 1 / aspectRatio;
    camera.bottom = -1 / aspectRatio;
    camera.updateProjectionMatrix();
    
    // Update renderer size with the new approach
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // For mobile, ensure we don't exceed the container width
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const maxWidth = Math.min(containerWidth, window.innerWidth * 0.9);
      renderer.setSize(maxWidth, containerHeight);
    } else {
      renderer.setSize(containerWidth, containerHeight);
    }
    
    // Also update texture if needed for extreme size changes
    if (Math.abs(window.innerWidth/window.innerHeight - aspectRatio) > 0.2) {
      // Recreate texture if aspect ratio changes significantly
      const texture = createTextTexture("ヤベス", "Rampart One", null, "#ffffff");
      planeMesh.material.uniforms.u_texture.value = texture;
    }
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