/**
 * @author: William Hayward
 */
import * as http from 'http';
import * as WebSocket from 'websocket';
import { ErrorCode } from './ErrorCode';
import { Room } from './Room';
import { User } from './User';
import { Utility } from './Utility';

type WebSocketMessage = {
    type: string; // tslint:disable-line:no-reserved-keywords
    utf8Data: string;
};

type Message = {
    event: string;
    data: any[]; // tslint:disable-line:no-any
    recipient: string[];
    sender: string;
};

type RoomMap = {
    [index: string]: Room;
};

type RoomOptions = {
    size: number;
};

export class Lipwig {
    private ws: WebSocket.server;
    private rooms: RoomMap;
    constructor(port: number = 8080) {
        const server: http.Server = http.createServer();
        server.listen(port, () => {
            console.log('Listening on ' + port);
        });

        this.ws = new WebSocket.server({
            httpServer: server,
            autoAcceptConnections: false
        });

        this.ws.on('request', this.newRequest);

        this.rooms = {};
    }

    private newRequest(request: WebSocket.request): void {
        if (!this.isOriginAllowed(request.origin)) {
            request.reject();

            return;
        }

        const connection: WebSocket.connection = request.accept('echo-protocol', request.origin);
        connection.on('message', (message: WebSocketMessage): void => {
            let parsed: Message;
            try {
                parsed = JSON.parse(message.utf8Data);
            } catch (error) {
                connection.send(ErrorCode.MALFORMED); // TODO: Determine a numerical system for errors/messages

                return;
            }
            const error: ErrorCode = this.handle(parsed, connection);
            if (error !== ErrorCode.SUCCESS) {
                // TODO: return error code
            }
        });

        return;
    }

    private isOriginAllowed(origin: string): boolean {
        // TODO: Origin checking
        return true;
    }

    private handle(message: Message, connection: WebSocket.connection): ErrorCode {
        switch (message.event) {
            case 'create':
                message.data.unshift(connection);

                return this.create.apply(message.data);
            case 'join':
                message.data.unshift(connection);

                return this.join.apply(message.data);
            default:
                return this.route(message);
        }
    }

    private route(message: Message): ErrorCode {
        const roomID: string = message.sender.slice(0, 4);
        const room: Room = this.rooms[roomID];

        if (room === undefined) {
            return ErrorCode.ROOMNOTFOUND;
        }

        return ErrorCode.SUCCESS;
    }

    private create(connection: WebSocket.connection, options?: RoomOptions): ErrorCode {
        let id: string;
        do {
            id = Utility.generateString();
        } while (this.rooms[id] !== undefined);

        const room: Room = new Room(id, connection);
        this.rooms[id] = room;

        return ErrorCode.SUCCESS;
    }

    private join(connection: WebSocket.connection, code: string): ErrorCode {
        const room: Room = this.rooms[code];

        if (room === undefined) {
            return ErrorCode.ROOMNOTFOUND;
        }

        return room.join(connection);
    }
}

const lw: Lipwig = new Lipwig();
