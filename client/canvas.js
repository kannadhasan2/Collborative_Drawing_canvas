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
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentColor = '#ff1e00';
        this.currentTool = 'brush';
        this.brushSize = 5;

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

    }

    setupEventListeners(){
        this.canvas.addEventListener("mousedown",(event) => this.startDrawing(event) )
        this.canvas.addEventListener('mousemove', (event) => this.updateMousePosition(event));

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
        
    }
}