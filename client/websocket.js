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
        this.generateUserData()
        this.connect()
        
    }

    generateUserData(){
        // Generate random user ID
        this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
        let username = sessionStorage.getItem('username');
        if (!username) {
        username = prompt('Enter your Name') || 'Guest';
        sessionStorage.setItem('username', username);
        }
        this.username = username;
        
        // Generate random color
        const colors = ['red','blue','green','yellow','orange','violet','black','darkblue'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    connect() {
        // Connect to WebSocket server
        this.socket = io({
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        this.setupEventListeners();
    }

    setupEventListeners(){
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            // Join room with user info
            this.socket.emit('join', {
                userId: this.userId,
                username: this.username,
                color: this.color,
                roomId: this.roomId
            });
            
            // Request current canvas state
            this.socket.emit('request_state', { roomId: this.roomId });
            
            // Process any pending drawings
            this.processPendingDrawings();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus(false);
        });
        
        this.socket.on('user_joined', (data) => {
            console.log('User joined:', data);
            this.updateUsersList(data.users);
        });
        
        this.socket.on('user_left', (data) => {
            console.log('User left:', data);
            this.updateUsersList(data.users);
        });
        
        this.socket.on('cursor_update', (data) => {
            // Update remote cursor position
            if (window.canvas && data.userId !== this.userId) {
                window.canvas.updateRemoteCursor(
                    data.userId,
                    data.x,
                    data.y,
                    data.color,
                    data.username
                );
            }
        });
        
        this.socket.on('drawing', (data) => {
            // Apply drawing from another user
            this.applyRemoteDrawing(data);
        });
        
        this.socket.on('action', (data) => {
            // Handle global actions (undo/redo/clear)
            this.handleGlobalAction(data);
        });
        
        this.socket.on('canvas_state', (data) => {
            // Load initial canvas state
            this.loadCanvasState(data);
        });
        
        this.socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    processPendingDrawings() {
        if (!this.isConnected || this.isProcessing) return;
        
        this.isProcessing = true;
        
        while (this.pendingDrawings.length > 0) {
            const drawing = this.pendingDrawings.shift();
            this.socket.emit('drawing', drawing);
        }
        
        this.isProcessing = false;
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        const statusText = statusElement.querySelector('span') || statusElement;
        
        if (connected) {
            statusElement.className = 'status-indicator connected';
            statusText.innerHTML = '<i class="fas fa-circle"></i> Connected';
        } else {
            statusElement.className = 'status-indicator disconnected';
            statusText.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
        }
    }

}