import os

css = """
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
  :root { --primary: #1641B0; --primary-light: #EFF6FF; --accent: #059669; --accent-light: #ECFDF5; --dark: #0F172A; --muted: #64748B; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #e2e8f0; font-family: 'Inter', sans-serif; color: var(--dark); }
  .pdf-page {
    width: 297mm; height: 210mm;
    margin: 10mm auto; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    position: relative; overflow: hidden; page-break-after: always;
    display: flex; flex-direction: column;
  }
  @media print {
    body { background: #fff; }
    .pdf-page { margin: 0; box-shadow: none; border: none; }
    @page { size: A4 landscape; margin: 0; }
  }
  .header { display: flex; justify-content: space-between; align-items: center; padding: 12mm 15mm 0; }
  .header-logo { font-size: 1.5rem; font-weight: 900; color: var(--primary); display: flex; align-items: center; gap: 8px; }
  .header-logo span { color: var(--accent); }
  .header-page { font-size: 0.9rem; font-weight: 600; color: var(--muted); }
  .content { flex: 1; padding: 10mm 15mm; display: flex; flex-direction: column; justify-content: center; }
  .footer { height: 8mm; background: var(--primary); color: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: space-between; padding: 0 15mm; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; }
  
  h1 { font-size: 3.5rem; font-weight: 900; line-height: 1.1; margin: 0 0 1rem; letter-spacing: -0.02em; color: var(--primary); }
  h2 { font-size: 2.8rem; font-weight: 800; line-height: 1.2; margin: 0 0 1.5rem; letter-spacing: -0.02em; }
  h3 { font-size: 1.8rem; font-weight: 700; margin: 0 0 1rem; color: var(--primary); }
  p { font-size: 1.2rem; line-height: 1.6; color: var(--muted); margin: 0 0 1rem; }
  
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15mm; align-items: center; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10mm; }
  .card { background: #fff; border: 2px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
  .card-primary { background: var(--primary-light); border: 2px solid var(--primary); }
  .card-accent { background: var(--accent-light); border: 2px solid var(--accent); }
  
  .tag { display: inline-block; padding: 6px 16px; background: var(--accent-light); color: var(--accent); font-weight: 700; border-radius: 99px; font-size: 0.9rem; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px;}
  .icon-box { width: 64px; height: 64px; border-radius: 16px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .icon-box svg { width: 32px; height: 32px; }
  
  ul { font-size: 1.2rem; line-height: 1.8; color: var(--dark); padding-left: 24px; }
  li { margin-bottom: 12px; }
  li::marker { color: var(--accent); font-weight: bold; }
  
  .pipeline { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; position: relative; }
  .pipeline::before { content: ''; position: absolute; top: 40px; left: 0; right: 0; height: 4px; background: #E2E8F0; z-index: 0; }
  .pipe-step { position: relative; z-index: 1; text-align: center; flex: 1; display:flex; flex-direction:column; align-items:center; }
  .pipe-circle { width: 80px; height: 80px; border-radius: 50%; background: #fff; border: 4px solid var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: var(--primary); margin-bottom: 16px; }
  .pipe-title { font-weight: 800; font-size: 1.1rem; color: var(--dark); margin-bottom: 8px; }
  .pipe-desc { font-size: 0.9rem; color: var(--muted); line-height: 1.4; padding: 0 10px; }
  .pipe-step.active .pipe-circle { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 0 0 8px var(--primary-light); }
  .pipe-step.action .pipe-circle { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 0 0 8px var(--accent-light); }
  
  .cover { background: linear-gradient(135deg, var(--dark) 0%, var(--primary) 100%); color: #fff; justify-content: center; padding: 20mm; }
  .cover h1 { color: #fff; font-size: 5rem; margin-bottom: 24px; }
  .cover p { color: rgba(255,255,255,0.8); font-size: 1.8rem; max-width: 800px; }
  .cover-logo { font-size: 3rem; font-weight: 900; display: flex; align-items: center; gap: 16px; margin-bottom: 60px; }
  
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 1.1rem; }
  th { background: var(--primary-light); color: var(--primary); font-weight: 800; text-align: left; padding: 16px; border-radius: 8px 8px 0 0; }
  td { padding: 16px; border-bottom: 1px solid #E2E8F0; color: var(--muted); }
  tr:last-child td { border-bottom: none; }
  .check { color: var(--accent); font-weight: bold; }
  .cross { color: #CBD5E1; }
"""

