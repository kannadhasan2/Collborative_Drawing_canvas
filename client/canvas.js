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
        this.currentColor = '#ff1e00';
        this.currentTool = 'brush'
        this.brushSize = 5

        // Shape drawing state
        this.shapeStartX = 0
        this.shapeStartY = 0
        this.isDrawingShape = false
        this.currentShape = null
        this.tempCanvas = null
        this.tempCtx = null

        this.setupCanvas()
        this.setupEventListeners()
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

    }

    setupEventListeners(){
        this.canvas.addEventListener("mousedown",(event) => this.startDrawing(event) )
        this.canvas.addEventListener('mousemove', (event) => this.draw(event))

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
        
        if (['line'].includes(this.currentTool)) {
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
            //window.websocketManager.sendCursorPosition(displayX, displayY)
        }


        this.lastX = position.x 
        this.lastY = position.y 
        this.updateMousePosition(event)
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
}