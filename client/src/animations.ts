import { gsap } from "gsap";

/**
 * Creates a minimal loading animation with three colored dots inside a target element.
 * @param targetElement The parent HTMLElement to append the loading dots to.
 * @returns The GSAP Tween instance for the animation (can be used to kill the animation).
 */
export function createLoadingAnimation(targetElement: HTMLElement): gsap.core.Tween {
  // Clear any previous content
  targetElement.innerHTML = ''; 
  
  // Style the target container if not already done
  targetElement.style.display = "flex";
  targetElement.style.gap = "6px";
  targetElement.style.justifyContent = "center";
  targetElement.style.alignItems = "center";

  // Define the dot colors based on the app theme
  const dotColors = ["#ef4444", "#000000", "#cccccc"]; // Red, Black, Light Grey

  // Create 3 dots for the animation with theme colors
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.borderRadius = "50%";
    dot.style.backgroundColor = dotColors[i % dotColors.length]; // Use theme colors
    dot.style.opacity = "0.3"; // Start semi-transparent
    targetElement.appendChild(dot);
  }

  // Create and return the GSAP animation tween
  const tween = gsap.fromTo(targetElement.children, 
    { y: -3, opacity: 0.3 }, 
    { 
      y: 3, 
      opacity: 1, 
      duration: 0.6, 
      repeat: -1, 
      yoyo: true, 
      ease: "sine.inOut",
      stagger: 0.2 // Stagger the animation for each dot
    }
  );
  
  return tween;
} 