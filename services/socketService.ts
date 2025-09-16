// // service/socketService.ts

// import { io, Socket } from 'socket.io-client';

// const SOCKET_URL = 'https://social-backend-y1rg.onrender.com'; // Replace with your actual backend URL

// class SocketService {
//   private socket: Socket | null = null;
//   private currentToken: string | null = null;

//   connect(token: string): void {
//     if (this.socket?.connected && this.currentToken === token) {
//       console.log('Socket already connected with the same token');
//       return;
//     }

//     if (!token) {
//       console.log('Socket connection aborted: No auth token.');
//       return;
//     }

//     // Disconnect existing socket if it exists
//     if (this.socket) {
//       this.socket.disconnect();
//     }

//     console.log('Attempting to connect to socket server...');
//     this.currentToken = token;
//     this.socket = io(SOCKET_URL, {
//       auth: {
//         token: token, // Pass the JWT for authentication
//       },
//       transports: ['websocket'], // More reliable for mobile
//       autoConnect: true,
//       reconnection: true,
//       reconnectionAttempts: 5,
//       reconnectionDelay: 1000,
//     });

//     this.socket.on('connect', () => {
//       console.log('✅ Socket connected successfully:', this.socket?.id);
//     });

//     this.socket.on('connect_error', (err) => {
//       console.error('❌ Socket connection error:', err.message);
//     });

//     this.socket.on('disconnect', (reason) => {
//       console.log('🔌 Socket disconnected:', reason);
//       this.socket = null;
//     });
//   }

//   disconnect(): void {
//     if (this.socket) {
//       console.log('🔌 Disconnecting socket...');
//       this.socket.disconnect();
//       this.socket = null;
//       this.currentToken = null;
//     }
//   }

//   getSocket(): Socket | null {
//     return this.socket;
//   }

//   isConnected(): boolean {
//     return this.socket?.connected || false;
//   }

//   reconnect(): void {
//     if (this.currentToken) {
//       console.log('🔄 Attempting to reconnect socket...');
//       this.connect(this.currentToken);
//     } else {
//       console.warn('Cannot reconnect: No token available');
//     }
//   }
// }

// export const socketService = new SocketService();









// service/socketService.ts

import { io, Socket } from 'socket.io-client';

// Your backend URL
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com';

class SocketService {
    // The single socket instance for the entire application
    private socket: Socket;

    /**
     * The constructor initializes the socket instance once, but does not connect.
     */
    constructor() {
        this.socket = io(SOCKET_URL, {
            // Do NOT connect automatically. We will call .connect() manually after setting the auth token.
            autoConnect: false,
            // Use websocket transport for better reliability on mobile
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        // Centralized logging for socket events
        this.socket.on('connect', () => {
            console.log('✅ [SocketService] Connected successfully. Socket ID:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 [SocketService] Disconnected:', reason);
        });

        this.socket.on('connect_error', (err) => {
            // This is a critical error to watch for
            console.error('❌ [SocketService] Connection Error:', err.message, err.cause);
        });
    }

    /**
     * Connects the socket with the user's auth token.
     * This should be called once after login or when the app initializes with a valid token.
     * @param {string} token The user's JWT.
     */
    connect(token: string): void {
        if (!token) {
            console.error('[SocketService] Connect failed: Token is missing.');
            return;
        }
        
        // If we are already connected, we don't need to do anything.
        if (this.socket.connected) {
            console.log('[SocketService] Already connected.');
            return;
        }

        // Set the auth token in the handshake before connecting. This is the crucial step.
        this.socket.auth = { token };

        // Now, manually connect.
        this.socket.connect();
    }

    /**
     * Disconnects the socket. This should be called on logout.
     */
    disconnect(): void {
        if (this.socket.connected) {
            this.socket.disconnect();
        }
    }

    /**
     * Returns the single, persistent socket instance.
     * @returns {Socket} The socket instance.
     */
    getSocket(): Socket {
        return this.socket;
    }
}

// Export the single instance to be used throughout the app
export const socketService = new SocketService();