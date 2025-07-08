// Sistema de archivos virtual
const fileSystem = {
    root: {
        name: 'Proyecto',
        type: 'folder',
        children: [
            {
                name: 'index.html',
                type: 'file',
                content: `<!DOCTYPE html>
<html>
<head>
    <title>Mi Página</title>
</head>
<body>
    <h1>Bienvenido a SubCode X</h1>
</body>
</html>`,
                language: 'html'
            },
            {
                name: 'estilos.css',
                type: 'file',
                content: `body {
    background-color: #f0f0f0;
    font-family: Arial, sans-serif;
}`,
                language: 'css'
            },
            {
                name: 'script.subx',
                type: 'file',
                content: `# Programa de ejemplo
decir "Hola desde SubCode X"
variable nombre = "Visitante"
decir "Bienvenido " + nombre

# Crear página web
pagina "index.html"
titulo "Mi Página Web"
estilo "body { background: #222; color: white; }"
elemento "h1" "Bienvenido a SubCode X"
elemento "p" "Esta página fue creada con SubCode X"
consola "Página generada correctamente"`,
                language: 'subx'
            },
            {
                name: 'carpeta-1',
                type: 'folder',
                children: []
            }
        ]
    },
    currentFile: null,
    openTabs: []
};

const editor = document.getElementById('codeEditor');
const lineNumbers = document.getElementById('lineNumbers');
const outputContainer = document.getElementById('outputContainer');
const lineCountSpan = document.getElementById('lineCount');
const charCountSpan = document.getElementById('charCount');
const fileTypeSpan = document.getElementById('fileType');
const currentFileNameSpan = document.getElementById('currentFileName');
const fileTree = document.getElementById('fileTree');
const tabsContainer = document.getElementById('tabsContainer');
const webPreview = document.getElementById('webPreview');
const previewInfo = document.getElementById('previewInfo');
const statusMessage = document.getElementById('statusMessage');

const editHistory = {
    stack: {},
    index: {},
    
    saveState: function(filePath, content) {
        if (!this.stack[filePath]) {
            this.stack[filePath] = [];
            this.index[filePath] = -1;
        }
        
        if (this.index[filePath] < this.stack[filePath].length - 1) {
            this.stack[filePath] = this.stack[filePath].slice(0, this.index[filePath] + 1);
        }
        
        this.stack[filePath].push(content);
        this.index[filePath] = this.stack[filePath].length - 1;
    },
    
    undo: function(filePath) {
        if (!this.stack[filePath] || this.index[filePath] <= 0) return null;
        
        this.index[filePath]--;
        return this.stack[filePath][this.index[filePath]];
    },
    
    redo: function(filePath) {
        if (!this.stack[filePath] || this.index[filePath] >= this.stack[filePath].length - 1) return null;
        
        this.index[filePath]++;
        return this.stack[filePath][this.index[filePath]];
    }
};

const interprete = new SubCodeXInterpreter();

// Inicializar sistema de archivos
function initFileSystem() {
    renderFileTree(fileSystem.root, fileTree);
    openFile(fileSystem.root.children[0]);
}

function renderFileTree(node, container) {
    container.innerHTML = '';
    renderFileNode(node, container, '');
}

function renderFileNode(node, container, indent) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.dataset.path = node.name;
    
    if (fileSystem.currentFile === node) {
        div.classList.add('active');
    }
    
    div.innerHTML = `
        <div class="file-icon">${node.type === 'folder' ? '📁' : getFileIcon(node.name)}</div>
        <div>${node.name}</div>
    `;
    
    div.addEventListener('click', () => {
        if (node.type === 'folder') {
            const wasOpen = node.open;
            closeAllFolders();
            node.open = !wasOpen;
            renderFileTree(fileSystem.root, fileTree);
        } else {
            openFile(node);
        }
    });
    
    container.appendChild(div);
    
    if (node.children && node.open) {
        node.children.forEach(child => {
            const childDiv = document.createElement('div');
            childDiv.style.marginLeft = '20px';
            renderFileNode(child, childDiv, indent + '&nbsp;&nbsp;');
            container.appendChild(childDiv);
        });
    }
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'html') return '🌐';
    if (ext === 'css') return '🎨';
    if (ext === 'subx') return '📜';
    return '📄';
}

function closeAllFolders(node = fileSystem.root) {
    node.open = false;
    if (node.children) {
        node.children.forEach(child => {
            if (child.type === 'folder') {
                closeAllFolders(child);
            }
        });
    }
}

