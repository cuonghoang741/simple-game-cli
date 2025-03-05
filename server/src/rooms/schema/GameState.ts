import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = Math.floor(Math.random() * 400);
  @type("number") y: number = Math.floor(Math.random() * 400);
  @type("string") name: string = "";
  @type("number") score: number = 0;
}

export class GameState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();
} 