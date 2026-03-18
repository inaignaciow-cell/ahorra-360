// ═══════════════════════════════════════════════════════════════
//  AHORRA 360 — /api/match_affiliate.js
//  Vercel Serverless Function
//  Cruza los datos de la factura con ofertas de afiliado
// ═══════════════════════════════════════════════════════════════

const AFFILIATE_OFFERS = {
  'luz': [
    { provider: 'Repsol', plan: 'Tarifa Largo Plazo', priceDesc: '0.11 €/kWh', estYearlyCost: 450, cpa: 45, logo: '☀️' },
    { provider: 'Holaluz', plan: 'Tarifa Justa', priceDesc: 'Cuota Fija Personalizada', estYearlyCost: 480, cpa: 55, logo: '💡' },
    { provider: 'Endesa', plan: 'Conecta', priceDesc: '0.12 €/kWh', estYearlyCost: 500, cpa: 30, logo: '⚡' }
  ],
  'telecos': [
    { provider: 'Digi', plan: 'Fibra 1Gb + 50GB', priceDesc: '20€/mes', estYearlyCost: 240, cpa: 35, logo: '📱' },
    { provider: 'Finetwork', plan: 'Fibra 600Mb + 55GB', priceDesc: '24.90€/mes', estYearlyCost: 298, cpa: 40, logo: '🟣' }
  ],
  'gas': [
    { provider: 'Naturgy', plan: 'Tarifa Por Uso', priceDesc: 'Fijo 5€ + 0.08€/kWh', estYearlyCost: 350, cpa: 30, logo: '🔥' }
  ]
};

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { vertical, provider_name, amount } = req.body;
    
    if (!vertical || !amount) {
      return res.status(400).json({ error: 'Faltan campos mínimos (vertical, amount)' });
    }

    const offers = AFFILIATE_OFFERS[vertical.toLowerCase()];
    if (!offers || offers.length === 0) {
      return res.status(200).json({ match: null }); // No hay ofertas para el vertical
    }

    const currentYearlyCost = parseFloat(amount) * 12; // Estimación cruda
    
    // Algoritmo "La Fumada": Encontrar la oferta que AHORRE dinero al usuario (>50€/año)
    // y de esas, elegir la que mayor CPA nos deje a nosotros.
    
    let bestMatch = null;
    let maxCPA = -1;

    for (const offer of offers) {
      // Ignoramos si la oferta es del mismo proveedor actual
      if (provider_name && offer.provider.toLowerCase().includes(provider_name.toLowerCase())) continue;

      const userSavings = currentYearlyCost - offer.estYearlyCost;
      
      if (userSavings > 50) { // Regla de negocio: solo molestar si el ahorro vale la pena
        if (offer.cpa > maxCPA) {
          maxCPA = offer.cpa;
          
          // --- LÓGICA FASE 7: ESCUDO ANTI-PERMANENCIA ---
          // Simulamos que si el proveedor actual es Vodafone o Movistar, hay una multa.
          let penalty = 0;
          if (provider_name && (provider_name.toLowerCase().includes('vodafone') || provider_name.toLowerCase().includes('movistar'))) {
            penalty = 120; // Multa estándar de 120€
          }

          bestMatch = { 
            ...offer, 
            userSavings: parseFloat(userSavings.toFixed(2)),
            penalty,
            shieldActive: penalty > 0 && offer.cpa > penalty // Lo cubrimos si nuestra comisión es mayor que la multa
          };
        }
      }
    }

    return res.status(200).json({ match: bestMatch });

  } catch (err) {
    console.error('Error en /api/match_affiliate:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};
