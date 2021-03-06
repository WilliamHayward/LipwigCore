/**
 * @author: William Hayward
 */
import * as WebSocket from 'websocket';
import { Client } from './Client';
import { Message } from './Types';

export class User {
    private id: string;
    private socket: WebSocket.connection;
    private queue: Message[] = [];
    private client: Client;
    constructor(id: string, socket: WebSocket.connection) {
        this.id = id;

        if (socket === null) {
            throw new TypeError("User must have socket");
        }
        this.socket = socket;

        this.socket.on('close', (): void => {
            this.socket.removeAllListeners();
        });

        this.client = new Client(this);
    }

    public getID(): string {
        return this.id;
    }

    public getClient(): Client {
        return this.client;
    }

    public send(message: Message): void {
        if (this.socket === null) {
            this.queue.push(message);

            return;
        }
        const text: string = JSON.stringify(message);
        this.socket.sendUTF(text);
    }

    public reconnect(socket: WebSocket.connection): void {
        this.socket = socket;

        const reconnect: Message = {
            event: 'reconnected',
            data: [],
            sender: '',
            recipient: [this.id]
        };

        this.send(reconnect);

        this.queue.forEach((message: Message): void => {
            this.send(message);
        });

        this.queue = [];
    }

    public close(): void {
        this.socket.close();
    }

    public equals(socket: WebSocket.connection): boolean {
        return this.socket === socket;
    }
}
