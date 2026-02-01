class DrawingCanvas{
    constructor(canvasId, overlayId){
        this.canvas = document.getElementById(canvasId)
        this.overlay = document.getElementById(overlayId)

        // Check canvas element present or not 
        if (!this.canvas || !this.overlay){
            console.error(`Canvas element missing ${canvasId,overlayId}`)
            return;
        }

        this.ctx = this.canvas.getContext('2d')
        this.overlayCtx = this.overlay.getContext('2d')
        
        // Drawing state
        this.isDrawing = false
        this.lastX = 0
        this.lastY = 0
        this.currentColor = '#3479e0';
        this.currentTool = 'brush'
        this.brushSize = 5

        // Shape drawing state
        this.shapeStartX = 0
        this.shapeStartY = 0
        this.isDrawingShape = false
        this.currentShape = null
        this.tempCanvas = null
        this.tempCtx = null

        // Local drawing history for undo/redo
        this.localHistory = [];
        this.historyIndex = -1;
        
        // Other users' cursors
        this.remoteCursors = new Map();

        this.setupCanvas()
        this.setupEventListeners()
        this.resizeCanvas()
        
        // Animation loop for FPS calculation
        this.lastTime = 0;
        this.fps = 60;
        this.frameCount = 0;
        this.startTime = performance.now();
        
        this.animate();
    }

    setupCanvas(){
        // Set Canvas size to match the container 
        const container = this.canvas.parentElement 
        this.canvas.width = container.clientWidth 
        this.canvas.height = container.clientHeight

        // setup Overlay canvas 
        this.overlay.width = container.clientWidth 
        this.overlay.height = container.clientHeight 

        //Create temp canvas for shape preview 
        this.tempCanvas = document.createElement('canvas') 
        this.tempCtx = this.tempCanvas.getContext('2d')
        this.tempCanvas.width = this.canvas.width 
        this.tempCanvas.height = this.canvas.height 

        // Set background to white
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Set line properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // save to history
        this.saveToHistory()
    }

    resizeCanvas() {
        const resizeHandler = () => {
            const container = this.canvas.parentElement;
            
            // Save current drawing to temp canvas
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            tempCtx.drawImage(this.canvas, 0, 0);
            
            // Resize main canvas
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            
            // Resize overlay canvas
            this.overlay.width = container.clientWidth;
            this.overlay.height = container.clientHeight;
            
            // Resize temp canvas
            this.tempCanvas.width = container.clientWidth;
            this.tempCanvas.height = container.clientHeight;
            
            // Restore drawing
            this.ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height,0, 0, this.canvas.width, this.canvas.height);
            
            // Clear overlay
            this.overlayCtx.clearRect(0, 0, this.overlay.width, this.overlay.height);
        };
        
        window.addEventListener('resize', resizeHandler.bind(this));
    }

    setupEventListeners(){
        this.canvas.addEventListener("mousedown",(event) => this.startDrawing(event) )
        this.canvas.addEventListener('mousemove', (event) => this.draw(event))
        this.canvas.addEventListener('mouseup', (event) => this.stopDrawing(event));
        this.canvas.addEventListener('mouseout',(event) => this.stopDrawing(event));

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    }

    getMousePosition(event){
        const rect = this.canvas.getBoundingClientRect()
        const scaleX = this.canvas.width / rect.width 
        const scaleY = this.canvas.height / rect.height 
        return {
            x:(event.clientX - rect.left) * scaleX,
            y:(event.clientY - rect.top)*scaleY
        }
    }

    updateMousePosition(event){
        const position = this.getMousePosition(event) 
        const mouseX = document.getElementById("mouse-x") 
        const mouseY = document.getElementById("mouse-y")
        if (mouseX && mouseY){
            mouseX.textContent = Math.round(position.x)
            mouseY.textContent = Math.round(position.y)
        }
    }

    startDrawing(event){
        const position = this.getMousePosition(event)
        this.isDrawing = true 
        this.lastX = position.x 
        this.lastY = position.y 
        this.shapeStartX = position.x;
        this.shapeStartY = position.y;
        if (this.currentTool === "line") {
            this.isDrawingShape = true
            this.currentShape = this.currentTool
            
            // Save current canvas state to temp canvas for preview
            this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
            this.tempCtx.drawImage(this.canvas, 0, 0)
        }
    }

    draw(event){
        if(!this.isDrawing){
            this.updateMousePosition(event)
            return
        }

        const position = this.getMousePosition(event)

        // Send cursor position to server
        console.log(window.websocketManager)
        if (window.websocketManager) {
            const rect = this.canvas.getBoundingClientRect()
            const displayX = event.clientX - rect.left
            const displayY = event.clientY - rect.top
            window.websocketManager.sendCursorPosition(displayX, displayY)
        }

        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.drawLine(this.lastX, this.lastY, position.x, position.y);
        } else if (this.isDrawingShape) {
            this.drawPreviewShape(position.x, position.y);
        }

        this.lastX = position.x 
        this.lastY = position.y 
        this.updateMousePosition(event)
    }

    drawLine(x1, y1, x2, y2) {
        // Draw on main canvas
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        
        if (this.currentTool === 'eraser') {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.globalCompositeOperation = 'source-over';
        }
        
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
        
        // Send drawing data to server
        if (window.websocketManager && window.websocketManager.isConnected) {
            const drawingData = {
                type: 'draw',
                tool: this.currentTool,
                color: this.currentColor,
                size: this.brushSize,
                points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
                compositeOperation: this.ctx.globalCompositeOperation
            };
            
            window.websocketManager.sendDrawing(drawingData);
        }
    }

     drawPreviewShape(x, y) {
        // Clear main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Restore saved state
        this.ctx.drawImage(this.tempCanvas, 0, 0);
        
        // Draw preview shape
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.fillStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        
        const startX = this.shapeStartX;
        const startY = this.shapeStartY;
        
        if (this.currentShape === 'line') {
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
        }
    }

    updateRemoteCursor(userId, x, y, color, username) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        this.remoteCursors.set(userId, { 
            x: x * scaleX, 
            y: y * scaleY, 
            color, 
            username, 
            lastUpdate: Date.now() 
        });
    }
    
    drawCursors() {
        // Clear overlay
        this.overlayCtx.clearRect(0, 0, this.overlay.width, this.overlay.height);
        
        const now = Date.now();
        
        // Remove stale cursors (older than 5 seconds)
        for (const [userId, cursor] of this.remoteCursors) {
            if (now - cursor.lastUpdate > 5000) {
                this.remoteCursors.delete(userId);
            }
        }
        
        // Draw all active cursors
        for (const [userId, cursor] of this.remoteCursors) {
            this.drawCursor(cursor.x, cursor.y, cursor.color, cursor.username);
        }
    }
    
    drawCursor(x, y, color, username) {
        // Draw cursor circle
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(x, y, 8, 0, Math.PI * 2);
        this.overlayCtx.fillStyle = color;
        this.overlayCtx.fill();
        this.overlayCtx.strokeStyle = '#ffffff';
        this.overlayCtx.lineWidth = 2;
        this.overlayCtx.stroke();
        
        // Draw username label
        this.overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.overlayCtx.font = '12px Arial';
        this.overlayCtx.textAlign = 'left';
        this.overlayCtx.fillText(username, x, y - 10);
    }


    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreFromHistory();
            
            // Send undo action to server
            if (window.websocketManager && window.websocketManager.isConnected) {
                window.websocketManager.sendAction('undo');
            }
        }
    }
    
    redo() {
        if (this.historyIndex < this.localHistory.length - 1) {
            this.historyIndex++;
            this.restoreFromHistory();
            
            // Send redo action to server
            if (window.websocketManager && window.websocketManager.isConnected) {
                window.websocketManager.sendAction('redo');
            }
        }
    }
    
    restoreFromHistory() {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = this.localHistory[this.historyIndex];
        
        this.updateUndoRedoButtons();
    }
    
    clearCanvas(){
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.localHistory = [];
        this.historyIndex = -1;
        this.saveToHistory();
        
        // Send clear action to server
        if (window.websocketManager && window.websocketManager.isConnected) {
            window.websocketManager.sendAction('clear');
        }
    }

    saveToHistory() {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.localHistory.length - 1) {
            this.localHistory = this.localHistory.slice(0, this.historyIndex + 1);
        }
        
        // Save current canvas state
        const dataUrl = this.canvas.toDataURL();
        this.localHistory.push(dataUrl);
        this.historyIndex++;
        
        // Limit history size
        if (this.localHistory.length > 50) {
            this.localHistory.shift();
            this.historyIndex--;
        }
        
        // Update UI
        this.updateUndoRedoButtons();
    }

    stopDrawing() {
        if (this.isDrawing && this.isDrawingShape) {
            // Finalize the shape
            this.isDrawingShape = false;
            
            // Save to history after shape is complete
            this.saveToHistory();
            
            // Send shape to server
            if (window.websocketManager && window.websocketManager.isConnected) {
                const shapeData = {
                    type: 'shape',
                    tool: this.currentShape,
                    color: this.currentColor,
                    size: this.brushSize,
                    start: { x: this.shapeStartX, y: this.shapeStartY },
                    end: { x: this.lastX, y: this.lastY }
                };
                
                window.websocketManager.sendDrawing(shapeData);
            }
        } else if (this.isDrawing) {
            // Save freehand drawing to history
            this.saveToHistory();
        }
        
        this.isDrawing = false;
        this.ctx.globalCompositeOperation = 'source-over';
    }

    setTool(tool){
        this.currentTool = tool 
        this.currentShape = tool 
        if (this.currentTool === 'eraser'){
            this.canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${this.brushSize * 2}" height="${this.brushSize * 2}" viewBox="0 0 ${this.brushSize * 2} ${this.brushSize * 2}"><circle cx="${this.brushSize}" cy="${this.brushSize}" r="${this.brushSize}" fill="white" stroke="black" stroke-width="1"/></svg>') ${this.brushSize} ${this.brushSize}, crosshair`;
        }else{
            this.canvas.style.cursor = "crosshair"
        }
    }

    setColor(color){
        this.currentColor = color
    }


    setBrushSize(size){
        this.brushSize = size 
        //update eraser cursor if the current tool is eraser 
        if(this.currentTool == "eraser"){
            this.setTool("eraser")
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
            undoBtn.classList.toggle('disabled', this.historyIndex <= 0);
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.localHistory.length - 1;
            redoBtn.classList.toggle('disabled', this.historyIndex >= this.localHistory.length - 1);
        }
    }

    animate() {
        const now = performance.now();
        this.frameCount++;        
        // Redraw cursors
        this.drawCursors();
        
        requestAnimationFrame(this.animate.bind(this));
    }
}