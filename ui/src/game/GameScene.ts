import * as Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';

interface PlayerState {
  x: number;
  y: number;
  name: string;
}

export class GameScene extends Phaser.Scene {
  private players: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private playerTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private currentPlayer?: Phaser.GameObjects.Rectangle;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private room?: Room;
  private client: Client;
  private playerSpeed = 200;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private gameStarted = false;
  private errorText?: Phaser.GameObjects.Text;
  private sceneReady = false;
  private debugText?: Phaser.GameObjects.Text;
  private roomIdText?: Phaser.GameObjects.Text;
  private roomId: string = '';

  constructor() {
    super({ key: 'GameScene' });
    this.client = new Client('ws://localhost:3000');
    console.log('Game scene initialized');
  }

  preload() {
    console.log('Scene preloading...');
  }

  async create() {
    console.log('Creating game scene...');
    
    // Initialize keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    console.log('Keyboard controls initialized:', this.cursors);
    
    // Create debug text
    this.debugText = this.add.text(10, 10, '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000'
    });

    // Create room ID text
    this.roomIdText = this.add.text(400, 50, '', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000'
    }).setOrigin(0.5);
    
    // Create error text but hide it initially
    this.errorText = this.add.text(400, 300, '', {
      fontSize: '20px',
      color: '#ff0000',
      align: 'center'
    }).setOrigin(0.5).setVisible(false);

    // Create buttons
    const createButton = this.add.text(300, 550, 'Create Room', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 10, y: 5 }
    }).setInteractive();

    const joinButton = this.add.text(500, 550, 'Join Room', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#0000aa',
      padding: { x: 10, y: 5 }
    }).setInteractive();

    createButton.on('pointerdown', () => this.createAndJoinRoom());
    joinButton.on('pointerdown', () => {
      const roomId = prompt('Enter Room ID:');
      if (roomId) {
        this.joinRoom(roomId);
      }
    });

    // Mark scene as ready
    this.sceneReady = true;
    console.log('Scene is ready');
  }

  private async createAndJoinRoom() {
    try {
      this.roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      await this.joinRoom(this.roomId);
    } catch (error) {
      console.error('Error creating room:', error);
      this.showConnectionError('Failed to create room');
    }
  }

  private async joinRoom(roomId: string) {
    try {
      console.log('Attempting to join room:', roomId);
      this.connectionAttempts++;
      
      this.room = await this.client.joinOrCreate('game_room', { roomId });
      this.roomId = roomId;
      
      if (this.roomIdText) {
        this.roomIdText.setText(`Room ID: ${this.roomId}`);
      }
      
      console.log('Successfully joined room!', this.room.sessionId);

      // Wait for state to be synchronized
      await new Promise<void>((resolve) => {
        this.room?.onStateChange.once(() => {
          console.log('Initial state received');
          resolve();
        });
      });

      // Set up initial handlers
      this.setupRoomHandlers();
      this.gameStarted = true;

    } catch (error) {
      console.error("Connection error:", error);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`Retrying connection (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})...`);
        setTimeout(() => this.joinRoom(roomId), 1000);
      } else {
        this.showConnectionError();
      }
    }
  }

  private setupRoomHandlers() {
    if (!this.room) {
      console.error('Room is not initialized');
      this.showConnectionError('Failed to initialize game state');
      return;
    }

    try {
      console.log('Setting up room handlers...');
      console.log('Current room state:', this.room.state);

      // Process existing players
      console.log('Processing existing players...');
      if (this.room.state.players) {
        const entries = Array.from(this.room.state.players.entries()) as [string, PlayerState][];
        console.log('Current players:', entries);
        
        entries.forEach(([sessionId, player]: [string, PlayerState]) => {
          console.log('Processing player:', sessionId, player);
          if (!this.players.has(sessionId)) {
            this.addPlayer(player, sessionId);
          }
        });
      }

      // Set up message handlers
      this.room.onMessage("player_moved", (message) => {
        console.log('Received player_moved message:', message);
        const { sessionId, x, y } = message;
        
        if (sessionId !== this.room?.sessionId) {
          const player = this.players.get(sessionId);
          const text = this.playerTexts.get(sessionId);
          
          if (player && text) {
            player.setPosition(x, y);
            text.setPosition(x, y - 20);
          } else {
            console.warn(`Player ${sessionId} not found for position update`);
          }
        }
      });

      // Listen for room errors
      this.room.onError((code, message) => {
        console.error('Room error:', code, message);
        this.showConnectionError(`Game error: ${message}`);
      });

      // Listen for state changes
      this.room.onStateChange((state) => {
        console.log('Room state changed:', state);
        
        // Check for new players
        const currentPlayers = new Set(this.players.keys());
        state.players.forEach((player: PlayerState, sessionId: string) => {
          if (!currentPlayers.has(sessionId)) {
            console.log('New player detected:', sessionId);
            this.addPlayer(player, sessionId);
          } else {
            // Update existing player
            console.log('Updating existing player:', sessionId);
            this.updatePlayer(player, sessionId);
          }
        });

        // Check for removed players
        currentPlayers.forEach(sessionId => {
          if (!state.players.has(sessionId)) {
            console.log('Player removed:', sessionId);
            this.removePlayer(sessionId);
          }
        });
      });

      // Listen for disconnection
      this.room.onLeave((code) => {
        console.log('Left room:', code);
        this.handleDisconnect();
      });

      console.log('Room handlers setup complete. Total players:', this.players.size);

    } catch (error) {
      console.error('Error setting up room handlers:', error);
      this.showConnectionError('Error initializing game handlers');
    }
  }

  private updatePlayer(player: PlayerState, sessionId: string) {
    try {
      console.log('Updating player position:', sessionId, player);
      const rectangle = this.players.get(sessionId);
      const text = this.playerTexts.get(sessionId);
      
      if (rectangle && text) {
        // Lerp the position for smoother movement
        const currentX = rectangle.x;
        const currentY = rectangle.y;
        const targetX = player.x;
        const targetY = player.y;
        
        const lerpFactor = 0.5; // Adjust this value between 0 and 1 for different smoothing effects
        
        const newX = currentX + (targetX - currentX) * lerpFactor;
        const newY = currentY + (targetY - currentY) * lerpFactor;
        
        rectangle.setPosition(newX, newY);
        text.setPosition(newX, newY - 20);
        
        console.log(`Player ${sessionId} moved to:`, newX, newY);
      } else {
        console.warn('Player not found for update:', sessionId);
      }
    } catch (error) {
      console.error('Error updating player:', error);
    }
  }

  private handleDisconnect() {
    this.gameStarted = false;
    this.sceneReady = false;  // Reset scene ready state on disconnect
    this.clearAllPlayers();
    this.showConnectionError('Disconnected from server');
  }

  private clearAllPlayers() {
    this.players.forEach(rectangle => rectangle.destroy());
    this.playerTexts.forEach(text => text.destroy());
    this.players.clear();
    this.playerTexts.clear();
    this.currentPlayer = undefined;
  }

  private addPlayer(player: PlayerState, sessionId: string) {
    try {
      if (!this.sceneReady) {
        console.error('Scene is not ready, cannot add player');
        return;
      }

      // Check if player already exists
      if (this.players.has(sessionId)) {
        console.log('Player already exists:', sessionId);
        return;
      }

      console.log('Adding new player:', sessionId, player);
      console.log('Player position:', player.x, player.y);
      
      const rectangle = this.add.rectangle(player.x, player.y, 32, 32, 0x00ff00);
      const text = this.add.text(player.x, player.y - 20, player.name || `Player ${sessionId}`, { 
        fontSize: '16px',
        color: '#ffffff'
      });
      text.setOrigin(0.5);
      
      this.players.set(sessionId, rectangle);
      this.playerTexts.set(sessionId, text);

      if (sessionId === this.room?.sessionId) {
        this.currentPlayer = rectangle;
        rectangle.setFillStyle(0x00ff00); // Green for current player
        console.log('Current player initialized:', sessionId);
      } else {
        rectangle.setFillStyle(0xff0000); // Red for other players
        console.log('Other player initialized with red color:', sessionId);
      }

      console.log('Total players after add:', this.players.size);
      console.log('Players map:', Array.from(this.players.entries()));
    } catch (error) {
      console.error('Error adding player:', error);
    }
  }

  private removePlayer(sessionId: string) {
    const rectangle = this.players.get(sessionId);
    const text = this.playerTexts.get(sessionId);
    
    if (rectangle) {
      rectangle.destroy();
      this.players.delete(sessionId);
    }
    
    if (text) {
      text.destroy();
      this.playerTexts.delete(sessionId);
    }
  }

  private showConnectionError(message: string = 'Could not connect to game server.\nPlease try again later.') {
    if (this.errorText) {
      this.errorText.setText(message).setVisible(true);
    } else {
      console.error('Error text not initialized:', message);
    }
  }

  update() {
    if (!this.gameStarted || !this.currentPlayer || !this.cursors || !this.room) {
      if (this.debugText) {
        this.debugText.setText(`Game State:\nStarted: ${this.gameStarted}\nPlayer: ${!!this.currentPlayer}\nCursors: ${!!this.cursors}\nRoom: ${!!this.room}`);
      }
      return;
    }

    const velocity = { x: 0, y: 0 };

    if (this.cursors.left.isDown) {
      velocity.x = -this.playerSpeed;
    }
    if (this.cursors.right.isDown) {
      velocity.x = this.playerSpeed;
    }
    if (this.cursors.up.isDown) {
      velocity.y = -this.playerSpeed;
    }
    if (this.cursors.down.isDown) {
      velocity.y = this.playerSpeed;
    }

    if (velocity.x !== 0 || velocity.y !== 0) {
      const newX = this.currentPlayer.x + velocity.x * (this.game.loop.delta / 1000);
      const newY = this.currentPlayer.y + velocity.y * (this.game.loop.delta / 1000);
      
      // Update local position
      this.currentPlayer.setPosition(newX, newY);
      
      // Update player text position
      const currentPlayerText = this.playerTexts.get(this.room.sessionId);
      if (currentPlayerText) {
        currentPlayerText.setPosition(newX, newY - 20);
      }
      
      // Send position to server
      this.room.send("move", { x: newX, y: newY });
      
      // Update debug text
      if (this.debugText) {
        this.debugText.setText(
          `Local Player:\nPosition: (${Math.round(newX)}, ${Math.round(newY)})\n` +
          `Velocity: (${velocity.x}, ${velocity.y})\n` +
          `Players in room: ${this.players.size}`
        );
      }
    }
  }
} 