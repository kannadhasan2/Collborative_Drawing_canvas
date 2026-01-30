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

        this.setupEventListeners()
    }

    setupEventListeners(){
        this.canvas.addEventListener('mousemove', this.updateMousePosition.bind(this));

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
}