pages = [
    {
        "type": "cover",
        "content": """
      <div class="cover-logo">
        <svg width="48" height="48" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="9" fill="#059669"/><rect x="7" y="22" width="4" height="7" rx="1.5" fill="white" opacity=".6"/><rect x="13" y="17" width="4" height="12" rx="1.5" fill="white" opacity=".8"/><rect x="19" y="12" width="4" height="17" rx="1.5" fill="white"/><path d="M23 10L27 6l0 4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 6v7" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>
        Ahorra <span style="color:var(--accent)">360</span>
      </div>
      <h1>La app que gestiona<br>todos los gastos<br>de tu hogar</h1>
      <p>Inteligencia Artificial y analítica hiper-personalizada para proteger la economía de tu familia en piloto automático.</p>
        """
    },
    {
        "title": "Índice de Contenidos",
        "content": """
      <div class="grid-2" style="gap:30mm; margin-top: 40px;">
        <div>
          <ul style="list-style:none; padding:0; font-size:1.4rem; color:var(--dark); font-weight:600;">
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">01</span> ¿Qué es Ahorra 360?</li>
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">02</span> El Problema en el Mercado</li>
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">03</span> Cómo Funciona (Pipeline Visual)</li>
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">04</span> Características Diferenciales</li>
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">05</span> El Dashboard 360°</li>
          </ul>
        </div>
        <div>
           <ul style="list-style:none; padding:0; font-size:1.4rem; color:var(--dark); font-weight:600;">
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">06</span> Modelos de Negocio & Pricing</li>
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">07</span> Potencial de Mercado (TAM/SAM/SOM)</li>
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">08</span> Escalabilidad y Roadmap</li>
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">09</span> Caso de Éxito Simulacion</li>
            <li style="margin-bottom:24px; border-bottom:1px solid #E2E8F0; padding-bottom:12px"><span style="color:var(--primary); margin-right:16px">10</span> ¿Por qué ahora? (El Timing)</li>
          </ul>
        </div>
      </div>
        """
    },
    {
        "title": "1. ¿Qué es Ahorra 360?",
        "content": """
      <div class="tag">La Visión</div>
      <h2>Tu Asesor Financiero Autónomo</h2>
      <div class="grid-2">
        <div>
          <p>Ahorra 360 es una aplicación web y móvil que <strong>centraliza todos los gastos recurrentes</strong> de tu hogar: luz, gas, fibra, móvil, seguros, suscripciones, agua y combustible.</p>
          <p>Potenciada por Inteligencia Artificial y un modelo de datos propietario, nuestra app ingiere tus facturas, las interpreta en lenguaje humano y rastrea el mercado en tiempo real para confirmar si estás pagando de más.</p>
          <p>Y lo más revolucionario: <strong>Si no quieres hacer los trámites de cambio, nuestro agente humano (Concierge) interactúa con las compañías por ti.</strong></p>
        </div>
        <div class="grid-2" style="gap:20px">
          <div class="card card-primary" style="text-align:center">
             <i data-lucide="brain-circuit" style="width:40px;height:40px;color:var(--primary);margin-bottom:16px"></i>
             <div style="font-weight:800;font-size:1.3rem">IA Analítica</div>
             <div style="font-size:0.9rem;color:var(--muted);margin-top:8px">OCR Inteligente que entiende cualquier formato.</div>
          </div>
          <div class="card card-accent" style="text-align:center">
             <i data-lucide="bot" style="width:40px;height:40px;color:var(--accent);margin-bottom:16px"></i>
             <div style="font-weight:800;font-size:1.3rem">Delegación RPA</div>
             <div style="font-size:0.9rem;color:var(--muted);margin-top:8px">Bots y humanos gestionan la burocracia por ti.</div>
          </div>
           <div class="card" style="text-align:center">
             <i data-lucide="network" style="width:40px;height:40px;color:var(--dark);margin-bottom:16px"></i>
             <div style="font-weight:800;font-size:1.3rem">Multi-Vertical</div>
             <div style="font-size:0.9rem;color:var(--muted);margin-top:8px">Cobertura de todos los gastos estructurales.</div>
          </div>
           <div class="card" style="text-align:center">
             <i data-lucide="shield-check" style="width:40px;height:40px;color:var(--dark);margin-bottom:16px"></i>
             <div style="font-weight:800;font-size:1.3rem">Imparcialidad</div>
             <div style="font-size:0.9rem;color:var(--muted);margin-top:8px">100% agnósticos, sin influencia comercial.</div>
          </div>
        </div>
      </div>
        """
    },
    {
        "title": "2. El Problema Actual",
        "content": """
      <div class="tag">Market Pain</div>
      <h2>El Impuesto a la Pereza</h2>
      <div class="grid-3" style="margin-top: 40px;">
        <div class="card">
          <div class="icon-box"><i data-lucide="file-warning"></i></div>
          <h3>Opacidad Extrema</h3>
          <p>El 78% de los españoles no entiende su factura de la luz ni sabe qué tarifa tiene. Las empresas energéticas y telcos juegan con la ofuscación de términos (potencias valle, indexados, mantenimientos) para maximizar márgenes.</p>
        </div>
        <div class="card">
          <div class="icon-box"><i data-lucide="trending-up"></i></div>
          <h3>Inflación y Caducidad</h3>
          <p>Las promociones "reclamo" caducan, pasando al usuario a tarifas abusivas (80€/mes). Nadie lleva un registro mental de cuándo finalizan sus permanencias ni monitorea el mercado cada mes.</p>
        </div>
        <div class="card">
          <div class="icon-box"><i data-lucide="timer-off"></i></div>
          <h3>Fricción Burocrática</h3>
          <p>Aunque un comparador muestre un gran ahorro, llamar a un call center durante 40 minutos para pelear una baja es una repulsión psicológica que paraliza al 65% de usuarios insatisfechos.</p>
        </div>
      </div>
        """
    },
    {
        "title": "3. El Flujo de Uso (Pipeline)",
        "content": """
      <div class="tag">La Mecánica Mágica</div>
      <h2>Un Ciclo Virtuoso de 5 Pasos</h2>
      <p style="text-align:center; max-width: 800px; margin: 0 auto 40px; font-size:1.4rem;">De un simple PDF subido en 10 segundos a un ahorro ejecutado en tiempo real.</p>
      
      <div class="pipeline">
        <div class="pipe-step active">
          <div class="pipe-circle"><i data-lucide="upload-cloud" width="36" height="36"></i></div>
          <div class="pipe-title">1. INGESTA</div>
          <div class="pipe-desc">El usuario sube su factura por PDF, Foto, WhatsApp o vinculación de Gmail.</div>
        </div>
        <div class="pipe-step">
          <div class="pipe-circle">2</div>
          <div class="pipe-title">2. ENTIENDE</div>
          <div class="pipe-desc">La IA OCR extrae todos los datos: consumo, potencias y servicios fantasma.</div>
        </div>
        <div class="pipe-step">
          <div class="pipe-circle">3</div>
          <div class="pipe-title">3. COMPARA</div>
          <div class="pipe-desc">El motor simula el mismo consumo contra cientos de tarifas del mercado libres de comisiones ocultas.</div>
        </div>
        <div class="pipe-step">
          <div class="pipe-circle">4</div>
          <div class="pipe-title">4. RECOMIENDA</div>
          <div class="pipe-desc">Comunica en lenguaje humano por qué pierdes dinero y recomienda el switch perfecto.</div>
        </div>
        <div class="pipe-step action">
          <div class="pipe-circle"><i data-lucide="zap" width="36" height="36"></i></div>
          <div class="pipe-title">5. ACTÚA</div>
          <div class="pipe-title" style="color:var(--accent);font-size:0.8rem">GHOST MODE / CONCIERGE</div>
          <div class="pipe-desc">Haces el trámite tú mismo o <strong>delegas la burocracia</strong> con 1 click.</div>
        </div>
      </div>
        """
    },
    {
        "title": "4. Características Diferenciales",
        "content": """
      <div class="tag">Competitive Moat</div>
      <h2>Mucho Más que un Comparador</h2>
      <div class="grid-2">
        <div class="flex-col" style="gap:24px; display:flex; flex-direction:column">
          <div class="card" style="padding:20px; border-left: 6px solid var(--primary)">
            <h3 style="font-size:1.3rem; margin-bottom:8px">1. Enfoque 360° Multi-Vertical</h3>
            <p style="font-size:1rem; margin:0">No somos "el comparador de luz". Somos la capa centralizadora. Luz, gas, fibra, seguros y subscripciones en un solo dashboard semafórico.</p>
          </div>
          <div class="card" style="padding:20px; border-left: 6px solid var(--primary)">
            <h3 style="font-size:1.3rem; margin-bottom:8px">2. Neutralidad Garantizada</h3>
            <p style="font-size:1rem; margin:0">Los comparadores tradicionales priorizan tarifas que más comisión les pagan (CPA). Nuestro software alinea intereses con el cliente: recomendamos lo mejor objetivamente.</p>
          </div>
          <div class="card" style="padding:20px; border-left: 6px solid var(--primary)">
            <h3 style="font-size:1.3rem; margin-bottom:8px">3. Inteligencia Explicada</h3>
            <p style="font-size:1rem; margin:0">No vendemos listados de tarifas. Explicamos: <em>"Pagas 40€ de luz y tu consumo es a las 20h. Cámbiate a Octopus y ahorrarás 180€ al año"</em>.</p>
          </div>
        </div>
        <div class="flex-col" style="gap:24px; display:flex; flex-direction:column">
           <div class="card" style="padding:20px; border-left: 6px solid var(--accent)">
            <h3 style="font-size:1.3rem; margin-bottom:8px">4. Modo Concierge / Ghost</h3>
            <p style="font-size:1rem; margin:0">La automatización delegada. Presiona un botón y nuestros agentes o bots llaman a Endesa, sufren la espera de 40 mins y aplican el alta/baja.</p>
          </div>
          <div class="card" style="padding:20px; border-left: 6px solid var(--accent)">
            <h3 style="font-size:1.3rem; margin-bottom:8px">5. B2B2C: El Bróker Familiar</h3>
            <p style="font-size:1rem; margin:0">Envía un "WhatsApp Mágico" a padres/abuelos. Con la autorización de un SMS, puedes controlar/ahorrar centralizadamente los contratos de toda la familia.</p>
          </div>
          <div class="card" style="padding:20px; border-left: 6px solid #F59E0B">
            <h3 style="font-size:1.3rem; margin-bottom:8px">6. Alertas Proactivas</h3>
            <p style="font-size:1rem; margin:0">Te avisamos 15 días antes de que tu descuento promocional de fibra acabe (Inflación Cero) y orquesta una renegociación telefónica en la telco para retenerla.</p>
          </div>
        </div>
      </div>
        """
    },
    {
        "title": "5. Modelos de Negocio",
        "content": """
      <div class="tag">Monetización</div>
      <h2>Ingresos Escalonados B2C y B2B</h2>
      <div class="grid-2">
        <div>
          <h3 style="font-size: 1.5rem">1. Freemium (B2C Ads & CPA)</h3>
          <p>Se monetiza por comisiones de conversión directa (CPA) al derivar leads cualificados hiper-convertibles a las energéticas con modelos de adquisición agresivos.</p>
          
          <h3 style="font-size: 1.5rem; margin-top:24px">2. Suscripción Premium B2C</h3>
          <p><strong>SaaS 4,99 €/mes</strong>. Dashboard Multi-hogar familiar, Facturas IA Ilimitadas, Alertas Tempranas, Redacción legal de Burofaxes Anti-Abusos y Ranking 100% puro.</p>

          <h3 style="font-size: 1.5rem; margin-top:24px">3. Premium Concierge</h3>
          <p>Micro-transacción on-demand o Success Fee sobre el ahorro logrado para delegar el trámite en manos de la empresa que hace la portabilidad por teléfono.</p>
          
          <h3 style="font-size: 1.5rem; margin-top:24px; color:#F59E0B">4. White-Label B2B2C</h3>
          <p>Venta de licencias e infraestructura de "Analizador de Facturas de Ahorra 360" a bancos (Ej: widget integrado en la app de BBVA) o plataformas de HR de Remuneración Flexible.</p>
        </div>
        <div class="card" style="background: var(--dark); color: white; border: none; padding:32px">
          <h3 style="color:white; margin-bottom: 30px">Plan Base vs Premium</h3>
          <table style="width:100%; color:rgba(255,255,255,0.8); font-size:1rem">
            <tr>
              <th style="background:transparent; color:#94A3B8; text-transform:uppercase; font-size:0.8rem; padding:8px">Funcionalidad</th>
              <th style="background:transparent; color:#94A3B8; text-transform:uppercase; font-size:0.8rem; padding:8px; text-align:center">Free</th>
              <th style="background:transparent; color:var(--accent); text-transform:uppercase; font-size:0.8rem; padding:8px; text-align:center">Plus (4,99€)</th>
            </tr>
            <tr><td style="padding:12px 8px; border-bottom:1px solid #334155">Lector PDF IA</td><td style="text-align:center; padding:12px 8px; border-bottom:1px solid #334155" class="check">3 fact/m</td><td style="text-align:center; padding:12px 8px; border-bottom:1px solid #334155" class="check">Ilimitadas</td></tr>
            <tr><td style="padding:12px 8px; border-bottom:1px solid #334155">Ranking Comparador</td><td style="text-align:center; padding:12px 8px; border-bottom:1px solid #334155" class="check">Sí</td><td style="text-align:center; padding:12px 8px; border-bottom:1px solid #334155" class="check">Neutral 100%</td></tr>
            <tr><td style="padding:12px 8px; border-bottom:1px solid #334155">Alertas Caducidad Promo</td><td style="text-align:center; padding:12px 8px; border-bottom:1px solid #334155" class="cross">NO</td><td style="text-align:center; padding:12px 8px; border-bottom:1px solid #334155" class="check">SÍ</td></tr>
            <tr><td style="padding:12px 8px; border-bottom:1px solid #334155">Gestor Multi-Vivienda</td><td style="text-align:center; padding:12px 8px; border-bottom:1px solid #334155" class="cross">NO</td><td style="text-align:center; padding:12px 8px; border-bottom:1px solid #334155" class="check">SÍ</td></tr>
            <tr><td style="padding:12px 8px; border-bottom:none">Gestión Concierge Mágica</td><td style="text-align:center; padding:12px 8px; border-bottom:none" class="cross">NO</td><td style="text-align:center; padding:12px 8px; border-bottom:none" class="check">1 Tramite/Año</td></tr>
          </table>
        </div>
      </div>
        """
    },
    {
        "title": "6. Potencial de Mercado y Contexto",
        "content": """
      <div class="tag">Expansión Local & Global</div>
      <h2>18,5 Millones de Hogares Presos</h2>
      <div class="grid-2">
        <div>
          <h3>Timing: El Moment Momentum</h3>
          <p>Nos enfrentamos a la "Tormenta Perfecta": El final de los subsidios post-guerra ucraniana subirá agresivamente la luz. Al unísono, las Telcos consolidan mercado reduciendo descuentos.</p>
          <p>Y a nivel tecno: la tecnología de IA Generativa cruzó la brecha de certidumbre comercial, es capaz de tragar cualquier nivel de ruido burocrático legal para resumir qué cláusulas ocultas están estrangulando al ciudadano, a escala masiva.</p>
        </div>
        <div class="flex-col" style="gap:20px; display:flex; flex-direction:column">
          <div class="card" style="text-align:center; padding:30px">
            <div style="font-size:0.9rem; font-weight:700; color:var(--muted); text-transform:uppercase; margin-bottom:12px">TAM (Total Addressable Market)</div>
            <div style="font-size:3.5rem; font-weight:900; color:var(--dark); line-height:1">18,5 M</div>
            <div style="font-size:1.1rem; color:var(--muted); margin-top:8px">Hogares en España con suministros OBLIGATORIOS</div>
          </div>
          <div class="grid-2" style="gap:20px">
            <div class="card card-primary" style="text-align:center; padding:20px">
              <div style="font-size:0.8rem; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:8px">SAM (Serviceable Market)</div>
              <div style="font-size:2rem; font-weight:900; color:var(--primary); line-height:1">11,2 M</div>
              <div style="font-size:0.9rem; color:var(--primary); margin-top:8px">Bancarizados y Digitalmente Activos</div>
            </div>
            <div class="card card-accent" style="text-align:center; padding:20px">
              <div style="font-size:0.8rem; font-weight:700; color:var(--accent); text-transform:uppercase; margin-bottom:8px">SOM (Obj. a 3 años)</div>
              <div style="font-size:2rem; font-weight:900; color:var(--accent); line-height:1">250 K</div>
              <div style="font-size:0.9rem; color:var(--accent); margin-top:8px">Suscripciones / Usuarios Activos</div>
            </div>
          </div>
        </div>
      </div>
        """
    },
    {
        "title": "7. Escalabilidad y Fases",
        "content": """
      <div class="tag">El Roadmap Tecnológico y de Operaciones</div>
      <h2>Tres Pasos Hacia la Dominancia B2C/B2B</h2>
      
      <div class="card" style="margin-bottom:20px; border-left:8px solid var(--primary)">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <h3 style="margin:0; font-size:1.5rem">Fase 1: Utilidad Viral Inmediata <span style="font-size:1rem; font-weight:600; background:var(--primary-light); color:var(--primary); padding:4px 12px; border-radius:99px; margin-left:12px">1T 2026 - Actual</span></h3>
        </div>
        <p>Integración algorítmica de mercados core: <strong>Luz, Gas, Móvil, Fibra</strong>. Onboarding Burocracia-Cero mediante Bot Emulado en WhatsApp. Lectura IA, Magic Links, y panel consolidado (Vivienda propia y Casa Familiar).</p>
      </div>

      <div class="card" style="margin-bottom:20px; border-left:8px solid var(--accent)">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <h3 style="margin:0; font-size:1.5rem; color:var(--accent)">Fase 2: Concierge Hub y Nuevas Capas <span style="font-size:1rem; font-weight:600; background:var(--accent-light); color:var(--accent); padding:4px 12px; border-radius:99px; margin-left:12px">Hacia Q4 2026</span></h3>
        </div>
        <p>Salto a la automatización burocrática real (RPA Burofaxes directos integrados con correos). Entrada en Seguros (Mapfre/Direct Seguros) de Hogar y Coche. Gestión unificada de Micro-suscripciones y Alarmas.</p>
      </div>

      <div class="card" style="border-left:8px solid #F59E0B">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <h3 style="margin:0; font-size:1.5rem; color:#D97706">Fase 3: B2B API Latam y Anonimización <span style="font-size:1rem; font-weight:600; background:#FEF3C7; color:#B45309; padding:4px 12px; border-radius:99px; margin-left:12px">2027</span></h3>
        </div>
        <p>Modelo White-Label ("Powered by Ahorra 360") para banca (Ing Santander, etc) para fidelizar retenciones de nómina. Internacionalización a Portugal y México. Venta legal de datasets agregados/anonimizados hiper-locales de inflación real de la familia a fondos de inversión macro.</p>
      </div>
        """
    },
    {
        "title": "8. Caso Clínico: María (38 años)",
        "content": """
      <div class="tag">Caso de Estudio Real - Demo App</div>
      <h2>La Revolución "Lazy Profitable" en 2 minutos</h2>
      <div class="grid-2">
        <div>
          <h3 style="margin-bottom:8px">El Caso Inicial</h3>
          <p>María, 38, auditora, 2 hijos en Madrid Centro. Sin huecos vitales. Enciende la TV y hablan de que "baja la luz", pero se rinde porque cree tener permanencia obligatoria en su factura.</p>
          <p>Tarda literalmente <strong>12 segundos</strong> en soltar el PDF de Naturgy que llega a su Gmail en el Bot de WhatsApp de <em>Ahorra 360</em>.</p>
          
          <h3 style="margin-top:20px; margin-bottom:8px">El Diagnóstico IA</h3>
          <ul style="font-size:1.1rem; color:var(--dark)">
            <li>Sigue asfixiada en un precio base no regulado a las 20h <strong>(+ 80€/mes extra)</strong>.</li>
            <li>Cargan "Mantenimiento Gold" que nunca solicitó comercialmente <strong>(9€/mes extra)</strong>.</li>
            <li>En su Fibra, caducó la rebaja comercial y paga <strong>(+ 18€/mes).</strong></li>
          </ul>
        </div>
        <div class="card" style="background:var(--accent); color:white; border:none; padding:40px; display:flex; flex-direction:column; justify-content:center; align-items:center">
          <i data-lucide="shield-check" style="width:64px;height:64px;margin-bottom:20px;opacity:0.9"></i>
          <h3 style="color:white; font-size:2rem; margin-bottom:10px; text-align:center">1-Click Resolución "Ghost"</h3>
          <p style="color:rgba(255,255,255,0.9); text-align:center; font-size:1.1rem; line-height:1.5">Acepta la "Suscripción Premium 4,99€" usando Apple Pay. En el instante, activa el Ghost Mode sobre el dashboard.</p>
          <p style="color:rgba(255,255,255,0.9); text-align:center; font-size:1.1rem; line-height:1.5; font-weight:800">Ahorra 360 encripta un burofax demandando los cargos de mantenimiento abusivos de Naturgy, y orquesta en plano paralelo una portabilidad a tarifa variable plana.</p>
          <div style="margin-top:30px; padding:15px 30px; background:rgba(0,0,0,0.2); border-radius:12px; font-weight:900; font-size:2.2rem;">AHORRO: +520 € / AÑO</div>
        </div>
      </div>
        """
    },
    {
        "type": "cover",
        "content": """
      <div class="cover-logo">Ahorra <span style="color:var(--accent)">360</span></div>
      <h1 style="color:white; font-size:4.5rem">Devolviendo el poder<br>a tu hogar.<br><span style="color:var(--accent)">Un recibo a la vez.</span></h1>
      <p style="margin-top:40px; font-size:1.5rem; opacity:0.9">Inversión & Growth: founders@ahorra360.es</p>
      <div style="margin-top: auto; display:flex; gap: 20px; margin-top:80px">
        <div style="background:white; color:var(--primary); padding: 15px 30px; border-radius:99px; font-weight:800; display:flex; align-items:center; gap:10px"><i data-lucide="globe"></i> Demo Activa B2C: app.ahorra360.es</div>
      </div>
        """
    }
]

