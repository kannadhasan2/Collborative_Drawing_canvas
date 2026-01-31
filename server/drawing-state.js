class DrawingState {
    constructor() {
        this.operations = [];
        this.operationIndex = -1;
        this.canvasStates = new Map(); // roomId -> base64 image data
    }
    
    addOperation(roomId, operation) {
        if (!this.canvasStates.has(roomId)) {
            this.canvasStates.set(roomId, {
                operations: [],
                index: -1
            });
        }
        
        const roomState = this.canvasStates.get(roomId);
        
        // Remove any redo operations if we're not at the end
        if (roomState.index < roomState.operations.length - 1) {
            roomState.operations = roomState.operations.slice(0, roomState.index + 1);
        }
        
        // Add new operation
        roomState.operations.push({
            ...operation,
            timestamp: Date.now(),
            id: this.generateId()
        });
        
        roomState.index = roomState.operations.length - 1;
    }
    
    undo(roomId) {
        const roomState = this.canvasStates.get(roomId);
        if (!roomState || roomState.index < 0) return null;
        
        roomState.index--;
        return this.getCurrentState(roomId);
    }
    
    redo(roomId) {
        const roomState = this.canvasStates.get(roomId);
        if (!roomState || roomState.index >= roomState.operations.length - 1) return null;
        
        roomState.index++;
        return this.getCurrentState(roomId);
    }
    
    getCurrentState(roomId) {
        const roomState = this.canvasStates.get(roomId);
        if (!roomState) return null;
        
        // Return all operations up to current index
        return roomState.operations.slice(0, roomState.index + 1);
    }
    
    clear(roomId) {
        if (this.canvasStates.has(roomId)) {
            const roomState = this.canvasStates.get(roomId);
            roomState.operations = [];
            roomState.index = -1;
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // For conflict resolution
    resolveConflict(roomId, incomingOperation, existingOperations) {
        // Simple timestamp-based resolution
        // In production, you might want a more sophisticated CRDT approach
        const roomState = this.canvasStates.get(roomId);
        if (!roomState) return incomingOperation;
        
        // Find insertion point based on timestamp
        const insertionIndex = roomState.operations.findIndex(
            op => op.timestamp > incomingOperation.timestamp
        );
        
        if (insertionIndex === -1) {
            roomState.operations.push(incomingOperation);
        } else {
            roomState.operations.splice(insertionIndex, 0, incomingOperation);
        }
        
        roomState.index = roomState.operations.length - 1;
        
        return insertionIndex === -1 ? roomState.operations.length - 1 : insertionIndex;
    }
}

module.exports = DrawingState;