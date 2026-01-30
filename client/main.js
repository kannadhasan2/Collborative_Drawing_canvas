// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize drawing canvas
        window.canvas = new DrawingCanvas('drawing-canvas', 'cursor-overlay');
        
        if (!window.canvas.canvas || !window.canvas.overlay) {
            throw new Error('Failed to initialize canvas. Canvas elements not found.');
        }
        
        console.log('Collaborative Canvas initialized successfully!');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Show error notification to user
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff3b30;
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10000;
            text-align: center;
        `;
        notification.innerHTML = `
            <h3>Initialization Error</h3>
            <p>${error.message}</p>
            <p>Please refresh the page.</p>
        `;
        document.body.appendChild(notification);
    }
});