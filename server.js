const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de reintentos
const CONFIG_REINTENTOS = {
    maxReintentos: 3,
    delayInicial: 1000,
    factorBackoff: 2,
    timeout: 30000
};

// URLs base de las APIs
const APIS_EXTERNAS = {
    audio: 'https://api.vreden.my.id/api/v1/download/youtube/audio',
    video: 'https://api.vreden.my.id/api/v1/download/youtube/video',
    acortador: 'https://delirius-apiofc.vercel.app/shorten/isgd'
};

// Función con reintentos automáticos
async function peticionConReintentos(url, maxReintentos = CONFIG_REINTENTOS.maxReintentos, delay = CONFIG_REINTENTOS.delayInicial) {
    let ultimoError;
    
    for (let intento = 1; intento <= maxReintentos; intento++) {
        try {
            console.log(`🔄 Intento ${intento} para: ${url}`);
            
            const respuesta = await axios.get(url, { 
                timeout: CONFIG_REINTENTOS.timeout 
            });
            
            console.log(`✅ Intento ${intento} exitoso`);
            return respuesta.data;
            
        } catch (error) {
            ultimoError = error;
            console.log(`❌ Intento ${intento} fallido:`, error.message);
            
            if (intento < maxReintentos) {
                const tiempoEspera = delay * Math.pow(CONFIG_REINTENTOS.factorBackoff, intento - 1);
                console.log(`⏳ Esperando ${tiempoEspera}ms antes del próximo intento...`);
                await new Promise(resolve => setTimeout(resolve, tiempoEspera));
            }
        }
    }
    
    throw new Error(`Todos los ${maxReintentos} intentos fallaron. Último error: ${ultimoError.message}`);
}

// Función para acortar enlaces
async function acortarEnlace(urlOriginal) {
    try {
        console.log(`🔗 Acortando enlace: ${urlOriginal}`);
        
        const apiUrl = `${APIS_EXTERNAS.acortador}?url=${encodeURIComponent(urlOriginal)}`;
        const respuesta = await axios.get(apiUrl, { timeout: 10000 });
        
        if (respuesta.data.status && respuesta.data.data) {
            console.log(`✅ Enlace acortado: ${respuesta.data.data}`);
            return respuesta.data.data;
        } else {
            throw new Error('Respuesta inválida del servicio de acortamiento');
        }
        
    } catch (error) {
        console.error(`❌ Error acortando enlace: ${error.message}`);
        // Si falla el acortamiento, devolvemos el enlace original
        return urlOriginal;
    }
}

// Función para procesar respuesta de audio
async function procesarRespuestaAudio(datos) {
    if (!datos.status || !datos.result) {
        throw new Error('Respuesta de la API de audio no válida');
    }

    const { metadata, download } = datos.result;

    // Siempre acortar el enlace de descarga
    const urlDescarga = await acortarEnlace(download.url);

    return {
        tipo: "audio",
        estado: "éxito",
        codigo_estado: 200,
        informacion_media: {
            titulo: metadata.title,
            duracion: metadata.timestamp,
            vistas: metadata.views,
            imagen: metadata.image,
            artista: metadata.author.name,
            url_youtube: metadata.url
        },
        descarga: {
            calidad: download.quality,
            calidades_disponibles: download.availableQuality,
            url_descarga: urlDescarga,
            nombre_archivo: download.filename,
            tipo_archivo: "mp3"
        }
    };
}

// Función para procesar respuesta de video
async function procesarRespuestaVideo(datos) {
    if (!datos.status || !datos.result) {
        throw new Error('Respuesta de la API de video no válida');
    }

    const { metadata, download } = datos.result;

    // Siempre acortar el enlace de descarga
    const urlDescarga = await acortarEnlace(download.url);

    return {
        tipo: "video",
        estado: "éxito",
        codigo_estado: 200,
        informacion_media: {
            titulo: metadata.title,
            duracion: metadata.timestamp,
            vistas: metadata.views,
            imagen: metadata.image,
            artista: metadata.author.name,
            url_youtube: metadata.url,
            calidad_actual: download.quality
        },
        descarga: {
            calidad: download.quality,
            calidades_disponibles: download.availableQuality,
            url_descarga: urlDescarga,
            nombre_archivo: download.filename,
            tipo_archivo: "mp4"
        }
    };
}

