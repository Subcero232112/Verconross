class SubCodeXInterpreter {
    constructor() {
        this.variables = {};
        this.funciones = {};
        this.enFuncion = null;
        this.output = [];
        this.web = {
            html: '',
            css: '',
            js: '',
            title: 'Página SubCode X'
        };
    }

    interpretar(codigo) {
        this.output = [];
        this.variables = {};
        this.funciones = {};
        this.enFuncion = null;
        this.resetWeb();

        const lineas = codigo.split('\n');
        
        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (linea && !linea.startsWith('#')) {
                try {
                    this.interpretarLinea(linea);
                } catch (error) {
                    this.output.push({
                        type: 'error',
                        message: `Error en línea ${i + 1}: ${error.message}`
                    });
                }
            }
        }

        return this.output;
    }
    
    resetWeb() {
        this.web = {
            html: '',
            css: '',
            js: '',
            title: 'Página SubCode X'
        };
    }

    interpretarLinea(linea) {
        if (this.enFuncion) {
            if (linea === 'finfuncion') {
                this.enFuncion = null;
            } else {
                this.funciones[this.enFuncion].push(linea);
            }
            return;
        }

        if (linea.startsWith('decir ')) {
            const contenido = linea.substring(6).trim();
            const resultado = this.evaluarExpresion(contenido);
            this.output.push({
                type: 'output',
                message: resultado
            });
        }
        else if (linea.startsWith('variable ')) {
            const partes = linea.substring(9).split('=');
            if (partes.length === 2) {
                const nombre = partes[0].trim();
                const valor = this.evaluarExpresion(partes[1].trim());
                this.variables[nombre] = valor;
                this.output.push({
                    type: 'debug',
                    message: `Variable '${nombre}' = '${valor}'`
                });
            }
        }
        else if (linea.startsWith('si ')) {
            const partes = linea.substring(3).split(' entonces ');
            if (partes.length === 2) {
                const condicion = partes[0].trim();
                const accion = partes[1].trim();
                
                if (this.evaluarCondicion(condicion)) {
                    this.interpretarLinea(accion);
                }
            }
        }
        else if (linea.startsWith('repetir ')) {
            const partes = linea.split(' veces ');
            if (partes.length === 2) {
                const veces = parseInt(this.evaluarExpresion(partes[0].replace('repetir', '').trim()));
                const accion = partes[1].trim();
                
                for (let i = 0; i < veces; i++) {
                    this.interpretarLinea(accion);
                }
            }
        }
        else if (linea.startsWith('funcion ')) {
            const nombre = linea.substring(8).replace('()', '').trim();
            this.funciones[nombre] = [];
            this.enFuncion = nombre;
            this.output.push({
                type: 'debug',
                message: `Definiendo función '${nombre}'`
            });
        }
        else if (linea.replace('()', '') in this.funciones) {
            const nombreFuncion = linea.replace('()', '');
            for (const lineaFuncion of this.funciones[nombreFuncion]) {
                this.interpretarLinea(lineaFuncion);
            }
        }
        else if (linea.startsWith('esperar ')) {
            const tiempo = this.evaluarExpresion(linea.substring(8).trim());
            this.output.push({
                type: 'debug',
                message: `Esperando ${tiempo} segundos...`
            });
        }
        else if (linea.startsWith('pagina ')) {
            const nombre = linea.substring(7).trim().replace(/"/g, '');
            this.output.push({
                type: 'debug',
                message: `🔄 Creando página web: ${nombre}`
            });
        }
        else if (linea.startsWith('titulo ')) {
            const titulo = linea.substring(7).trim().replace(/"/g, '');
            this.web.title = titulo;
            this.output.push({
                type: 'debug',
                message: `🏷️ Título establecido: ${titulo}`
            });
        }
        else if (linea.startsWith('estilo ')) {
            const estilo = linea.substring(7).trim().replace(/"/g, '');
            this.web.css += estilo + '\n';
            this.output.push({
                type: 'debug',
                message: `🎨 Estilo CSS agregado`
            });
        }
        else if (linea.startsWith('elemento ')) {
            const partes = linea.substring(9).trim().split('" "');
            if (partes.length >= 2) {
                const tag = partes[0].replace(/"/g, '').trim();
                let contenido = partes[1].replace(/"/g, '').trim();
                
                for (const [key, value] of Object.entries(this.variables)) {
                    contenido = contenido.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
                }
                
                this.web.html += `<${tag}>${contenido}</${tag}>\n`;
                this.output.push({
                    type: 'debug',
                    message: `📝 Elemento HTML agregado: <${tag}>`
                });
            }
        }
        else if (linea.startsWith('consola ')) {
            const mensaje = linea.substring(8).trim().replace(/"/g, '');
            this.output.push({
                type: 'output',
                message: `📢 Consola: ${mensaje}`
            });
        }
    }

    generarHTML() {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${this.web.title}</title>
    <style>${this.web.css}</style>
    <script>${this.web.js}</script>
</head>
<body>
    ${this.web.html}
</body>
</html>`;
    }

    evaluarExpresion(expr) {
        if (!expr) return '';

        if (expr.startsWith('"') && expr.endsWith('"')) {
            return expr.slice(1, -1);
        }

        if (expr in this.variables) {
            return this.variables[expr];
        }

        if (!isNaN(expr)) {
            return expr;
        }

        let resultado = '';
        const tokens = this.tokenizar(expr);
        
        for (const token of tokens) {
            if (token === '+') continue;
            
            if (token.startsWith('"') && token.endsWith('"')) {
                resultado += token.slice(1, -1);
            } else if (token in this.variables) {
                resultado += this.variables[token];
            } else if (!isNaN(token)) {
                resultado += token;
            } else {
                resultado += token;
            }
        }

        return resultado;
    }

    tokenizar(expr) {
        const tokens = [];
        let i = 0;
        let tokenActual = '';

        while (i < expr.length) {
            const char = expr[i];

            if (char === '"') {
                if (tokenActual) {
                    tokens.push(tokenActual.trim());
                    tokenActual = '';
                }

                let cadena = '"';
                i++;
                while (i < expr.length && expr[i] !== '"') {
                    cadena += expr[i];
                    i++;
                }
                if (i < expr.length) {
                    cadena += '"';
                }
                tokens.push(cadena);
            } else if (char === '+') {
                if (tokenActual) {
                    tokens.push(tokenActual.trim());
                    tokenActual = '';
                }
                tokens.push('+');
            } else if (char === ' ') {
                if (tokenActual) {
                    tokens.push(tokenActual.trim());
                    tokenActual = '';
                }
            } else {
                tokenActual += char;
            }

            i++;
        }

        if (tokenActual) {
            tokens.push(tokenActual.trim());
        }

        return tokens.filter(t => t);
    }

    evaluarCondicion(cond) {
        if (cond.includes('==')) {
            const [a, b] = cond.split('==');
            return this.evaluarExpresion(a.trim()) === this.evaluarExpresion(b.trim());
        }
        if (cond.includes('!=')) {
            const [a, b] = cond.split('!=');
            return this.evaluarExpresion(a.trim()) !== this.evaluarExpresion(b.trim());
        }
        return false;
    }
}

