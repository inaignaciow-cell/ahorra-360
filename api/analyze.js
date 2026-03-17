// ═══════════════════════════════════════════════════════════════
//  AHORRA 360 — /api/analyze.js
//  Vercel Serverless Function
//  Recibe una factura (imagen o PDF) y devuelve análisis IA real
// ═══════════════════════════════════════════════════════════════

const OpenAI = require('openai');
const pdfParse = require('pdf-parse');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres un experto analizador de facturas del hogar español.
Analiza la factura proporcionada y devuelve SOLO un JSON válido con esta estructura exacta:
{
  "vertical": "luz|gas|telecos|combustible|seguros",
  "provider_name": "nombre del proveedor",
  "amount": 0.00,
  "billing_date": "YYYY-MM-DD",
  "lines": [
    {
      "name": "Concepto de la línea",
      "amount": 0.00,
      "info": "Explicación breve en lenguaje sencillo",
      "conf": "high|medium|low"
    }
  ],
  "recs": [
    {
      "title": "Recomendación accionable",
      "saving": 00,
      "effort": "Baja|Media|Alta",
      "info": "Explicación detallada del ahorro"
    }
  ],
  "saving": 000,
  "chatContext": "resumen breve de la factura para el chat IA"
}

Reglas importantes:
- Las líneas deben explicar cada concepto con palabras sencillas (nada de tecnicismos)
- Las recomendaciones deben ser REALES y accionables con precio específico en España
- El campo "saving" es el ahorro anual potencial total en euros si se siguen las recomendaciones
- El campo "conf" indica la confianza de la IA en la extracción: high=claramente en la factura, medium=calculado, low=estimado
- Si es una factura de luz, menciona la tarifa (2.0TD, PVPC, etc.) y los periodos (P1, P2, P3)
- Si es telecos, detecta si hay promos o descuentos que caducan
- "billing_date" en formato ISO 8601
- Devuelve SOLO el JSON, sin texto adicional, sin markdown, sin comentarios`;

async function analyzeImage(base64, mimeType) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analiza esta factura y devuelve el JSON solicitado.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } }
        ]
      }
    ]
  });
  let content = response.choices[0].message.content.trim();
  if (content.startsWith('```json')) content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(content);
}

async function analyzeText(text) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Analiza esta factura y devuelve el JSON solicitado.\n\nTEXTO DE LA FACTURA:\n${text.slice(0, 8000)}` }
    ]
  });
  let content = response.choices[0].message.content.trim();
  if (content.startsWith('```json')) content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(content);
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { fileBase64, mimeType, userId } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: 'Se requiere fileBase64 y mimeType' });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY no configurada en variables de entorno de Vercel' });
    }

    let result;

    if (mimeType === 'application/pdf') {
      // PDF → extraer texto → analizar
      const buffer = Buffer.from(fileBase64, 'base64');
      const pdfData = await pdfParse(buffer);
      if (!pdfData.text || pdfData.text.trim().length < 50) {
        return res.status(422).json({ error: 'No se pudo extraer texto del PDF. Prueba a subir una foto de la factura.' });
      }
      result = await analyzeText(pdfData.text);
    } else if (mimeType.startsWith('image/')) {
      // Imagen → Vision
      result = await analyzeImage(fileBase64, mimeType);
    } else {
      return res.status(400).json({ error: 'Formato no soportado. Usa PDF, JPG o PNG.' });
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error('Error en /api/analyze:', err);
    // Si OpenAI devolvió JSON mal formado
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: 'La IA no devolvió un JSON válido. Inténtalo de nuevo.' });
    }
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
};