function openFile(file) {
    fileSystem.currentFile = file;
    editor.value = file.content;
    
    currentFileNameSpan.textContent = file.name;
    fileTypeSpan.textContent = file.language === 'subx' ? 'SubCode X' : 
                             file.language === 'html' ? 'HTML' : 
                             file.language === 'css' ? 'CSS' : 'Texto';
    
    aplicarResaltado();
    
    if (!fileSystem.openTabs.some(tab => tab.name === file.name)) {
        fileSystem.openTabs.push(file);
        renderTabs();
    }
    
    setActiveTab(file.name);
    
    editHistory.saveState(file.name, file.content);
    
    if (file.language === 'html') {
        actualizarPreview();
    }
    
    statusMessage.textContent = `Archivo abierto: ${file.name}`;
}

function renderTabs() {
    tabsContainer.innerHTML = '';
    fileSystem.openTabs.forEach(file => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        if (fileSystem.currentFile === file) {
            tab.classList.add('active');
        }
        
        tab.innerHTML = `
            <span>${getFileIcon(file.name)}</span>
            <span>${file.name}</span>
            <span class="tab-close" onclick="cerrarPestana(event, '${file.name}')">✕</span>
        `;
        
        tab.addEventListener('click', () => openFile(file));
        tabsContainer.appendChild(tab);
    });
}

function setActiveTab(filename) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.includes(filename)) {
            tab.classList.add('active');
        }
    });
}

function cerrarPestana(event, filename) {
    event.stopPropagation();
    const index = fileSystem.openTabs.findIndex(file => file.name === filename);
    if (index !== -1) {
        fileSystem.openTabs.splice(index, 1);
        renderTabs();
        
        if (fileSystem.currentFile && fileSystem.currentFile.name === filename) {
            if (fileSystem.openTabs.length > 0) {
                openFile(fileSystem.openTabs[0]);
            } else {
                fileSystem.currentFile = null;
                editor.value = '';
                currentFileNameSpan.textContent = 'Sin archivo';
                fileTypeSpan.textContent = 'Ninguno';
                aplicarResaltado();
            }
        }
    }
}

function crearNuevoArchivo() {
    const nombre = prompt("Nombre del nuevo archivo (ej: script.subx):", "nuevo.subx");
    if (nombre) {
        const nuevoArchivo = {
            name: nombre,
            type: 'file',
            content: '',
            language: nombre.endsWith('.subx') ? 'subx' : 
                      nombre.endsWith('.html') ? 'html' : 
                      nombre.endsWith('.css') ? 'css' : 'text'
        };
        
        fileSystem.root.children.push(nuevoArchivo);
        renderFileTree(fileSystem.root, fileTree);
        openFile(nuevoArchivo);
        statusMessage.textContent = `Archivo creado: ${nombre}`;
    }
}

function crearNuevaCarpeta() {
    const nombre = prompt("Nombre de la nueva carpeta:", "nueva-carpeta");
    if (nombre) {
        const nuevaCarpeta = {
            name: nombre,
            type: 'folder',
            children: [],
            open: true
        };
        
        fileSystem.root.children.push(nuevaCarpeta);
        renderFileTree(fileSystem.root, fileTree);
        statusMessage.textContent = `Carpeta creada: ${nombre}`;
    }
}

function guardarArchivo() {
    if (fileSystem.currentFile) {
        fileSystem.currentFile.content = editor.value;
        statusMessage.textContent = `Archivo guardado: ${fileSystem.currentFile.name}`;
    } else {
        statusMessage.textContent = "No hay archivo abierto para guardar";
    }
}

function guardarTodo() {
    fileSystem.openTabs.forEach(file => {
        file.content = editor.value;
    });
    statusMessage.textContent = "Todos los archivos guardados";
}

function actualizarPreview() {
    if (fileSystem.currentFile && fileSystem.currentFile.language === 'html') {
        webPreview.srcdoc = fileSystem.currentFile.content;
        previewInfo.textContent = fileSystem.currentFile.name;
    } else {
        webPreview.srcdoc = '<body><h1>Selecciona un archivo HTML</h1></body>';
        previewInfo.textContent = "No hay HTML para previsualizar";
    }
}

function deshacer() {
    if (fileSystem.currentFile) {
        const contenido = editHistory.undo(fileSystem.currentFile.name);
        if (contenido !== null) {
            editor.value = contenido;
            aplicarResaltado();
            statusMessage.textContent = `Deshacer: ${fileSystem.currentFile.name}`;
        }
    }
}

function rehacer() {
    if (fileSystem.currentFile) {
        const contenido = editHistory.redo(fileSystem.currentFile.name);
        if (contenido !== null) {
            editor.value = contenido;
            aplicarResaltado();
            statusMessage.textContent = `Rehacer: ${fileSystem.currentFile.name}`;
        }
    }
}

