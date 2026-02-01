# Real-Time Collaborative Drawing Canvas

A real-time collaborative drawing application where multiple users can draw simultaneously on the same canvas with live synchronization.

## Features

### Core Features
- **Real-time Drawing**: See others' drawings as they happen
- **Multiple Tools**: Brush, eraser, rectangle, circle, line
- **Color Palette**: Predefined colors + custom color picker
- **Brush Size Control**: Adjustable brush/eraser size
- **User Presence**: See who's online and their cursor positions
- **Global Undo/Redo**: Undo and redo actions affect all users
- **Canvas Clearing**: Clear the canvas for all users
- **Multiple Rooms:** Support for isolated drawing rooms

### Technical Features
- **Real-time Sync**: Using WebSocket (Socket.io)
- **Efficient Canvas Operations**: Optimized drawing paths
- **Client-side Prediction**: Smooth drawing experience
- **Conflict Resolution**: Timestamp-based operation ordering
- **Connection Management**: Automatic reconnection

## Setup Instructions

### Prerequisites
- Node.js 14+ installed
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone or download the repository
2. Navigate to the project directory:
   ```bash
   cd collaborative-canvas
3. Install Dependicies 
    ```bash 
    npm install
4. Start the server
    ```bash 
    npm start 
    (or)
    npm run dev
5. Open your browser and navigate to
    ```bash 
    http://localhost:3000 

### Testing with Multiple Users
- Open the application in one browser window/tab
- Open the same URL in another browser window/tab (or different browser/device)
- Draw in one window - see it appear in real-time in the other
- Test multiple users drawing simultaneously
- Test undo/redo functionality across users

### Keyboard Shortcuts
- **Ctrl+Z:** Undo
- **Ctrl+Shift+Z or Ctrl+Y:** Redo

### Limitations
- **Canvas Size:** Fixed to container size, doesn't support infinite canvas
- **Performance:** May experience lag with very complex drawings on low-end devices
- **Mobile Support:** Basic touch support but not fully optimized for mobile
- **Offline Mode:** Drawing while disconnected is queued but not persisted

### Time Spent
- **Planning & Architecture:** 5 hours
- **Frontend Implementation:** 18 hours
- **Backend Implementation:** 11 hours
- **Real-time Sync:** 4 hours
- **Testing & Debugging:** 3 hours
- **Documentation:** 2 hours
- **Total:** Approximately 43 hours

### Troubleshooting
- **Connection Failed:** Ensure the server is running on port 3000
- **Drawing Not Syncing:** Check browser console for WebSocket errors
- **High Latency:** Close other bandwidth-intensive applications
- **Canvas Not Loading:** Clear browser cache and reload