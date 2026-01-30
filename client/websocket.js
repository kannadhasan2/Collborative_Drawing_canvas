class WebSocketManager {
    constructor(){
        this.socket = null;
        this.userId = null;
        this.username = null;
        this.color = null;
        this.roomId = 'default';
        this.isConnected = false;
        this.pendingDrawings = [];
        this.isProcessing = false;
        
        this.init();
    }

    init(){
        this.connect()
    }

    connect() {
        // Connect to WebSocket server
        this.socket = io({
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        
    }

}