function actualizarLineas() {
    const lineas = editor.value.split('\n');
    const numeroLineas = lineas.length;
    
    lineNumbers.innerHTML = '';
    for (let i = 1; i <= numeroLineas; i++) {
        lineNumbers.innerHTML += i + '\n';
    }
    
    lineCountSpan.textContent = numeroLineas;
    charCountSpan.textContent = editor.value.length;
    
    if (fileSystem.currentFile) {
        editHistory.saveState(fileSystem.currentFile.name, editor.value);
    }
}

function ejecutarCodigo() {
    if (!fileSystem.currentFile || fileSystem.currentFile.language !== 'subx') {
        mostrarOutput([{
            type: 'error',
            message: '❌ Solo se puede ejecutar código SubCode X (.subx)'
        }]);
        return;
    }
    
    const codigo = editor.value;
    if (!codigo.trim()) {
        mostrarOutput([{
            type: 'error',
            message: '❌ No hay código para ejecutar'
        }]);
        return;
    }

    mostrarOutput([{
        type: 'debug',
        message: '🚀 Ejecutando código...'
    }]);

    setTimeout(() => {
        const resultado = interprete.interpretar(codigo);
        mostrarOutput(resultado);
        
        const htmlGenerado = interprete.generarHTML();
        if (htmlGenerado && htmlGenerado.includes('<html>')) {
            mostrarOutput([{
                type: 'success',
                message: '🌐 HTML generado correctamente'
            }]);
            
            let htmlFile = fileSystem.root.children.find(f => f.name === 'index.html');
            if (!htmlFile) {
                htmlFile = {
                    name: 'index.html',
                    type: 'file',
                    content: htmlGenerado,
                    language: 'html'
                };
                fileSystem.root.children.push(htmlFile);
            } else {
                htmlFile.content = htmlGenerado;
            }
            
            openFile(htmlFile);
            actualizarPreview();
        }
    }, 100);
}

function mostrarOutput(output) {
    outputContainer.innerHTML = '';
    
    if (output.length === 0) {
        outputContainer.innerHTML = '<div class="output-line output-success">✅ Código ejecutado sin salida</div>';
        return;
    }

    output.forEach(item => {
        const div = document.createElement('div');
        div.className = 'output-line';
        
        switch (item.type) {
            case 'error':
                div.className += ' output-error';
                div.textContent = item.message;
                break;
            case 'debug':
                div.className += ' output-debug';
                div.textContent = `🐛 ${item.message}`;
                break;
            case 'output':
            default:
                div.className += ' output-success';
                div.textContent = item.message;
                break;
        }
        
        outputContainer.appendChild(div);
    });
    
    outputContainer.scrollTop = outputContainer.scrollHeight;
}

function limpiarSalida() {
    outputContainer.innerHTML = '<div class="output-line output-success">✅ Salida limpiada</div>';
}

function cargarEjemplo() {
    const ejemplo = `# SubCode X - Programa de Ejemplo
# Demostrando las funcionalidades del lenguaje

decir "🚀 Bienvenido a SubCode X"
decir "=========================="

# Variables
variable nombre = "Programador"
variable lenguaje = "SubCode X"
variable version = "1.0"

# Mostrar información
decir "Hola " + nombre
decir "Estás usando " + lenguaje + " v" + version

# Condicionales
si nombre == "Programador" entonces decir "✅ Usuario reconocido"
si version == "1.0" entonces decir "✅ Versión correcta"

# Bucles
decir "Contando hasta 3:"
repetir 3 veces decir "Número procesado"

# Funciones
funcion saludar()
decir "¡Hola desde una función!"
decir "SubCode X es genial"
finfuncion

funcion despedida()
decir "Gracias por usar SubCode X"
decir "¡Hasta la próxima!"
finfuncion

# Ejecutar funciones
saludar()
esperar 1
despedida()

# Crear página web
pagina "index.html"
titulo "Mi Página Web"
estilo "body { background: #222; color: white; font-family: Arial; }"
estilo "h1 { color: #ff5555; }"
elemento "h1" "Bienvenido a SubCode X"
elemento "p" "Esta página fue creada con el lenguaje SubCode X"
elemento "p" "Creada por " + nombre
consola "Página generada correctamente"

decir "🎯 Programa completado"`;

    if (!fileSystem.currentFile) {
        crearNuevoArchivo();
    }
    
    editor.value = ejemplo;
    aplicarResaltado();
    
    if (fileSystem.currentFile) {
        fileSystem.currentFile.content = ejemplo;
    }
    
    mostrarOutput([{
        type: 'success',
        message: '📖 Ejemplo cargado'
    }]);
}

// Event listeners
editor.addEventListener('input', aplicarResaltado);
editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
});

editor.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        deshacer();
    }
    
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        rehacer();
    }
    
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        ejecutarCodigo();
    }
    
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 4;
        aplicarResaltado();
    }
});

// Inicializar
initFileSystem();
actualizarLineas();