// Página principal con documentación
app.get('/', (req, res) => {
    const documentacion = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API de YouTube Downloader - Documentación</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .header {
                text-align: center;
                color: white;
                margin-bottom: 40px;
                padding: 40px 0;
            }
            
            .header h1 {
                font-size: 3rem;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .header p {
                font-size: 1.2rem;
                opacity: 0.9;
            }
            
            .card {
                background: white;
                border-radius: 15px;
                padding: 30px;
                margin-bottom: 25px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                border-left: 5px solid #667eea;
            }
            
            .card h2 {
                color: #667eea;
                margin-bottom: 20px;
                font-size: 1.8rem;
            }
            
            .card h3 {
                color: #764ba2;
                margin: 25px 0 15px 0;
                font-size: 1.3rem;
            }
            
            .endpoint {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 20px;
                margin: 15px 0;
                font-family: 'Courier New', monospace;
            }
            
            .method {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 5px 12px;
                border-radius: 5px;
                font-weight: bold;
                margin-right: 10px;
            }
            
            .url {
                color: #495057;
                font-weight: bold;
            }
            
            .parametro {
                margin: 10px 0;
                padding-left: 20px;
            }
            
            .parametro strong {
                color: #667eea;
            }
            
            .ejemplo-respuesta {
                background: #2d3748;
                color: #e2e8f0;
                padding: 20px;
                border-radius: 8px;
                margin: 15px 0;
                overflow-x: auto;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
            }
            
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            
            .feature {
                text-align: center;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
                border: 2px solid #e9ecef;
            }
            
            .feature-icon {
                font-size: 2.5rem;
                margin-bottom: 15px;
            }
            
            .footer {
                text-align: center;
                color: white;
                margin-top: 50px;
                padding: 30px 0;
                opacity: 0.8;
            }
            
            @media (max-width: 768px) {
                .header h1 {
                    font-size: 2rem;
                }
                
                .card {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 YouTube Downloader API</h1>
                <p>API robusta para descargar audio y video de YouTube con enlaces acortados</p>
            </div>
            
            <div class="card">
                <h2>🚀 Características Principales</h2>
                <div class="feature-grid">
                    <div class="feature">
                        <div class="feature-icon">🎵</div>
                        <h3>Descarga de Audio</h3>
                        <p>Calidades desde 92kbps hasta 320kbps</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">🎥</div>
                        <h3>Descarga de Video</h3>
                        <p>Resoluciones de 144p a 1080p</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">🔗</div>
                        <h3>Enlaces Acortados</h3>
                        <p>URLs cortas y limpias automáticamente</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">🔄</div>
                        <h3>Reintentos Automáticos</h3>
                        <p>Manejo robusto de fallos</p>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h2>📚 Endpoints Disponibles</h2>
                
                <h3>🎵 Descargar Audio</h3>
                <div class="endpoint">
                    <span class="method">GET</span>
                    <span class="url">/api/youtube/audio?url=URL_YOUTUBE&calidad=128</span>
                </div>
                
                <h3>🎥 Descargar Video</h3>
                <div class="endpoint">
                    <span class="method">GET</span>
                    <span class="url">/api/youtube/video?url=URL_YOUTUBE&calidad=360</span>
                </div>
                
                <h3>📋 Información del Video</h3>
                <div class="endpoint">
                    <span class="method">GET</span>
                    <span class="url">/api/youtube/info?url=URL_YOUTUBE</span>
                </div>
                
                <h3>🔍 Estado del Servicio</h3>
                <div class="endpoint">
                    <span class="method">GET</span>
                    <span class="url">/api/estado</span>
                </div>
            </div>
            
            <div class="card">
                <h2>⚙️ Parámetros</h2>
                
                <div class="parametro">
                    <strong>url</strong> (requerido) - URL del video de YouTube
                </div>
                
                <div class="parametro">
                    <strong>calidad</strong> (opcional) - Calidad de descarga:
                    <ul>
                        <li>Audio: 92, 128, 256, 320 (por defecto: 128)</li>
                        <li>Video: 144, 360, 480, 720, 1080 (por defecto: 360)</li>
                    </ul>
                </div>
                
                <div class="parametro">
                    <strong>reintentos</strong> (opcional) - Número de reintentos (1-5, por defecto: 3)
                </div>
            </div>
            
            <div class="card">
                <h2>📝 Ejemplo de Uso</h2>
                
                <h3>Descargar audio de un video:</h3>
                <div class="endpoint">
                    <span class="method">GET</span>
                    <span class="url">/api/youtube/audio?url=https://youtu.be/HWjCStB6k4o&calidad=256</span>
                </div>
                
                <h3>Respuesta exitosa:</h3>
                <div class="ejemplo-respuesta">
{
  "estado": "completado",
  "tipo": "audio",
  "codigo_estado": 200,
  "informacion_media": {
    "titulo": "Ace of Base - Happy Nation (Official Music Video)",
    "duracion": "3:32",
    "vistas": 218508665,
    "imagen": "https://i.ytimg.com/vi/HWjCStB6k4o/hqdefault.jpg",
    "artista": "Ace of Base",
    "url_youtube": "https://youtube.com/watch?v=HWjCStB6k4o"
  },
  "descarga": {
    "calidad": "256kbps",
    "calidades_disponibles": [92, 128, 256, 320],
    "url_descarga": "https://is.gd/BPexSS",
    "nombre_archivo": "Ace of Base - Happy Nation (Official Music Video) (256kbps).mp3",
    "tipo_archivo": "mp3"
  }
}
                </div>
            </div>
            
            <div class="card">
                <h2>🛠️ Códigos de Estado</h2>
                <ul>
                    <li><strong>200</strong> - Éxito</li>
                    <li><strong>400</strong> - URL no proporcionada</li>
                    <li><strong>408</strong> - Timeout</li>
                    <li><strong>503</strong> - Servicio no disponible</li>
                    <li><strong>500</strong> - Error interno</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>API desarrollada con Node.js, Express y Axios</p>
                <p>© 2024 YouTube Downloader API - Todos los derechos reservados</p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(documentacion);
});

// Endpoint para descarga de audio
app.get('/api/youtube/audio', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    try {
        const { url, calidad = '128', reintentos = 3 } = req.query;

        if (!url) {
            return res.status(400).json({
                estado: "error",
                mensaje: "Se requiere el parámetro 'url' de YouTube"
            });
        }

        res.write(JSON.stringify({
            estado: "procesando",
            tipo: "audio",
            mensaje: "Solicitud de audio recibida, procesando con reintentos automáticos..."
        }) + '\n');

        const apiUrl = `${APIS_EXTERNAS.audio}?url=${encodeURIComponent(url)}&quality=${calidad}`;
        console.log(`🎵 Iniciando petición de audio para: ${url}`);
        
        const datosAPI = await peticionConReintentos(apiUrl, parseInt(reintentos));
        const datosProcesados = await procesarRespuestaAudio(datosAPI);

        res.write(JSON.stringify({
            estado: "completado",
            ...datosProcesados
        }));
        
        res.end();

    } catch (error) {
        console.error('Error en audio:', error.message);
        
        let codigoError = 500;
        let mensajeError = error.message;

        if (error.message.includes('timeout')) {
            codigoError = 408;
            mensajeError = "Timeout: La petición de audio tardó demasiado tiempo";
        } else if (error.message.includes('todos los intentos fallaron')) {
            codigoError = 503;
            mensajeError = "Servicio de audio temporalmente no disponible";
        }

        res.write(JSON.stringify({
            estado: "error",
            tipo: "audio",
            codigo_estado: codigoError,
            mensaje: mensajeError
        }));
        res.end();
    }
});

// Endpoint para descarga de video
app.get('/api/youtube/video', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    try {
        const { url, calidad = '360', reintentos = 3 } = req.query;

        if (!url) {
            return res.status(400).json({
                estado: "error",
                mensaje: "Se requiere el parámetro 'url' de YouTube"
            });
        }

        res.write(JSON.stringify({
            estado: "procesando",
            tipo: "video",
            mensaje: "Solicitud de video recibida, procesando con reintentos automáticos..."
        }) + '\n');

        const apiUrl = `${APIS_EXTERNAS.video}?url=${encodeURIComponent(url)}&quality=${calidad}`;
        console.log(`🎥 Iniciando petición de video para: ${url}`);
        
        const datosAPI = await peticionConReintentos(apiUrl, parseInt(reintentos));
        const datosProcesados = await procesarRespuestaVideo(datosAPI);

        res.write(JSON.stringify({
            estado: "completado",
            ...datosProcesados
        }));
        
        res.end();

    } catch (error) {
        console.error('Error en video:', error.message);
        
        let codigoError = 500;
        let mensajeError = error.message;

        if (error.message.includes('timeout')) {
            codigoError = 408;
            mensajeError = "Timeout: La petición de video tardó demasiado tiempo";
        } else if (error.message.includes('todos los intentos fallaron')) {
            codigoError = 503;
            mensajeError = "Servicio de video temporalmente no disponible";
        }

        res.write(JSON.stringify({
            estado: "error",
            tipo: "video",
            codigo_estado: codigoError,
            mensaje: mensajeError
        }));
        res.end();
    }
});

// Endpoint de información
app.get('/api/youtube/info', async (req, res) => {
    try {
        const { url, reintentos = 2 } = req.query;

        if (!url) {
            return res.status(400).json({
                estado: "error",
                mensaje: "Se requiere el parámetro 'url' de YouTube"
            });
        }

        const apiUrl = `${APIS_EXTERNAS.audio}?url=${encodeURIComponent(url)}&quality=128`;
        const respuesta = await peticionConReintentos(apiUrl, parseInt(reintentos));
        const { metadata } = respuesta.result;

        const informacion = {
            estado: "éxito",
            informacion: {
                titulo: metadata.title,
                artista: metadata.author.name,
                duracion: metadata.timestamp,
                vistas: metadata.views,
                miniatura: metadata.thumbnail,
                descripcion: metadata.description ? metadata.description.substring(0, 200) + '...' : 'Descripción no disponible',
                id_video: metadata.videoId
            },
            calidades_recomendadas: {
                audio: [92, 128, 256, 320],
                video: [144, 360, 480, 720, 1080]
            }
        };

        res.json(informacion);

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            estado: "error",
            mensaje: "Error al obtener información del video"
        });
    }
});

// Endpoint de verificación de servicio
app.get('/api/estado', (req, res) => {
    res.json({
        servicio: "YouTube Downloader API",
        estado: "activo",
        version: "5.0.0",
        caracteristicas: [
            "Descarga de audio y video",
            "Enlaces acortados automáticamente",
            "Reintentos automáticos",
            "Múltiples calidades",
            "Respuestas en español"
        ],
        endpoints: {
            audio: "/api/youtube/audio",
            video: "/api/youtube/video",
            info: "/api/youtube/info",
            estado: "/api/estado"
        }
    });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        estado: "error",
        mensaje: "Endpoint no encontrado"
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📖 Documentación disponible en: http://localhost:${PORT}`);
    console.log(`🎵 Endpoints:`);
    console.log(`   GET /api/youtube/audio?url=URL`);
    console.log(`   GET /api/youtube/video?url=URL`);
    console.log(`   GET /api/youtube/info?url=URL`);
    console.log(`   GET /api/estado`);
});
