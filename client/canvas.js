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
    }
}