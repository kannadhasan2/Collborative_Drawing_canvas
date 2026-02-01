class RoomManager {
    constructor(io,drawState) {
        this.io = io;
        this.rooms = new Map(); // roomId -> Room object
        this.users = new Map(); // socketId -> User object
        this.drawState = drawState;
        this.setupSocketHandlers();
    }

    setupSocketHandlers(){
        this.io.on('connection',(socket)=>{
            console.log(`New Connection: ${socket.id}`)

            //Join room 
            socket.on('join',(data)=>{
                this.handleJoin(socket,data)
            })

            // Request State 
            socket.on("request_state",(data)=>{
                this.handleRequestState(socket,data)
            })

            //Cursor Update 
            socket.on('cursor_update',(data)=>{
                this.handleCursorUpdate(socket,data)
            })

            //Drawing 
            socket.on('drawing',(data)=>{
                this.handleDrawing(socket,data)
            })

            //Action 
            socket.on('action',(data)=>{
                this.handleAction(socket,data)
            })

            //Disconnect 
            socket.on("disconnect",()=>{
                this.handleDisconnect(socket)
            })
        })
    }

    handleJoin(socket, data) {
        const { userId, username, color, roomId = 'default' } = data;
        
        // Create room if it doesn't exist
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                users: new Map(),
                drawingHistory: [],
                currentState: null,
                historyIndex: -1
            });
        }
        
        const room = this.rooms.get(roomId);
        
        // Store user info
        const user = {
            id: userId,
            socketId: socket.id,
            username,
            color,
            roomId,
            joinedAt: Date.now()
        };
        
        this.users.set(socket.id, user);
        room.users.set(userId, user);
        
        // Join socket room
        socket.join(roomId);
        
        // Broadcast user joined to room
        socket.to(roomId).emit('user_joined', {
            user: {
                id: userId,
                username,
                color
            },
            users: this.getRoomUsers(roomId)
        });
        
        // Send current room state to the new user
        socket.emit('room_state', {
            users: this.getRoomUsers(roomId),
            historyLength: room.drawingHistory.length,
            historyIndex: room.historyIndex
        });
        
        console.log(`User ${username} (${userId}) joined room ${roomId}`);
    }

    handleRequestState(socket, data) {
        const { roomId } = data;
        const room = this.rooms.get(roomId);
        
        if (!room) return;
        
        // Send current canvas state
        socket.emit('canvas_state', {
            imageData: room.currentState,
            historyLength: room.drawingHistory.length,
            historyIndex: room.historyIndex
        });
    }

    handleCursorUpdate(socket, data) {
        const { x, y, userId, username, color, roomId } = data;
        const user = this.users.get(socket.id);
        
        if (!user) return;
        
        // Broadcast cursor position to other users in the room
        socket.to(roomId).emit('cursor_update', {
            x, y, userId, username, color
        });
    }

    handleDrawing(socket, data) {
        const { userId, roomId, ...drawingData } = data;
        const room = this.rooms.get(roomId);
        
        if (!room) return;
        
        // Add to drawing history
        room.drawingHistory.push({
            ...drawingData,
            userId,
            timestamp: Date.now()
        });
        
        room.historyIndex = room.drawingHistory.length - 1;

        this.drawState.addOperation(roomId, drawingData);

        
        // Broadcast to other users in the room
        socket.to(roomId).emit('drawing', drawingData);

    }

    handleAction(socket, data) {
        const { action, userId, roomId } = data;
        const room = this.rooms.get(roomId);
        
        if (!room) return;
        
        console.log(`Action ${action} from user ${userId} in room ${roomId}`);
        
        switch (action) {
            case 'undo':
                if (room.historyIndex >= 0) {
                    room.historyIndex--;
                    
                    // Notify all users in room
                    this.io.to(roomId).emit('action', {
                        action: 'undo',
                        userId,
                        historyIndex: room.historyIndex
                    });
                }
                break;
                
            case 'redo':
                if (room.historyIndex < room.drawingHistory.length - 1) {
                    room.historyIndex++;
                    
                    // Notify all users in room
                    this.io.to(roomId).emit('action', {
                        action: 'redo',
                        userId,
                        historyIndex: room.historyIndex
                    });
                }
                break;
                
            case 'clear':
                // Clear drawing history
                room.drawingHistory = [];
                room.historyIndex = -1;
                room.currentState = null;
                
                // Notify all users in room
                this.io.to(roomId).emit('action', {
                    action: 'clear',
                    userId
                });
                break;
        }

        const ops = this.drawState.undo(roomId);
        this.io.to(roomId).emit("state_update", ops);
    }

    handleDisconnect(socket) {
        const user = this.users.get(socket.id);
        
        if (!user) return;
        
        const { id: userId, username, roomId } = user;
        const room = this.rooms.get(roomId);
        
        if (room) {
            // Remove user from room
            room.users.delete(userId);
            
            // If room is empty, clean it up
            if (room.users.size === 0) {
                this.rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            } else {
                // Broadcast user left to room
                this.io.to(roomId).emit('user_left', {
                    user: { id: userId, username },
                    users: this.getRoomUsers(roomId)
                });
            }
        }
        
        // Remove user from global map
        this.users.delete(socket.id);
        
        console.log(`User ${username} (${userId}) disconnected`);
    }
    
    getRoomUsers(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        
        return Array.from(room.users.values()).map(user => ({
            id: user.id,
            username: user.username,
            color: user.color
        }));
    }

    getRoomState(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        return {
            users: this.getRoomUsers(roomId),
            drawingHistory: room.drawingHistory,
            historyIndex: room.historyIndex,
            currentState: room.currentState
        };
    }
}

module.exports = RoomManager