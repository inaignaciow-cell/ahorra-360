// ═══════════════════════════════════════════════
//  AHORRA 360 — /api/comparador.js
//  Devuelve tarifas actualizadas por vertical
//  Fuente: datos CNMC + tarifas de referencia 2026
// ═══════════════════════════════════════════════

// Datos de tarifas actualizados (fuente: CNMC y webs de comparadores)
// En el futuro esto puede conectarse a APIs externas
const TARIFAS = {
  luz: {
    updated: '2026-03-01',
    avg_kwh: 0.1847,  // €/kWh precio promedio mercado libre
    pvpc_kwh: 0.2031, // €/kWh PVPC ref. (mes actual)
    options: [
      {
        id: 'octopus-flex',
        name: 'Octopus Energy Flex',
        type: 'indexada',
        base_price: 3.00, // €/mes fijo
        kwh_price: null, // indexada OMIE
        badge: 'Recomendado IA',
        recommended: true,
        details: 'Indexada OMIE + €3/mes. Ideal si consumes en valle (22h-8h).',
        affiliate: true,
        provider: 'Octopus'
      },
      {
        id: 'holaluz-clara',
        name: 'Holaluz Clara 24h',
        type: 'fija',
        kwh_price: 0.165,
        badge: 'Sin permanencia',
        recommended: false,
        details: 'Precio fijo 12 meses. 100% renovables. Sin letra pequeña.',
        affiliate: true,
        provider: 'Holaluz'
      },
      {
        id: 'repsol-fija',
        name: 'Repsol Luz Fija Hogar',
        type: 'fija',
        kwh_price: 0.172,
        badge: 'Precio fijo 18m',
        recommended: false,
        details: 'Precio bloqueado 18 meses. Sin sorpresas en la factura.',
        affiliate: true,
        provider: 'Repsol'
      },
      {
        id: 'pvpc',
        name: 'PVPC (mercado regulado)',
        type: 'regulada',
        kwh_price: null,
        badge: 'Sin afiliación',
        recommended: false,
        details: 'Tarifa regulada. Varía cada hora según el mercado.',
        affiliate: false,
        provider: 'OMIE'
      }
    ]
  },
  gas: {
    updated: '2026-03-01',
    tur_kwh: 0.1300,  // €/kWh TUR actual
    options: [
      {
        id: 'endesa-gas-libre',
        name: 'Endesa Gas Libre',
        kwh_price: 0.0950,
        badge: 'Recomendado IA',
        recommended: true,
        details: '0,095 €/kWh · Sin permanencia · Facturación mensual',
        affiliate: true
      },
      {
        id: 'naturgy-libre',
        name: 'Naturgy Gas Libre',
        kwh_price: 0.1100,
        badge: '',
        recommended: false,
        details: '0,110 €/kWh · 12 meses permanencia',
        affiliate: true
      },
      {
        id: 'iberdrola-fijo',
        name: 'Iberdrola Gas Fijo',
        kwh_price: 0.1180,
        badge: 'Precio fijo',
        recommended: false,
        details: '0,118 €/kWh · Precio bloqueado 12 meses',
        affiliate: true
      }
    ]
  },
  telecos: {
    updated: '2026-03-01',
    options: [
      {
        id: 'digi-1gb',
        name: 'Digi Fibra 1Gb + Móvil 50GB',
        price: 20.00,
        badge: 'Recomendado IA',
        recommended: true,
        details: 'Sin cláusulas ocultas. Cobertura Vodafone. Sin permanencia.',
        affiliate: true
      },
      {
        id: 'masmovil-600',
        name: 'MásMóvil Fibra 600Mb + 30GB',
        price: 25.99,
        badge: 'Popular',
        recommended: false,
        details: 'Sin permanencia. Precio estable.',
        affiliate: true
      },
      {
        id: 'simyo-300',
        name: 'Simyo Fibra 300Mb + 25GB',
        price: 29.99,
        badge: '',
        recommended: false,
        details: 'Fibra Movistar. Cobertura máxima.',
        affiliate: true
      }
    ]
  },
  combustible: {
    updated: '2026-03-17',
    avg_gasolina95: 1.749,
    avg_diesel: 1.589,
    message: 'Precios medios nacionales. Para gasolineras exactas integra la API de CNMC Geoportal.'
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600'); // cachear 1 hora en Vercel

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { vertical, consumo_kwh, consumo_caudal } = req.query;

  if (vertical && !TARIFAS[vertical]) {
    return res.status(404).json({ error: `Vertical "${vertical}" no encontrada` });
  }

  const data = vertical ? TARIFAS[vertical] : TARIFAS;

  // Si se pasa consumo, calcular precio estimado por tarifa
  if (vertical === 'luz' && consumo_kwh) {
    const kwh = parseFloat(consumo_kwh);
    const opts = TARIFAS.luz.options.map(opt => {
      let estimatedMonthly = null;
      if (opt.type === 'indexada') {
        estimatedMonthly = opt.base_price + kwh * TARIFAS.luz.pvpc_kwh * 0.85; // estimado indexada
      } else if (opt.kwh_price) {
        estimatedMonthly = kwh * opt.kwh_price + 4.50; // + término fijo estimado
      }
      return { ...opt, estimated_monthly: estimatedMonthly ? Math.round(estimatedMonthly * 100) / 100 : null };
    });
    return res.status(200).json({ ...TARIFAS.luz, options: opts, consumo_kwh: kwh });
  }

  if (vertical === 'gas' && consumo_kwh) {
    const kwh = parseFloat(consumo_kwh);
    const caudal = parseFloat(consumo_caudal) || 8.20;
    const opts = TARIFAS.gas.options.map(opt => ({
      ...opt,
      estimated_monthly: Math.round((caudal * 30 + kwh * opt.kwh_price) * 100) / 100
    }));
    return res.status(200).json({ ...TARIFAS.gas, options: opts, consumo_kwh: kwh });
  }

  return res.status(200).json(data);
};
