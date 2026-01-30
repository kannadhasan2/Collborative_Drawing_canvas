class UIManager {
    constructor() {
        this.currentColor = '#007aff';
        this.currentTool = 'brush';
        this.init();
    }

    init(){
        this.setupToolButtons()
        this.setupBrushSize()
    }

    setupToolButtons(){
        const tools = ["brush",'eraser','line']
        tools.forEach((tool) => {
            const button = document.getElementById(`tool-${tool}`)
            button.addEventListener('click', ()=>{
                // remove active class
                document.querySelectorAll('.tool-btn').forEach(btn => {
                    btn.classList.remove('active');
                });

                button.classList.add("active")
                this.currentTool = tool 
                if(window.canvas){
                    window.canvas.setTool(tool)
                }
            })
        })
    }

    setupBrushSize(){
        const brushSize = document.getElementById('brush-size')
        const brushSizeValue = document.getElementById("brush-size-value")

        brushSize.addEventListener('input', (event) =>{
            const size = event.target.value 
            brushSizeValue.textContent = `${size}px`
            //update canvas bursh size
            if (window.canvas) {
                window.canvas.setBrushSize(parseInt(size));
            }
        })
    }

}