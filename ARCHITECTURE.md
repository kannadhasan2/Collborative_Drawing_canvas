# Collaborative Canvas Architecture

## 1. High Level Design

┌───────────────────────────┐             Socket.IO            ┌───────────────────────────┐
│         Frontend          │ ◄──────────────────────────────► │           Backend         │
│         (Browser)         │                                  │          (Node.js)        │
│                           │                                  │                           │
│  ┌─────────────────────┐  │                                  │  ┌─────────────────────┐  │
│  │  UI Layer (DOM)     │  │                                  │  │ Socket.IO Gateway   │  │
│  │  - Tools/Colors     │  │                                  │  │ - connect/join      │  │
│  │  - Undo/Redo/Clear  │  │                                  │  │ - drawing events    │  │
│  └─────────┬───────────┘  │                                  │  └─────────┬───────────┘  │
│            │              │                                  │            │              │
│  ┌─────────▼───────────┐  │                                  │  ┌─────────▼───────────┐  │
│  │ DrawingCanvas       │  │                                  │  │ RoomManager         │  │
│  │ - Input + Rendering │  │                                  │  │ - Rooms/Users       │  │
│  │ - Overlay cursors   │  │                                  │  │ - Broadcast         │  │
│  │ - Local history     │  │                                  │  │ - Presence          │  │
│  └─────────┬───────────┘  │                                  │  └─────────┬───────────┘  │
│            │              │                                  │            │              │
│  ┌─────────▼───────────┐  │                                  │  ┌─────────▼───────────┐  │
│  │ WebSocketManager    │  │                                  │  │ DrawingState        │  │
│  │ - emit/receive      │  │                                  │  │ - Operations log    │  │
│  │ - cursor + drawing  │  │                                  │  │ - Undo/Redo index   │  │
│  └─────────────────────┘  │                                  │  └─────────────────────┘  │
└───────────────────────────┘                                  └───────────────────────────┘


## 2. Event Flow (Draw + Undo)

User draw (mousemove)
  │
  ▼
DrawingCanvas.drawLine()  ── renders locally
  │
  ├── emits: "drawing" (segment / op)
  ▼
WebSocketManager.sendDrawing()
  │
  ▼
Socket.IO Server
  │
  ▼
RoomManager.handleDrawing()
  │
  ├── DrawingState.addOperation(roomId, op)   (authoritative timeline)
  └── broadcast: "drawing" to other clients
        │
        ▼
Other client WebSocketManager.on("drawing")
  │
  ▼
DrawingCanvas.applyRemoteDrawing() ── renders remote op

Undo/Redo
  │
  ▼
UI → DrawingCanvas.undo() → sendAction("undo")
  │
  ▼
RoomManager.handleAction()
  │
  ├── ops = DrawingState.undo(roomId)
  └── emit: "state_update" { ops }
        │
        ▼
All clients clear + replay ops (consistent state)


--
## Client Events:
- **MouseDown** → Start drawing path
- **MouseMove** → Draw line segment
- **MouseUp** → End drawing path

## Data Serialization:
    ```javascript
        {
        type: 'draw',
        tool: 'brush',
        color: '#ff0000',
        size: 5,
        points: [{x: 100, y: 100}, {x: 110, y: 105}],
        compositeOperation: 'source-over',
        userId: 'user_123',
        timestamp: 1625097600000
        }
    ```

## Real-time Synchronization
- Client sends drawing event via WebSocket
- Server receives and validates
- Server broadcasts to all other clients in room
- Other clients apply drawing to their canvas
- All clients maintain consistent state

## Conflict Resolution
**Strategy:** Last Write Wins with Timestamp Ordering
- Each operation has a timestamp
- Operations are applied in timestamp order
- Concurrent edits are resolved by insertion order
- Client-side prediction for immediate feedback

### Client -> Server
```javascript
    // Join Room
    {
        type: 'join',
        userId: 'user_123',
        username: 'Kannadhasan',
        color: '#ff0000',
        roomId: 'room_abc'
    }

    // Cursor Update
    {
        type: 'cursor_update',
        x: 100,
        y: 150,
        userId: 'user_123',
        roomId: 'room_abc'
    }

    // Drawing Operation
    {
        type: 'drawing',
        tool: 'brush',
        color: '#ff0000',
        size: 5,
        points: [...],
        userId: 'user_123',
        roomId: 'room_abc',
        timestamp: 1625097600000
    }

    // Action (Undo/Redo/Clear)
    {
        type: 'action',
        action: 'undo', // 'undo', 'redo', 'clear'
        userId: 'user_123',
        roomId: 'room_abc'
    }
```

## Server -> Client
```javascript
    // User Joined
    {
        type: 'user_joined',
        user: { id, username, color },
        users: [...]
    }

    // User Left
    {
        type: 'user_left',
        user: { id, username },
        users: [...]
    }

    // Cursor Update
    {
        type: 'cursor_update',
        x: 100,
        y: 150,
        userId: 'user_123',
        username: 'Artist123',
        color: '#ff0000'
    }

    // Drawing Operation
    {
        type: 'drawing',
        tool: 'brush',
        color: '#ff0000',
        size: 5,
        points: [...],
        compositeOperation: 'source-over'
    }

    // Action
    {
        type: 'action',
        action: 'undo',
        userId: 'user_123'
    }

    // Canvas State
    {
        type: 'canvas_state',
        imageData: 'data:image/png;base64,...',
        historyLength: 10,
        historyIndex: 9
    }
```

### Challenges & Solutions

1. Concurrent Undo Conflicts
When User A undoes while User B draws
**Solution:** Operations are applied based on timestamp,Undo is treated as a special operation in the history

2. State Consistency
- All clients must have same operation history
- Server is source of truth for operation order
- Clients replay operations to reach consistent state

3. Performance
- Store operations, not full canvas states
- Operations are lightweight and serializable
- Limit history size to prevent memory issues