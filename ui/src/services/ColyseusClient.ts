import { Client, Room } from 'colyseus.js';
import { EventBus } from '../game/EventBus';
import { ENV } from '../configs/env';

// Environment variables
const COLYSEUS_SERVER_URL = ENV.COLYSEUS_SERVER_URL || 'ws://localhost:2567';

class ColyseusClientService {
    private client: Client;
    private room: Room | null = null;
    private isConnected: boolean = false;

    constructor() {
        this.client = new Client(COLYSEUS_SERVER_URL);
        console.log(`Colyseus client initialized with server URL: ${COLYSEUS_SERVER_URL}`);
    }

    async connect(roomName: string, options: any = {}): Promise<Room> {
        try {
            console.log(`Connecting to room: ${roomName}`);
            this.room = await this.client.joinOrCreate(roomName, options);
            this.isConnected = true;
            
            // Set up event listeners
            this.setupRoomListeners();
            
            // Notify the game that we're connected
            EventBus.emit('colyseus-connected', this.room);
            
            console.log(`Successfully connected to ${roomName}`);
            return this.room;
        } catch (error) {
            console.error(`Error connecting to room ${roomName}:`, error);
            EventBus.emit('colyseus-error', error);
            throw error;
        }
    }

    private setupRoomListeners() {
        if (!this.room) return;

        // Listen for state changes
        this.room.onStateChange((state) => {
            EventBus.emit('colyseus-state-change', state);
        });

        // Listen for messages from the server
        this.room.onMessage('*', (type, message) => {
            EventBus.emit(`colyseus-message-${type}`, message);
        });

        // Handle disconnection
        this.room.onLeave((code) => {
            this.isConnected = false;
            EventBus.emit('colyseus-disconnected', code);
            console.log(`Left room. Code: ${code}`);
        });

        // Handle errors
        this.room.onError((code, message) => {
            EventBus.emit('colyseus-error', { code, message });
            console.error(`Room error - Code: ${code}, Message: ${message}`);
        });
    }

    send(type: string, message: any): void {
        if (!this.room || !this.isConnected) {
            console.warn('Cannot send message: not connected to a room');
            return;
        }
        this.room.send(type, message);
    }

    getRoom(): Room | null {
        return this.room;
    }

    isConnectedToRoom(): boolean {
        return this.isConnected;
    }

    disconnect(): void {
        if (this.room && this.isConnected) {
            this.room.leave();
            this.isConnected = false;
        }
    }
}

// Export as a singleton
export const colyseusClient = new ColyseusClientService(); 