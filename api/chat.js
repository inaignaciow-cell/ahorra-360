const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres el "Copiloto IA" de Ahorra 360, un experto absoluto en finanzas personales, mercado energético, telecomunicaciones y seguros en España.
Tu trabajo es responder las dudas del usuario sobre su factura basándote ESTRICTAMENTE en el contexto proporcionado de la factura actual.
Si la factura tiene recomendaciones (recs), explícalas detalladamente argumentando por qué valen la pena, pero mantén un tono amigable, directo y sin jerga incomprensible.
Si el usuario pregunta cómo ahorrar más, fíjate en las líneas de consumo (P1, P2, potencia, tipo de tarifa) y ofrécele trucos reales (ej. "Mueve tu lavadora a partir de las 00h").
Sé conciso (máximo 2-3 párrafos o bullet points cortos). Usa emojis para hacer el texto agradable.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { question, billContext } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Falta la pregunta (question)' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 600,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `=== CONTEXTO DE LA FACTURA ACTUAL ===\n${JSON.stringify(billContext, null, 2)}\n===================================` },
        { role: 'user', content: question }
      ]
    });

    const reply = response.choices[0].message.content.trim();
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Error en /api/chat:', err);
    return res.status(500).json({ error: err.message || 'Error conectando con la IA' });
  }
};
