class UIManager {
    constructor() {
        this.currentColor = '#007aff';
        this.currentTool = 'brush';
        this.init();
    }

    init(){
        this.setupToolButtons()
        this.setupBrushSize()
        this.setupColorPicker()
        this.setupActionButtons()
        this.setupUserInfo()
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

    
    setupColorPicker() {
        console.log(window.canvas)
        // Color palette
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all colors
                colorOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to clicked color
                option.classList.add('active');
                
                // Update current color
                const color = option.getAttribute('data-color');
                this.currentColor = color;
                
                // Update color picker
                document.getElementById('color-picker').value = color;
                
                // Update canvas color
                if (window.canvas) {
                    window.canvas.setColor(color);
                }
            });
        });
        
        // Set default color as active
        const defaultColor = document.querySelector('.color-option[data-color="#007aff"]');
        if (defaultColor) {
            defaultColor.classList.add('active');
        }
        
        // Color picker
        
        const colorPicker = document.getElementById('color-picker');
        colorPicker.addEventListener('input', (event) => {
            const color = event.target.value
            this.currentColor = color
            
            // Remove active class from palette colors
            colorOptions.forEach(opt => opt.classList.remove('active'))
            
            // Update canvas color
            if (window.canvas) {
                window.canvas.setColor(color)
            }
        });
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

    setupActionButtons(){
        const undoBtn = document.getElementById('undo-btn')
        if(undoBtn){
            undoBtn.addEventListener('click',()=>{
                if(window.canvas){
                    window.canvas.undo()
                }
            })
        }

        const redoBtn = document.getElementById('redo-btn')
        if(redoBtn){
            redoBtn.addEventListener('click',()=>{
                if(window.canvas){
                    window.canvas.redo()
                }
            })
        }

        const clearBtn = document.getElementById('clear-btn')
        if(clearBtn){
            clearBtn.addEventListener('click',()=>{
                if(window.canvas){
                    window.canvas.clearCanvas()
                }
            })
        }
    }

    setupUserInfo() {
        const usernameDisplay = document.createElement('div')
        usernameDisplay.className = 'user-info'
        usernameDisplay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${window.websocketManager?.color || '#007aff'};"></div>
                <span>${sessionStorage.getItem('username') || 'Guest'}</span>
            </div>
        `;
        
        const statusDiv = document.querySelector('.status')
        statusDiv.appendChild(usernameDisplay)
    }

}