html_str = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ahorra 360 - Pitch Deck PDF</title>
  <style>{css}</style>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>"""

for i, page in enumerate(pages):
    if page.get("type") == "cover":
        html_str += f"""<div class="pdf-page cover">{page['content']}</div>"""
    else:
        title_str = f"<h1>{page['title']}</h1>" if "title" in page else ""
        html_str += f"""
      <div class="pdf-page">
        <div class="header">
          <div class="header-logo">
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="9" fill="#1641B0"/><rect x="7" y="22" width="4" height="7" rx="1.5" fill="white" opacity=".6"/><rect x="13" y="17" width="4" height="12" rx="1.5" fill="white" opacity=".8"/><rect x="19" y="12" width="4" height="17" rx="1.5" fill="white"/><path d="M23 10L27 6l0 4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 6v7" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>
            Ahorra<span>360</span>
          </div>
          <div class="header-page">Confidencial - Pitch Deck</div>
        </div>
        <div class="content">
          <div style="margin-bottom: 20mm">
            {title_str}
          </div>
          {page['content']}
        </div>
        <div class="footer">
          <span>Ahorra 360 | The Autonomous Home Manager Engine (B2B2C / B2C)</span>
          <span>Página {i + 1}</span>
        </div>
      </div>
        """

html_str += """
  <script>
    lucide.createIcons();
    const btn = document.createElement('button');
    btn.innerHTML = '<i data-lucide="printer" style="width:20px;height:20px"></i> Descargar a PDF (Ctrl + P)';
    btn.style.cssText = 'position:fixed; bottom:30px; right:30px; padding:15px 25px; background:#059669; color:white; border:none; border-radius:99px; font-weight:800; font-size:1.1rem; box-shadow:0 10px 20px rgba(5,150,105,0.3); cursor:pointer; display:flex; gap:10px; align-items:center; z-index:999; font-family:Inter,sans-serif';
    btn.className = 'print-btn';
    btn.onclick = () => window.print();
    document.body.appendChild(btn);
    
    const style = document.createElement('style');
    style.innerHTML = '@media print { .print-btn { display: none !important; } }';
    document.head.appendChild(style);
  </script>
</body>
</html>
"""

with open('C:/Users/ignac/Ahorra 360/Ahorra360_Pitch_Deck_Inversor.html', 'w', encoding='utf-8') as f:
    f.write(html_str)

print("Pitch deck generado exitosamente en C:/Users/ignac/Ahorra 360/Ahorra360_Pitch_Deck_Inversor.html")
