import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * 🔗 Función auxiliar para acortar URLs usando la API
 */
async function shortenUrl(longUrl) {
  const api = `https://delirius-apiofc.vercel.app/shorten/dagd?url=${encodeURIComponent(longUrl)}`;
  const response = await fetch(api);
  const data = await response.json();

  if (data.status && data.data?.short) {
    return data.data.short;
  } else {
    throw new Error("No se pudo acortar la URL");
  }
}

/**
 * 🏠 Ruta principal (documentación básica)
 */
app.get("/", (req, res) => {
  res.json({
    name: "YT API",
    version: "beta",
    endpoints: {
      "/ytmp3": {
        description: "Convierte un video de YouTube a audio MP3.",
        method: "GET",
        params: {
          url: "Enlace del video de YouTube (obligatorio)",
          quality: "Calidad del audio (opcional, por defecto: 128kbps)"
        },
        example_request: "/ytmp3?url=https://youtu.be/HWjCStB6k4o",
        example_response: {
          status: true,
          type: "audio",
          result: {
            title: "Ace of Base - Happy Nation (Official Music Video)",
            author: "Ace of Base",
            duration: "3:32",
            views: 218685601,
            ago: "15 years ago",
            thumbnail: "https://i.ytimg.com/vi/HWjCStB6k4o/hqdefault.jpg",
            quality: "128kbps",
            short_url: "https://da.gd/2Ik9C0"
          }
        }
      },
      "/ytmp4": {
        description: "Convierte un video de YouTube a formato MP4.",
        method: "GET",
        params: {
          url: "Enlace del video de YouTube (obligatorio)",
          quality: "Calidad del video (opcional, por defecto: 360p)"
        },
        example_request: "/ytmp4?url=https://youtu.be/HWjCStB6k4o",
        example_response: {
          status: true,
          type: "video",
          result: {
            title: "Ace of Base - Happy Nation (Official Music Video)",
            author: "Ace of Base",
            duration: "3:32",
            views: 218685966,
            ago: "15 years ago",
            thumbnail: "https://i.ytimg.com/vi/HWjCStB6k4o/hqdefault.jpg",
            quality: "360p",
            short_url: "https://da.gd/xYz123"
          }
        }
      }
    }
  });
});

/**
 * 🎵 Endpoint /ytmp3 - Descarga audio de YouTube
 */
app.get("/ytmp3", async (req, res) => {
  const youtubeUrl = req.query.url;
  const quality = req.query.quality || "128"; // por defecto 128 kbps

  if (!youtubeUrl) {
    return res.status(400).json({
      status: false,
      message: "Falta el parámetro 'url'. Ejemplo: /ytmp3?url=https://youtu.be/HWjCStB6k4o",
    });
  }

  try {
    const apiVreden = `https://api.vreden.my.id/api/v1/download/youtube/audio?url=${encodeURIComponent(
      youtubeUrl
    )}&quality=${quality}`;

    const response = await fetch(apiVreden);
    const data = await response.json();

    if (!data.status || !data.result?.download?.url) {
      return res.status(500).json({
        status: false,
        message: "Error al obtener datos desde la API de Vreden.",
      });
    }

    const meta = data.result.metadata;
    const downloadUrl = data.result.download.url;
    const shortUrl = await shortenUrl(downloadUrl);

    res.json({
      status: true,
      type: "audio",
      result: {
        title: meta.title,
        author: meta.author.name,
        duration: meta.duration.timestamp,
        views: meta.views,
        ago: meta.ago,
        thumbnail: meta.thumbnail,
        quality: data.result.download.quality,
        short_url: shortUrl,
      },
    });
  } catch (error) {
    console.error("Error interno:", error);
    res.status(500).json({
      status: false,
      message: "Error interno del servidor.",
      error: error.message,
    });
  }
});

/**
 * 🎬 Endpoint /ytmp4 - Descarga video de YouTube
 */
app.get("/ytmp4", async (req, res) => {
  const youtubeUrl = req.query.url;
  const quality = req.query.quality || "360"; // por defecto 360p

  if (!youtubeUrl) {
    return res.status(400).json({
      status: false,
      message: "Falta el parámetro 'url'. Ejemplo: /ytmp4?url=https://youtu.be/HWjCStB6k4o",
    });
  }

  try {
    const apiVreden = `https://api.vreden.my.id/api/v1/download/youtube/video?url=${encodeURIComponent(
      youtubeUrl
    )}&quality=${quality}`;

    const response = await fetch(apiVreden);
    const data = await response.json();

    if (!data.status || !data.result?.download?.url) {
      return res.status(500).json({
        status: false,
        message: "Error al obtener datos desde la API de Vreden.",
      });
    }

    const meta = data.result.metadata;
    const downloadUrl = data.result.download.url;
    const shortUrl = await shortenUrl(downloadUrl);

    res.json({
      status: true,
      type: "video",
      result: {
        title: meta.title,
        author: meta.author.name,
        duration: meta.duration.timestamp,
        views: meta.views,
        ago: meta.ago,
        thumbnail: meta.thumbnail,
        quality: data.result.download.quality,
        short_url: shortUrl,
      },
    });
  } catch (error) {
    console.error("Error interno:", error);
    res.status(500).json({
      status: false,
      message: "Error interno del servidor.",
      error: error.message,
    });
  }
});

/**
 * 🚀 Iniciar servidor
 */
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
