# Yabaesu

A real-time multiplayer draw and guess game built with Socket.IO, Three.js, and GSAP.

<div align="center">
  <!-- <img src="https://img.shields.io/badge/ヤベス-orange?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMCAxMCI+PC9zdmc+&logoColor=white&labelColor=black&color=ef4444" alt="ヤベス" height="150" /> -->
  <h1 style="font-size: 72px; color: #000000; text-shadow: 3px 3px 0 #ef4444;">ヤベス</h1>
</div>

## Features

- Interactive splash screen with Three.js text effect
- Real-time drawing and guessing with other players
- Matchmaking system to pair players
- Chat functionality 
- Turn-based gameplay with timer
- Mobile responsive design

## Tech Stack

### Client
- Vite
- TypeScript
- Tailwind CSS
- GSAP
- Three.js
- Socket.IO Client
- Zustand

### Server
- Bun
- TypeScript
- Express
- Socket.IO

### Deployment
- Vercel (Client)
- Railway (Server)

## Getting Started

### Prerequisites

- Node.js 16+ (or Bun)
- pnpm

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/yabaesu.git
cd yabaesu
```

2. Install dependencies
```bash
# For client
cd client
pnpm install

# For server
cd ../server
bun install
```

3. Set up environment variables
- Create `.env` file in both client and server directories based on the examples

4. Start development servers
```bash
# Client
cd client
pnpm dev

# Server
cd ../server
bun run dev
```

## License

This project is licensed under the "Buy Me a Beer" License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Special thanks to everyone who tested the game
- Inspiration from classic drawing games
- Built with ❤️ by Tinodaishe Tembo
