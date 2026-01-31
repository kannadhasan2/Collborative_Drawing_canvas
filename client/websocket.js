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
        if (!username || username === 'Guest') {
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

    sendCursorPosition(x, y) {
        if (this.isConnected) {
            this.socket.emit('cursor_update', {
                x,
                y,
                userId: this.userId,
                username: this.username,
                color: this.color,
                roomId: this.roomId
            });
        }
    }

    loadCanvasState(data) {
        if (!window.canvas || !data || !data.imageData) return;
        
        const img = new Image();
        img.onload = () => {
            window.canvas.ctx.clearRect(0, 0, window.canvas.canvas.width, window.canvas.canvas.height);
            window.canvas.ctx.drawImage(img, 0, 0);
            
            // Reset history
            window.canvas.localHistory = [window.canvas.canvas.toDataURL()];
            window.canvas.historyIndex = 0;
            window.canvas.updateUndoRedoButtons();
        };
        img.src = data.imageData;
    }

    sendDrawing(drawingData) {
        const drawingPacket = {
            ...drawingData,
            userId: this.userId,
            roomId: this.roomId,
            timestamp: Date.now()
        };
        
        if (this.isConnected) {
            this.socket.emit('drawing', drawingPacket);
        } else {
            // Store drawing locally until connected
            this.pendingDrawings.push(drawingPacket);
        }
    }

     applyRemoteDrawing(data) {
        if (!window.canvas) return;
        
        const ctx = window.canvas.ctx;
        
        // Save current context state
        const savedStrokeStyle = ctx.strokeStyle;
        const savedLineWidth = ctx.lineWidth;
        const savedCompositeOperation = ctx.globalCompositeOperation;
        
        // Apply drawing
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.globalCompositeOperation = data.compositeOperation || 'source-over';
        
        if (data.type === 'draw') {
            ctx.beginPath();
            ctx.moveTo(data.points[0].x, data.points[0].y);
            ctx.lineTo(data.points[1].x, data.points[1].y);
            ctx.stroke();
        } else if (data.type === 'shape') {
            ctx.beginPath();
            
            switch (data.tool) {
                case 'rectangle':
                    const width = data.end.x - data.start.x;
                    const height = data.end.y - data.start.y;
                    ctx.fillRect(data.start.x, data.start.y, width, height);
                    break;
                    
                case 'circle':
                    const radius = Math.sqrt(
                        Math.pow(data.end.x - data.start.x, 2) + 
                        Math.pow(data.end.y - data.start.y, 2)
                    );
                    ctx.arc(data.start.x, data.start.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'line':
                    ctx.moveTo(data.start.x, data.start.y);
                    ctx.lineTo(data.end.x, data.end.y);
                    ctx.stroke();
                    break;
            }
        }
        
        // Restore context state
        ctx.strokeStyle = savedStrokeStyle;
        ctx.lineWidth = savedLineWidth;
        ctx.globalCompositeOperation = savedCompositeOperation;
        
        // Update local history
        window.canvas.saveToHistory();
    }

    handleGlobalAction(data) {
        if (!window.canvas) return;
        
        switch (data.action) {
            case 'undo':
                window.canvas.undo();
                break;
            case 'redo':
                window.canvas.redo();
                break;
            case 'clear':
                window.canvas.clearCanvas();
                break;
        }
    }

    sendAction(action) {
        if (this.isConnected) {
            this.socket.emit('action', {
                action,
                userId: this.userId,
                roomId: this.roomId,
                timestamp: Date.now()
            });
        }
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

    updateUsersList(users) {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        // Update user count
        document.getElementById('user-count').textContent = users.length;
        
        // Add current user first
        const currentUser = users.find(u => u.id === this.userId) || {
            id: this.userId,
            username: this.username,
            color: this.color
        };
        
        this.addUserToList(currentUser, true);
        
        // Add other users
        users.forEach(user => {
            if (user.id !== this.userId) {
                this.addUserToList(user, false);
            }
        });
    }
    
    addUserToList(user, isCurrent) {
        const usersList = document.getElementById('users-list');
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <div class="user-color" style="background-color: ${user.color};"></div>
            <div class="user-name">
                ${user.username} ${isCurrent ? '(You)' : ''}
            </div>
        `;
        usersList.appendChild(userElement);
    }

}