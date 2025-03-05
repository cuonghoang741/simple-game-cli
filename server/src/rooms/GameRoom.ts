import { Room, Client } from "colyseus";
import { GameState, Player } from "./schema/GameState";

const MAX_DEATHS = 3;

export class GameRoom extends Room<GameState> {
  maxClients = 4;

  onCreate(options: any) {
    console.log("Room created with options:", options);
    this.roomId = options.roomId || 'default';
    this.setState(new GameState());

    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;

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

    this.onMessage("player_shoot", (client, data) => {
      // Validate the shooting player exists and is alive
      const shooter = this.state.players.get(client.sessionId);
      if (!shooter || !shooter.isAlive) return;

      // Broadcast the shot to all clients except the shooter
      this.broadcast("player_shoot", {
        sessionId: client.sessionId,
        startX: data.startX,
        startY: data.startY,
        directionX: data.directionX,
        directionY: data.directionY
      }, { except: client });
    });

    this.onMessage("player_hit", (client, data) => {
      // Get the hit player
      const hitPlayer = this.state.players.get(data.targetId);
      if (!hitPlayer || !hitPlayer.isAlive) return;

      // Reduce health
      hitPlayer.health -= 1;
      console.log(`Player ${data.targetId} hit, health: ${hitPlayer.health}`);

      // Check if player is dead
      if (hitPlayer.health <= 0) {
        hitPlayer.deathCount += 1;
        console.log(`Player ${data.targetId} died, death count: ${hitPlayer.deathCount}`);

        if (hitPlayer.deathCount >= MAX_DEATHS) {
          // Game over for this player
          hitPlayer.isAlive = false;
          console.log(`Player ${data.targetId} game over!`);
          
          // Broadcast game over message
          this.broadcast("player_game_over", {
            sessionId: data.targetId,
            deathCount: hitPlayer.deathCount
          });
        } else {
          // Respawn player with full health at random position
          hitPlayer.health = 10;
          hitPlayer.x = Math.floor(Math.random() * 400);
          hitPlayer.y = Math.floor(Math.random() * 400);
          
          // Broadcast respawn message
          this.broadcast("player_respawn", {
            sessionId: data.targetId,
            x: hitPlayer.x,
            y: hitPlayer.y,
            deathCount: hitPlayer.deathCount
          });
        }
      }
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
    player.health = 10;
    player.deathCount = 0;
    player.isAlive = true;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    console.log(client.sessionId, "left room:", this.roomId);
    this.state.players.delete(client.sessionId);
  }
} 