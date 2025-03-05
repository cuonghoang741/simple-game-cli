import { Room, Client } from "colyseus";
import { GameState, Player } from "./schema/GameState";

export class GameRoom extends Room<GameState> {
  maxClients = 4;

  onCreate(options: any) {
    console.log("Room created with options:", options);
    this.roomId = options.roomId || 'default';
    this.setState(new GameState());

    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        console.warn(`Player ${client.sessionId} not found for move update`);
        return;
      }

      // Log the movement data
      console.log(`Player ${client.sessionId} moving to:`, data);

      // Update player position
      player.x = data.x;
      player.y = data.y;

      // Broadcast the movement to all clients except the sender
      this.broadcast("player_moved", {
        sessionId: client.sessionId,
        x: data.x,
        y: data.y
      }, { except: client });
    });

    this.onMessage("update_name", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.name = data.name;
    });
  }

  onJoin(client: Client) {
    console.log(client.sessionId, "joined room:", this.roomId);
    const player = new Player();
    player.name = `Player ${this.clients.length}`;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    console.log(client.sessionId, "left room:", this.roomId);
    this.state.players.delete(client.sessionId);
  }
} 