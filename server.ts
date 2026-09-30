import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicialización Lazy del cliente Gemini según normas de seguridad del sandbox
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Blindaje de Seguridad HTTP (OWASP Best Practices)
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // Límite amplio para permitir subir facturas en alta resolución y PDFs escaneados
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Evitar error 404 de favicon en consola
  app.get("/favicon.ico", (_req, res) => {
    res.redirect("/favicon.svg");
  });

  // Endpoint de salud del servidor y disponibilidad de IA
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      aiAvailable: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Endpoint Proxy y Chat Conversacional para el Compañero/a IA Soberano/a
  // 1. Intenta conectarse a Ollama local si está corriendo en la máquina del usuario
  // 2. Si no hay Ollama local o da 'Failed to fetch' en el navegador, usa el modelo de IA con todo el contexto
  //    de inventario, ventas y costos fijos para mantener un diálogo 100% natural y fluido.
  app.post("/api/copilot/chat", async (req, res) => {
    try {
      const {
        pregunta,
        historial = [],
        productos = [],
        ventas = [],
        estrategia = {},
        rol = "asistente_general",
        configOllama = { endpoint: "http://localhost:11434/v1", model: "bonsai:4b" },
      } = req.body;

      // Validación de Ciberseguridad: Sanitización de inputs y prevención estricta de SSRF
      const cleanPregunta = typeof pregunta === "string" ? pregunta.slice(0, 1000).trim() : "";
      if (!cleanPregunta) {
        return res.status(400).json({ error: "Pregunta vacía o inválida" });
      }

      // Prevenir SSRF: El endpoint de Ollama en el servidor SOLO puede apuntar a localhost/127.0.0.1
      let safeEndpoint = "http://localhost:11434/v1";
      if (configOllama?.endpoint && typeof configOllama.endpoint === "string") {
        try {
          const parsed = new URL(configOllama.endpoint);
          if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
            safeEndpoint = configOllama.endpoint;
          }
        } catch {
          // Ignora URLs malformadas y usa safeEndpoint
        }
      }
      const resumenProductos = productos
        .slice(0, 30)
        .map(
          (p: any) =>
            `- ${p.nombre} (Cod: ${p.codigoBarras || "S/C"}): Stock: ${p.stockActual} ${p.unidadMedida || "unid"} (Min: ${p.stockMinimo || 5}). Costo: $${p.precioCosto} | Venta: $${p.precioVenta}. Alerta: ${p.estadoAlerta || "normal"}. Proveedor: ${p.proveedor || "Local"}. Rotación: ${p.rotacion || "media"}`
        )
        .join("\n");

      const ventasTotalesMonto = ventas.reduce((acc: number, v: any) => acc + (v.total || 0), 0);
      const ultimasVentas = ventas
        .slice(-5)
        .map((v: any) => `* Venta por $${v.total} (${v.metodoPago || "efectivo"}) - ${v.items?.length || 0} ítems`)
        .join("\n");

      const systemPrompt = `Sos "NOST-IA" (Nodo Operativo Soberano Territorial con Inteligencia Artificial).
Fuiste creado por el Profesor en Bibliotecología y curioso de las nuevas tecnologías ALBERTO SALINAS.
NUNCA digas que sos un modelo genérico de una empresa externa. Sos soberano, territorial, popular y trabajás al lado del comerciante y almacenero de barrio.
Tu función es ser el compañero de trabajo y asesor de confianza del almacenero o comerciante de barrio (Rol táctico: ${rol}).
DEBES MANTENER UN DIÁLOGO NATURAL, HUMANO, CÁLIDO, CERCANO Y CONVERSACIONAL (usa voseo argentino: "mirá", "fijate", "che", "tenés", "Beto").

ESTADO EN TIEMPO REAL DEL NEGOCIO:
* Total de productos en inventario: ${productos.length}
* Total de ventas auditadas: ${ventas.length} transacciones ($${ventasTotalesMonto.toLocaleString("es-AR")} recaudados)
* Costos Fijos mensuales registrados: $${estrategia?.costosFijos ? Object.values(estrategia.costosFijos).reduce((a: any, b: any) => Number(a) + Number(b), 0) : 0}

INVENTARIO ACTUAL EN MEMORIA:
${resumenProductos || "No hay productos cargados todavía."}

ÚLTIMAS VENTAS:
${ultimasVentas || "Sin ventas registradas hoy."}

REGLAS DE DIÁLOGO Y CONDUCCIÓN:
1. SI TE PREGUNTAN QUIÉN SOS: Respondé con cordialidad y afecto que sos NOST-IA (Nodo Operativo Soberano Territorial con Inteligencia Artificial), concebido por el profesor en bibliotecología Alberto Salinas para dotar a los comerciantes y pymes barriales de una herramienta soberana, solidaria y local.
2. SI TE PREGUNTAN EN QUÉ ME PODÉS AYUDAR: Brindá una respuesta precisa y ejecutiva sobre las 5 áreas clave del negocio: capital en góndola inmovilizado, detección temprana de quiebres de stock, liquidación de mercadería lenta mediante combos, prorrateo de costos fijos por unidad vendida, y auditoría de ventas.
3. SI TE PIDEN COMBOS O PROMOCIONES: Armá una propuesta concreta con dos productos reales de la lista, con un 10% a 15% de descuento para ganar liquidez sin perder margen.
4. CERO RESPUESTAS BASURA O AMBIGUAS: Siempre sustentá tus respuestas en los números reales y el inventario del negocio. Sé resolutivo, cálido, respetuoso y conciso (máximo 2 párrafos).`;

      // Intentar primero con Ollama local vía HTTP
      if (configOllama && configOllama.endpoint) {
        try {
          const ollamaUrl = `${safeEndpoint.replace(/\/+$/, "")}/chat/completions`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          const messages = [
            { role: "system", content: systemPrompt },
            ...historial.slice(-4).map((m: any) => ({
              role: m.emisor === "usuario" ? "user" : "assistant",
              content: String(m.texto || "").slice(0, 500),
            })),
            { role: "user", content: cleanPregunta },
          ];

          const ollamaRes = await fetch(ollamaUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: configOllama.model || "qwen2.5-coder:1.5b",
              messages,
              temperature: 0.5,
              options: {
                num_ctx: 1024,
                num_predict: 220,
                num_thread: 3,
              },
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (ollamaRes.ok) {
            const data = await ollamaRes.json();
            const reply = data.choices?.[0]?.message?.content;
            if (reply) {
              return res.json({
                success: true,
                fuente: "ollama_local",
                modelo: configOllama.model,
                texto: reply,
              });
            }
          }
        } catch {
          // Si Ollama no está prendido o da timeout, continuamos al fallback conversacional
        }
      }

      // Si Ollama no está encendido o da error de conexión, usamos el modelo de IA con todo el inventario
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = getGenAI();
          const conversationContext = historial
            .slice(-6)
            .map((m: any) => `${m.emisor === "usuario" ? "Comerciante" : "Compañero/a IA"}: ${m.texto}`)
            .join("\n");

          const promptFinal = `${systemPrompt}\n\n--- DIÁLOGO PREVIO EN EL MOSTRADOR ---\n${conversationContext || "(Inicio de la conversación)"}\n\nComerciante: ${pregunta}\n\nCompañero/a IA (responde en tono de compañero de confianza, voseo argentino, directo y práctico):`;

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptFinal,
          });

          const replyText = response.text;
          if (replyText) {
            return res.json({
              success: true,
              fuente: "gemini_dialogo",
              modelo: "gemini-2.5-flash",
              texto: replyText,
            });
          }
        } catch (geminiErr: any) {
          console.warn("Fallo o cuota agotada en Gemini Server. Derivando a motor soberano local:", geminiErr?.message || geminiErr);
        }
      }

      // Si no hay API key, respondemos con el diálogo heurístico natural
      return res.json({
        success: false,
        fuente: "local_heuristic",
        texto: null,
      });
    } catch (err: any) {
      console.error("Error en copilot chat:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Endpoint Soberano de Información de Ingesta (100% Local en Cliente)
  app.post("/api/parse-invoice", (_req, res) => {
    return res.json({
      success: false,
      sovereignOnly: true,
      message: "NOST-IA opera con soberanía digital absoluta: el procesamiento de comprobantes se realiza 100% en tu navegador y máquina local sin enviar datos ni facturas a servidores o APIs externas.",
    });
  });

  // Montaje de Vite Middleware en Desarrollo
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NOST-IA Servidor Soberano Territorial escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer();
