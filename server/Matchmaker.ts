import { Socket } from "socket.io";
import { GameRoom } from "./GameRoom";
import { v4 as uuidv4 } from "uuid";

export class Matchmaker {
	private waitingPlayers: Map<string, Socket> = new Map();
	private gameRooms: Map<string, GameRoom> = new Map();

	public addPlayer(socket: Socket, username: string) {
		this.waitingPlayers.set(username, socket);
		this.tryMatchPlayers();
	}

	public removePlayer(username: string) {
		this.waitingPlayers.delete(username);
	}

	private tryMatchPlayers() {
		if (this.waitingPlayers.size >= 2) {
			const players = Array.from(this.waitingPlayers.entries());
			const roomId = uuidv4();
			const gameRoom = new GameRoom(roomId);

			// Take first two players
			for (let i = 0; i < 2; i++) {
				const [username, socket] = players[i];
				gameRoom.addPlayer(socket, username);
				this.waitingPlayers.delete(username);
			}

			this.gameRooms.set(roomId, gameRoom);
		}
	}

	public getRoom(roomId: string): GameRoom | undefined {
		return this.gameRooms.get(roomId);
	}

	public removeRoom(roomId: string) {
		this.gameRooms.delete(roomId);
	}

	public getWaitingPlayersCount(): number {
		return this.waitingPlayers.size;
	}
}
