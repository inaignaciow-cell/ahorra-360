/* ═══════════════════════════════════════════
   AHORRA 360 — app.js  v5
   ═══════════════════════════════════════════ */

// ── SUPABASE ──────────────────────────────
const SUPA_URL = 'https://gzkhrgmfbzkskmnselnz.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6a2hyZ21mYnprc2ttbnNlbG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzAzNzYsImV4cCI6MjA4OTI0NjM3Nn0.t9yFb6qtHQCGfF4n9HOLU-uceIVUYXxDsAp3BSXbl50';

// supabase client — se inicializa en initApp() una vez el CDN UMD está cargado
let supabase = null;

const DEMO_MODE = false; // producción real

// ── USER STATE ────────────────────────────
let currentUser = null;
let USER_BILLS  = []; // siempre array — nunca null


// ── THEME ──────────────────────────────────
const html = document.documentElement;
const saved = localStorage.getItem('ahorra360-theme') || 'light';
html.setAttribute('data-theme', saved);
const themeBtn = document.getElementById('themeBtn');
if (themeBtn) themeBtn.addEventListener('click', () => {
  const n = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', n);
  localStorage.setItem('ahorra360-theme', n);
});

// ── TOAST ──────────────────────────────────
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  t.style.background = type==='error' ? 'var(--color-danger)' :
                        type==='ok'    ? 'var(--color-accent)' : 'var(--text-primary)';
  t.style.color = '#fff';
  clearTimeout(t._to);
  t._to = setTimeout(() => { t.style.display='none'; }, 3000);
}

// ── MOCK DATA ─────────────────────────────
const MOCK_BILLS = [
  { id:1, vertical:'luz',        emoji:'⚡', name:'Endesa — Tarifa 2.0TD',      amount:66.23, date:'2026-03-01', saving:180, status:'analizado',
    lines:[
      {name:'Término de potencia (P1)',  amount:14.50, info:'Potencia contratada: 3.45 kW', conf:'high'},
      {name:'Término de potencia (P2)',  amount:8.20,  info:'Potencia valle', conf:'high'},
      {name:'Energía consumida P1',      amount:18.30, info:'234 kWh punta · 0.1847 €/kWh', conf:'high'},
      {name:'Energía consumida P2',      amount:11.10, info:'123 kWh llano', conf:'medium'},
      {name:'Energía consumida P3',      amount:6.40,  info:'98 kWh valle', conf:'medium'},
      {name:'Impuesto electricidad (5%)',amount:2.91,  info:'Regulado, no negociable', conf:'high'},
      {name:'Alquiler contador',         amount:0.81,  info:'Coste fijo mensual REE', conf:'high'},
      {name:'IVA (21%)',                 amount:4.01,  info:'Aplicado sobre la base', conf:'high'},
    ],
    recs:[
      {title:'Bajar potencia a 3.45 kW', saving:45, effort:'Baja', info:'Nunca superas los 2.8 kW reales. Podrías bajar sin cortes.'},
      {title:'Cambiar hábitos: lavadora en horario valle', saving:60, effort:'Baja', info:'De 22h a 8h la energía cuesta hasta 3x menos. '},
      {title:'Cambiar a tarifa indexada (PVPC-plus)', saving:75, effort:'Media', info:'Según tu perfil de consumo ahorrarías con PVPC en verano.'},
    ],
    chatContext:'factura de luz Endesa, 234 kWh, tarifa 2.0TD, potencia 3.45kW, importe €66.23'
  },
  { id:2, vertical:'telecos',    emoji:'📱', name:'Orange — Pack Fusión 100',   amount:49.99, date:'2026-02-15', saving:276, status:'alerta',
    lines:[
      {name:'Fibra 100 Mb simétrico', amount:20.00, info:'Tarifa base fibra', conf:'high'},
      {name:'Línea móvil 30 GB',      amount:18.00, info:'Sin roaming UE', conf:'high'},
      {name:'Descuento fidelización', amount:-5.00, info:'⚠️ Caduca en 18 días el 04/04/2026', conf:'high'},
      {name:'IVA (21%)',              amount:11.55, info:'Sobre tarifa base+móvil', conf:'high'},
      {name:'TV Orange (addon)',      amount:5.44,  info:'Cine+Series — ¿lo miras?', conf:'medium'},
    ],
    recs:[
      {title:'Cambiar a Digi (misma cobertura)', saving:276, effort:'Baja', info:'Fibra 1Gb + móvil 50GB por €20/mes. Ahorro €30/mes sin permanencia.'},
      {title:'Cancelar TV Orange', saving:65, effort:'Baja', info:'Si no ves el addon de TV, €5.44/mes de ahorro puro.'},
      {title:'Negociar renovación antes del 04/04', saving:120, effort:'Media', info:'Retención te puede ofrecer mismo precio u otro descuento.'},
    ],
    chatContext:'factura telecos Orange Fusión, €49.99/mes, promo caduca 04/04/2026, fibra 100Mb + móvil 30GB'
  },
  { id:3, vertical:'gas',        emoji:'🔥', name:'Naturgy — TUR Gas',          amount:38.60, date:'2026-02-10', saving:120, status:'analizado',
    lines:[
      {name:'Caudal fijo (€/día)',    amount:8.20,  info:'Término fijo regulado', conf:'high'},
      {name:'Consumo: 148 kWh',       amount:19.24, info:'Precio TUR: 0.1300 €/kWh', conf:'high'},
      {name:'Impuesto hidrocarburos', amount:2.30,  info:'Regulado', conf:'high'},
      {name:'IVA (21%)',              amount:8.86,  info:'', conf:'high'},
    ],
    recs:[
      {title:'Salir de TUR a tarifa libre', saving:84, effort:'Media', info:'Endesa Gas libre: 0.095 €/kWh vs tu 0.130 €/kWh actual.'},
      {title:'Revisar caldera (eficiencia)', saving:36, effort:'Alta', info:'Caldera A+ reduce consumo en torno a un 15-20%.'},
    ],
    chatContext:'factura gas Naturgy TUR, 148 kWh, €38.60, caudal fijo €8.20'
  },
];

const MOCK_COMPARATOR = {
  luz:[
    {name:'Octopus Energy Flex',      price:52.10, saving:14.13, badge:'Recomendado IA', recommended:true, provider:'Octopus',  details:'Indexada OMIE + 3€/mes. Ideal si consumes en valle.', affiliate:true},
    {name:'Holaluz Clara 24h',        price:55.80, saving:10.43, badge:'Sin permanencia',recommended:false,provider:'Holaluz',  details:'Precio fijo 12m. Renovables 100%.', affiliate:true},
    {name:'Repsol Luz Fija Hogar',    price:58.40, saving:7.83,  badge:'Precio fijo',   recommended:false,provider:'Repsol',   details:'Precio bloqueado 18 meses. Sin sorpresas.', affiliate:true},
    {name:'PVPC (precio mercado)',    price:59.20, saving:7.03,  badge:'Sin afiliación',recommended:false,provider:'Red',      details:'Tarifa regulada. Varía cada hora.', affiliate:false},
    {name:'Iberdrola Click Fija',     price:63.50, saving:2.73,  badge:'',              recommended:false,provider:'Iberdrola',details:'Contrato 12m renovable.', affiliate:true},
  ],
  gas:[
    {name:'Endesa Gas Libre',         price:31.20, saving:7.40,  badge:'Recomendado IA', recommended:true, details:'0.095€/kWh · Sin permanencia', affiliate:true},
    {name:'Naturgy Gas Libre',        price:33.80, saving:4.80,  badge:'',              recommended:false, details:'0.110€/kWh · 12m permanencia', affiliate:true},
    {name:'Iberdrola Gas Fijo',       price:35.40, saving:3.20,  badge:'Precio fijo',   recommended:false, details:'0.118€/kWh · Precio bloqueado', affiliate:true},
    {name:'TUR Gas (actual)',         price:38.60, saving:0,     badge:'Tu tarifa actual',recommended:false,details:'0.130€/kWh · Precio regulado', affiliate:false},
  ],
  telecos:[
    {name:'Digi Fibra 1Gb + Móvil 50GB', price:20.00, saving:29.99, badge:'Recomendado IA', recommended:true, details:'Sin cláusulas ocultas. Cobertura: Vodafone.', affiliate:true},
    {name:'MásMóvil Fibra 600Mb + 30GB', price:25.99, saving:24.00, badge:'Popular',        recommended:false, details:'Sin permanencia. Precio estable.', affiliate:true},
    {name:'Simyo Fibra 300Mb + 25GB',    price:29.99, saving:20.00, badge:'',              recommended:false, details:'Fibra Movistar.', affiliate:true},
    {name:'Orange Fusión 100 (actual)',   price:49.99, saving:0,     badge:'Tu tarifa actual',recommended:false,details:'⚠️ Promo caduca 04/04/2026', affiliate:false},
  ],
  combustible:[
    {name:'Repsol — C/ Gran Vía',   price:1.749, saving:0.050, badge:'Más barata cerca', recommended:true,  details:'0.3 km · Horario: 24h'},
    {name:'BP — C/ Princesa',       price:1.779, saving:0.020, badge:'',                recommended:false, details:'1.1 km · Horario: 6-23h'},
    {name:'Cepsa — M-30',           price:1.789, saving:0.010, badge:'',                recommended:false, details:'2.4 km · Autopista'},
    {name:'Shell — C/ Bravo Murillo',price:1.799,saving:0,     badge:'Tu última gasolinera',recommended:false,details:'0.8 km'},
  ],
};

const MOCK_ALERTS = [
  {id:1, sev:'urgent',  title:'Promo Orange caduca en 18 días', body:'Tu descuento de €5/mes desaparece el 04/04/2026. Sin acción, subirás a €79.99/mes.', cta:'Ver comparador',  ctaFn:"navigate('comparador')", daysLeft:18},
  {id:2, sev:'warning', title:'Factura de luz subió un 22%',  body:'Tu último recibo de Endesa: €66.23 vs €54.30 en febrero. La IA detecta la causa.', cta:'Ver detalle', ctaFn:"openBill(1)"},
  {id:3, sev:'info',    title:'BP en Gran Vía bajó a 1.749 €/l', body:'La gasolinera más cercana bajó su precio. Si repostas mañana ahorras ~€3.', cta:'Ver combustible', ctaFn:"setCompTab('combustible',null)"},
];

const MOCK_QUICKWINS = [
  {title:'Bajar potencia eléctrica a 3.45 kW', saving:'€45/año', effort:'2 min',  fn:"openBill(1)"},
  {title:'Cambiar lavadora al horario valle (22-8h)', saving:'€60/año', effort:'0 min', fn:''},
  {title:'Cambiar a Digi (misma cobertura)', saving:'€276/año', effort:'15 min', fn:"navigate('comparador')"},
];

const MOCK_VERTICAL_STATUS = [
  {emoji:'⚡', name:'Luz',        status:'warning', label:'Tarifa suboptimal'},
  {emoji:'🔥', name:'Gas',        status:'warning', label:'En TUR — puede mejorar'},
  {emoji:'📱', name:'Telecos',    status:'urgent',  label:'⚠ Promo caduca en 18d'},
  {emoji:'⛽', name:'Combustible',status:'ok',       label:'Precio razonable'},
  {emoji:'🛡️', name:'Seguros',    status:'none',    label:'Sin analizar'},
];

const ACHIEVEMENTS = [
  {emoji:'📄', title:'Primera factura',    desc:'Subiste tu primera factura', unlocked:true},
  {emoji:'⚡', title:'Experto en Luz',     desc:'Analizaste 3 facturas de luz', unlocked:true},
  {emoji:'🥷', title:'Ahorrador Ninja',   desc:'Seguiste 5 recomendaciones IA', unlocked:false},
  {emoji:'🔥', title:'Campeón del Gas',   desc:'Optimizaste tu tarifa de gas',  unlocked:false},
  {emoji:'📱', title:'Sin Permanencia',   desc:'Cambiaste de proveedor telecos', unlocked:false},
  {emoji:'💚', title:'Eco Friendly',      desc:'Reduciste 200kWh en un mes',    unlocked:false},
];

const HOGAR_SERVICES = [
  {emoji:'⚡', name:'Luz',        provider:'Endesa',   amount:66.23, expiry:'2027-06', active:true},
  {emoji:'🔥', name:'Gas',        provider:'Naturgy',  amount:38.60, expiry:'2026-09', active:true},
  {emoji:'📱', name:'Telecos',    provider:'Orange',   amount:49.99, expiry:'2026-04', active:true},
  {emoji:'⛽', name:'Combustible',provider:'—',        amount:0,     expiry:'',       active:false},
  {emoji:'🛡️', name:'Seguros',    provider:'—',        amount:0,     expiry:'',       active:false},
];

const SPENDING_HISTORY = [
  {month:'Abr',total:168},{month:'May',total:155},{month:'Jun',total:130},
  {month:'Jul',total:112},{month:'Ago',total:118},{month:'Sep',total:135},
  {month:'Oct',total:152},{month:'Nov',total:170},{month:'Dic',total:178},
  {month:'Ene',total:165},{month:'Feb',total:148},{month:'Mar',total:154},
];

// ── ROUTING ───────────────────────────────
let currentPage = 'inicio';
let currentBill = null;
let currentCompTab = 'luz';
let compConsumption = { luz: 234, gas: 148, telecos: 30 };

function navigate(page) {
  if(page === 'upload'){ document.getElementById('uploadZone').scrollIntoView({behavior:'smooth'}); navigate('bandeja'); return; }
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if(el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  document.querySelectorAll('.mob-btn').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  // init page
  if(page==='inicio')     renderInicio();
  if(page==='bandeja')    renderBandeja();
  if(page==='comparador') renderComparador();
  if(page==='score')      renderScore();
  if(page==='alertas')    renderAlertas();
  if(page==='hogar')      renderHogar();
  if(page==='perfil')     renderPerfil();
  if(typeof lucide !== 'undefined') setTimeout(()=>lucide.createIcons(),50);

  // Mostrar tutorial inteligente si es la primera vez
  setTimeout(() => showTutorial(page), 400);
}

// ── ONBOARDING TUTORIALS ──────────────────
function showTutorial(page) {
  const viewed = JSON.parse(localStorage.getItem('ahorra360-tutorials') || '{}');
  if (viewed[page]) return; // Ya lo vio

  const tuts = {
    inicio: { title: '¡Bienvenido a tu Panel!', text: 'Aquí verás un resumen rápido de tu salud financiera y las alertas más importantes que nuestra IA encuentre para ti.' },
    bandeja: { title: 'Tu buzón digital', text: 'Sube tus facturas arrastrándolas o toma una foto desde el móvil. La IA extraerá todos los datos al instante para empezar a buscar ahorros.' },
    comparador: { title: 'El Comparador Inteligente', text: 'No busques tú. La IA compara tus facturas automáticamente contra todo el mercado de luz, gas y telecos vivos.' },
    hogar: { title: 'Configura tu Casa', text: 'Añade los m² y cuántos vivís para que la IA sepa decirte si estás consumiendo más de lo normal.' },
    alertas: { title: 'Alertas tempranas', text: 'Nuestra IA lee la letra pequeña por ti, avisándote si una promoción caduca pronto o si te han colado un recargo injustificado.' }
  };

  const t = tuts[page];
  if (!t) return;

  // Marcar como visto
  viewed[page] = true;
  localStorage.setItem('ahorra360-tutorials', JSON.stringify(viewed));

  // Crear el modal
  const overlay = document.createElement('div');
  overlay.className = 'animate-fade-in';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  
  const modal = document.createElement('div');
  modal.className = 'animate-slide-up';
  modal.style.cssText = 'background:var(--bg-surface);padding:30px;border-radius:24px;width:100%;max-width:400px;text-align:center;box-shadow:var(--shadow-xl);border:1px solid var(--border)';
  
  modal.innerHTML = `
    <div style="width:60px;height:60px;background:var(--ai-gradient);border-radius:18px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:white;font-size:24px">✨</div>
    <h3 style="font-family:var(--font-heading);font-weight:800;font-size:1.3rem;margin-bottom:12px;color:var(--text-primary)">${t.title}</h3>
    <p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.5;margin-bottom:24px">${t.text}</p>
    <button class="btn btn-primary btn-lg w-full" style="border-radius:99px" onclick="this.parentElement.parentElement.remove()">¡Entendido!</button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function openBill(id) {
  currentBill = getBills().find(b=>String(b.id)===String(id));
  if(!currentBill) return;
  navigate('detalle');
  renderDetalle();
}

// ── HELPERS ────────────────────────────────
function animateCounter(el, target, dur=1400, prefix='', suffix='') {
  if(!el) return;
  const start = performance.now();
  const step = now => {
    const p = Math.min((now-start)/dur,1);
    const ease = 1 - Math.pow(1-p,3);
    el.textContent = prefix + Math.round(target*ease).toLocaleString('es-ES') + suffix;
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function fmt(n){ return '€'+n.toFixed(2).replace('.',','); }
function fmtSaving(n){ return n>0?'+'+fmt(n):'−'+fmt(Math.abs(n)); }

// ── AUTH HELPERS ─────────────────────────────
// Detect which page we're on
const isDashboard = ()=>!!document.getElementById('page-inicio');

// Show toast in both auth.html and dashboard.html
function authToast(msg, type='') {
  // dashboard toast
  const dt = document.getElementById('toast');
  if(dt) {
    dt.textContent=msg;
    dt.style.display='block';
    dt.style.background=type==='error'?'var(--color-danger)':type==='ok'?'var(--color-accent)':'var(--text-primary)';
    dt.style.color='#fff';
    clearTimeout(dt._to);
    dt._to=setTimeout(()=>{dt.style.display='none';},3000);
    return;
  }
  // auth.html inline toast
  let t = document.getElementById('authToastEl');
  if(!t) {
    t=document.createElement('div');
    t.id='authToastEl';
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 22px;border-radius:10px;font-size:.875rem;font-weight:600;z-index:9999;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.15);transition:all .3s ease';
    document.body.appendChild(t);
  }
  t.textContent=msg;
  t.style.background=type==='error'?'#DC2626':type==='ok'?'#059669':'#1641B0';
  t.style.color='#fff';
  t.style.display='block';
  clearTimeout(t._to);
  t._to=setTimeout(()=>{ t.style.display='none'; },3200);
}

async function registerUser(email, pass) {
  if(!supabase) {
    authToast('Cuenta creada en modo demo ✓','ok');
    setTimeout(()=>{ window.location.href='dashboard.html'; }, 900);
    return true;
  }
  const {data, error} = await supabase.auth.signUp({email, password:pass});
  if(error){ authToast(error.message,'error'); return false; }
  // If email confirmation needed
  if(data.user && !data.session) {
    authToast('Revisa tu email para confirmar la cuenta ✉️','ok');
    return false;
  }
  return true;
}

async function loginUser(email, pass) {
  if(!supabase) {
    authToast('Iniciando sesión en modo demo...','ok');
    setTimeout(()=>{ window.location.href='dashboard.html'; }, 700);
    return;
  }
  const {error} = await supabase.auth.signInWithPassword({email, password:pass});
  if(error){ authToast(error.message,'error'); return; }
  window.location.href='dashboard.html';
}

async function loginWithGoogle() {
  if(!supabase) {
    // Demo mode — redirect directly
    authToast('Conectando con Google en modo demo...','ok');
    setTimeout(()=>{ window.location.href='dashboard.html'; }, 800);
    return;
  }
  await supabase.auth.signInWithOAuth({
    provider:'google',
    options:{ redirectTo: window.location.origin+'/dashboard.html' }
  });
}
async function setHogar(name) {
  authToast('Hogar "'+name+'" creado ✓','ok');
  setTimeout(()=>{
    if(typeof goToView==='function') goToView('aha');
    else window.location.href='dashboard.html';
  }, 800);
}
async function saveProfile() {
  const name  = document.getElementById('pNombre')?.value?.trim();
  if (!name) return showToast('Introduce tu nombre', 'error');
  try {
    if (supabase && currentUser) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) throw error;
    }
    // Update sidebar & avatar immediately
    const init = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    setSidebarUser(name, currentUser?.email || '', init);
    const av = document.getElementById('profileAvatar'); if(av) av.textContent = init;
    const pn = document.getElementById('profileName');  if(pn) pn.textContent = name;
    showToast('Perfil guardado ✓', 'ok');
  } catch(err) {
    showToast('Error al guardar: ' + err.message, 'error');
  }
}

async function saveHogar() {
  const nombre   = document.getElementById('hNombre')?.value?.trim();
  const cp       = document.getElementById('hCP')?.value?.trim();
  const m2       = parseInt(document.getElementById('hM2')?.value) || null;
  const personas = parseInt(document.getElementById('hPersonas')?.value) || null;
  const tipo     = document.getElementById('hTipo')?.value;
  const zona     = document.getElementById('hZona')?.value;
  try {
    if (supabase && currentUser) {
      const { error } = await supabase.from('profiles').upsert({
        id: currentUser.id,
        hogar_nombre: nombre || null,
        hogar_cp:     cp || null,
        hogar_m2:     m2,
        hogar_personas: personas,
        hogar_tipo:   tipo,
        hogar_zona:   zona,
        updated_at:   new Date().toISOString()
      });
      if (error) throw error;
    }
    showToast('Hogar guardado ✓', 'ok');
  } catch(err) {
    showToast('Error al guardar: ' + err.message, 'error');
  }
}

async function markAllRead() {
  ['alertasUrgenteList','alertasImportanteList','alertasInfoList'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:.85rem;text-align:center">✓ Sin alertas pendientes</div>';
  });
  const badge = document.getElementById('badgeAlertas');
  if(badge) badge.textContent = '';
  showToast('Todo marcado como leído ✓', 'ok');
}

async function addService() {
  if(document.getElementById('addServiceOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'addServiceOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:var(--bg-surface);padding:28px;border-radius:24px;width:100%;max-width:380px;box-shadow:var(--shadow-xl);border:1px solid var(--border);animation:slideUp .25s ease">
      <h3 style="font-weight:800;font-size:1.1rem;margin-bottom:18px">+ Añadir servicio</h3>
      <div class="flex-col gap-3">
        <div class="input-group"><label class="input-label">Tipo de servicio</label>
          <select class="input" id="newSvcType">
            <option value="luz">⚡ Luz</option>
            <option value="gas">🔥 Gas</option>
            <option value="telecos">📱 Telecos</option>
            <option value="combustible">⛽ Combustible</option>
            <option value="seguros">🛡️ Seguros</option>
          </select></div>
        <div class="input-group"><label class="input-label">Proveedor</label>
          <input class="input" id="newSvcProvider" placeholder="Ej: Iberdrola, Orange..."/></div>
        <div class="input-group"><label class="input-label">Coste mensual (€)</label>
          <input class="input" type="number" id="newSvcAmount" placeholder="49.99" min="0" step="0.01"/></div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-secondary w-full" onclick="document.getElementById('addServiceOverlay').remove()">Cancelar</button>
          <button class="btn btn-primary w-full" onclick="confirmAddService()">Añadir</button>
        </div>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function confirmAddService() {
  const emojiMap = {luz:'⚡',gas:'🔥',telecos:'📱',combustible:'⛽',seguros:'🛡️'};
  const type     = document.getElementById('newSvcType')?.value;
  const provider = document.getElementById('newSvcProvider')?.value?.trim();
  const amount   = parseFloat(document.getElementById('newSvcAmount')?.value || '0');
  if (!provider) return showToast('Introduce el nombre del proveedor', 'error');
  HOGAR_SERVICES.push({
    emoji: emojiMap[type]||'📋',
    name: type.charAt(0).toUpperCase()+type.slice(1),
    provider, amount, expiry:'', active:true
  });
  document.getElementById('addServiceOverlay')?.remove();
  renderHogar();
  showToast('Servicio añadido ✓', 'ok');
}

// ════════════════════════════════════════════
//  RENDER FUNCTIONS
// ════════════════════════════════════════════

// ── INICIO ────────────────────────────────
function renderInicio() {
  const hour = new Date().getHours();
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const wt = document.getElementById('welcomeTitle');
  if(wt) wt.textContent = greeting + ' 👋';
  // Dynamic date subtitle
  const dateEl = document.getElementById('headerDateSub');
  if(dateEl) {
    const now = new Date();
    const days   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    dateEl.textContent = `Copiloto IA activo · ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  // Banner de datos de ejemplo para usuarios sin facturas
  const demoBanner = document.getElementById('demoBanner');
  if(demoBanner) demoBanner.style.display = isUsingDemoData() ? 'flex' : 'none';

  // AI INSIGHTS
  const insights = [
    { sev:'urgent',  icon:'🔴', title:'Promo Orange caduca en 18 días', body:'Sin acción subirás de €49,99 a €79,99. Cambiando a Digi ahorras €276/año.', cta:'Ver alternativas', fn:"navigate('comparador')" },
    { sev:'warning', icon:'🟡', title:'Factura de luz subió un 22%',    body:'Endesa cobró €66,23 vs €54,30 el mes anterior. La IA encontró 3 causas.', cta:'Ver desglose', fn:'openBill(1)' },
    { sev:'success', icon:'🟢', title:'Tu gas puede bajar €7,40/mes',   body:'Saliendo del TUR a tarifa libre con Endesa Gas ahorras €88/año.', cta:'Comparar gas', fn:"setCompTab('gas',null);navigate('comparador')" },
  ];
  const ic = document.getElementById('insightsContainer');
  if(ic) ic.innerHTML = insights.map(i=>`
    <div class="insight-card ${i.sev}" style="animation:fadeIn 0.4s ease both">
      <span style="font-size:1.2rem;flex-shrink:0">${i.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:3px">${i.title}</div>
        <div style="font-size:.8rem;color:var(--text-secondary)">${i.body}</div>
      </div>
      <button class="btn btn-secondary btn-sm" style="flex-shrink:0" onclick="${i.fn}">${i.cta} →</button>
    </div>`).join('');

  // STATS
  const bills       = getBills();
  const totalSaving = bills.reduce((s,b)=>s+(b.saving||0),0);
  const totalSpend  = bills.reduce((s,b)=>s+(b.amount||0),0);
  const statsData = [
    { label:'Ahorro potencial anual', value:totalSaving,   prefix:'€', color:'var(--color-accent)',  icon:'💰' },
    { label:'Gasto mensual actual',   value:totalSpend,    prefix:'€', color:'var(--text-primary)', icon:'📊' },
    { label:'Facturas analizadas',    value:bills.length,  prefix:'', color:'var(--color-primary)', icon:'📄' },
    { label:'Score eficiencia',       value:62,            prefix:'', suffix:'/100', color:'var(--color-teal)', icon:'🎯' },
  ];
  const sg = document.getElementById('statsGrid');
  if(sg) sg.innerHTML = statsData.map(s=>`
    <div class="stat-card">
      <div class="stat-label">${s.icon} ${s.label}</div>
      <div class="stat-value" style="color:${s.color}" id="sv_${s.label.replace(/ /g,'_')}">${s.prefix}0${s.suffix||''}</div>
    </div>`).join('');
  statsData.forEach(s=>{
    const el = document.getElementById('sv_'+s.label.replace(/ /g,'_'));
    animateCounter(el, s.value, 1200, s.prefix, s.suffix||'');
  });

  // QUICK WINS
  const qw = document.getElementById('quickWinsContainer');
  if(qw) qw.innerHTML = MOCK_QUICKWINS.map(w=>`
    <div class="quick-win" onclick="${w.fn||''}">
      <div style="flex:1;min-width:0">
        <div class="quick-win-title">${w.title}</div>
        <div class="quick-win-saving">${w.saving} · ${w.effort}</div>
      </div>
      <span class="quick-win-badge">${w.saving}</span>
      <span class="quick-win-arrow">→</span>
    </div>`).join('');

  // VERTICAL STATUS
  const vs = document.getElementById('verticalesStatus');
  const statusMap = { ok:'✅', warning:'⚠️', urgent:'🔴', none:'⬜' };
  const colorMap  = { ok:'var(--color-accent)', warning:'var(--color-warning)', urgent:'var(--color-danger)', none:'var(--text-muted)' };
  if(vs) vs.innerHTML = MOCK_VERTICAL_STATUS.map(v=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg)">
      <span style="font-size:1.2rem">${v.emoji}</span>
      <div style="flex:1"><div style="font-weight:600;font-size:.85rem">${v.name}</div>
        <div style="font-size:.75rem;color:${colorMap[v.status]}">${v.label}</div></div>
      <span>${statusMap[v.status]}</span>
    </div>`).join('');
}

// ── BILLS HELPERS ─────────────────────────
function mapSupabaseBill(row) {
  const emojiMap = {luz:'⚡',gas:'🔥',telecos:'📱',combustible:'⛽',seguros:'🛡️'};
  return {
    id:          String(row.id),
    vertical:    row.vertical || 'luz',
    emoji:       emojiMap[row.vertical] || '📄',
    name:        row.provider_name || row.vertical,
    amount:      parseFloat(row.amount) || 0,
    date:        row.billing_date || row.created_at?.slice(0,10),
    saving:      row.ai_saving    || 0,
    status:      row.status       || 'analizado',
    lines:       Array.isArray(row.ai_lines) ? row.ai_lines : [],
    recs:        Array.isArray(row.ai_recs)  ? row.ai_recs  : [],
    chatContext: row.chat_context || ''
  };
}

// getBills() — usa datos reales si existen, demo si el usuario no tiene facturas aún
function getBills() {
  return USER_BILLS.length > 0 ? USER_BILLS : MOCK_BILLS;
}

function isUsingDemoData() {
  return USER_BILLS.length === 0;
}

// ── BANDEJA ───────────────────────────────
let filteredBills = [];
let activeFilter = 'all';

function renderBandeja() { filterBills(); }

function setFilter(f, btn) {
  activeFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
  if(btn) btn.classList.add('active');
  filterBills();
}
function sortBills(by) {
  const sorted = [...filteredBills];
  if(by==='amount') sorted.sort((a,b)=>b.amount-a.amount);
  if(by==='saving') sorted.sort((a,b)=>b.saving-a.saving);
  if(by==='date')   sorted.sort((a,b)=>new Date(b.date)-new Date(a.date));
  renderBillsList(sorted);
}
function filterBills() {
  const q = (document.getElementById('searchInput')?.value||'').toLowerCase();
  const source = getBills();
  filteredBills = source.filter(b=>{
    const matchFilter = activeFilter==='all' || b.vertical===activeFilter;
    const matchSearch = !q || (b.name||'').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
  // Actualizar badge de la bandeja
  const badge = document.getElementById('badgeBandeja');
  if(badge) badge.textContent = source.length || '';
  renderBillsList(filteredBills);
}
function renderBillsList(bills) {
  const el = document.getElementById('billsList');
  if(!el) return;
  if(!bills.length) {
    el.innerHTML=`<div style="text-align:center;padding:60px 40px;color:var(--text-muted)">
      <div style="font-size:3rem;margin-bottom:12px">📂</div>
      <div style="font-weight:700;font-size:1rem;margin-bottom:6px">Sin facturas aún</div>
      <div style="font-size:.85rem">Arrastra una factura arriba para empezar a ahorrar ↑</div>
    </div>`;
    return;
  }
  const verticalColor = {luz:'#FEF3C7',gas:'#FEE2E2',telecos:'#EFF6FF',combustible:'#ECFDF5',seguros:'#F5F3FF'};
  el.innerHTML = bills.map(b=>`
    <div class="bill-item animate-fade" onclick="openBill('${b.id}')">
      <div class="bill-icon" style="background:${verticalColor[b.vertical]||'#F3F4F6'}">${b.emoji||'📄'}</div>
      <div class="bill-info">
        <div class="bill-name">${b.name||b.vertical}</div>
        <div class="bill-sub">${b.date ? new Date(b.date).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}) : ''} · ${b.status==='alerta'?'<span style="color:var(--color-warning)">⚠ Atención</span>':'<span style="color:var(--color-accent)">✓ Analizado</span>'}</div>
      </div>
      <div style="text-align:right">
        <div class="bill-amount">${fmt(b.amount||0)}</div>
        ${(b.saving||0)>0?`<div class="bill-saving">Ahorra ${fmt(b.saving)}/año</div>`:''}
      </div>
      <span style="color:var(--text-muted);font-size:.8rem;margin-left:4px">›</span>
    </div>`).join('');
}

// Upload handlers
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if(file) processUpload(file);
}
function handleFileSelect(input) {
  if(input.files[0]) processUpload(input.files[0]);
}

async function processUpload(file) {
  const status  = document.getElementById('uploadStatus');
  const resetUI = () => {
    if(status) status.innerHTML = `<div style="font-size:2rem;margin-bottom:8px">📄</div><div style="font-weight:700;color:var(--text-primary)">Arrastra tu factura aquí</div><div style="font-size:.8rem;color:var(--text-muted);margin-top:4px">PDF, foto o imagen · La IA la analiza en segundos</div>`;
  };

  const ALLOWED = ['application/pdf','image/jpeg','image/png','image/webp','image/heic'];
  if (!ALLOWED.includes(file.type)) {
    showToast('Formato no soportado. Usa PDF, JPG o PNG.','error'); return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('El archivo es demasiado grande (máx 10 MB).','error'); return;
  }

  // ── MODO DEMO (sin Supabase) ───────────────────────────────
  if (DEMO_MODE) {
    const steps = ['Leyendo documento...','Extrayendo datos con IA...','Identificando conceptos...','Calculando ahorro potencial...','¡Análisis completo! ✓'];
    let i = 0;
    if(status) status.innerHTML = `<div style="font-size:1.5rem;margin-bottom:8px;animation:spin 1s linear infinite">⚙️</div><div style="font-weight:700;color:var(--color-primary)" id="uploadStep">${steps[0]}</div>`;
    const iv = setInterval(()=>{
      i++;
      const stepEl = document.getElementById('uploadStep');
      if(stepEl) stepEl.textContent = steps[Math.min(i,steps.length-1)];
      if(i>=steps.length-1){ clearInterval(iv); setTimeout(()=>{ showToast('Demo: factura analizada ✓','ok'); resetUI(); },800); }
    },900);
    return;
  }

  // ── MODO REAL (con Supabase + OpenAI) ─────────────────────
  const setStep = (msg) => {
    if(status) status.innerHTML = `<div style="font-size:1.5rem;margin-bottom:8px;animation:spin 1s linear infinite">⚙️</div><div style="font-weight:700;color:var(--color-primary)">${msg}</div>`;
  };
  setStep('Leyendo archivo...');

  try {
    // Convertir a base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setStep('Enviando a la IA... (puede tardar 10-20s)');

    const body = { fileBase64: base64, mimeType: file.type, userId: currentUser?.id };
    const resp = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || `Error ${resp.status}`);
    }

    setStep('Procesando resultados...');
    const result = await resp.json();

    setStep('Guardando en tu cuenta...');
    // Formatear fecha para evitar errores de sintaxis "undefined" en Postgres
    let bDate = result.billing_date;
    if (!bDate || typeof bDate !== 'string' || bDate.length !== 10) bDate = new Date().toISOString().slice(0,10);

    const dbBill = {
      user_id:       currentUser.id,
      vertical:      result.vertical || 'luz',
      provider_name: result.provider_name || 'Desconocido',
      amount:        parseFloat(result.amount) || 0,
      billing_date:  bDate,
      status:        'analizado',
      ai_lines:      result.lines || [],
      ai_recs:       result.recs || [],
      ai_saving:     result.saving || 0,
      chat_context:  result.chatContext || ''
    };

    const { data: savedBill, error: saveErr } = await supabase
      .from('bills')
      .insert(dbBill)
      .select()
      .single();

    if (saveErr) throw new Error('No se pudo guardar la factura: ' + saveErr.message);

    const newBill = mapSupabaseBill(savedBill);
    if (USER_BILLS) USER_BILLS.unshift(newBill);

    showToast(`✓ Factura de ${newBill.name} agregada. Ahorro potencial: ${fmt(newBill.saving)}/año`,'ok');
    resetUI();
    renderBandeja();
    renderInicio();

  } catch(err) {
    console.error('Upload error:', err);
    showToast('Error: ' + err.message, 'error');
    resetUI();
  }
}

// ── DETALLE ───────────────────────────────
function renderDetalle() {
  if(!currentBill) return;
  const b = currentBill;
  const title = document.getElementById('detallePageTitle');
  if(title) title.textContent = b.name;
  const sa = document.getElementById('detalleSavingAnnual');
  if(sa) { sa.textContent='€0'; animateCounter(sa,b.saving,1000,'€',''); }

  // Header
  const hdr = document.getElementById('detalleBillHeader');
  if(hdr) hdr.innerHTML=`
    <div style="display:flex;align-items:center;gap:16px">
      <div class="bill-icon" style="background:var(--color-${b.vertical}-bg);width:52px;height:52px;border-radius:14px;font-size:1.5rem">${b.emoji}</div>
      <div><div style="font-weight:800;font-size:1.1rem">${b.name}</div>
        <div style="font-size:.8rem;color:var(--text-muted);margin-top:3px">${new Date(b.date).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})}</div></div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-size:1.75rem;font-weight:900;font-family:var(--font-heading)">${fmt(b.amount)}</div>
        <span class="badge badge-${b.vertical}">${b.vertical}</span>
      </div>
    </div>`;

  // Line items
  const ll = document.getElementById('detalleLines');
  const confColor = {high:'var(--color-accent)',medium:'var(--color-warning)',low:'var(--color-danger)'};
  const confLabel = {high:'Alta',medium:'Media',low:'Baja'};
  if(ll) ll.innerHTML = b.lines.map(l=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg)">
      <div style="flex:1"><div style="font-weight:500;font-size:.875rem">${l.name}</div>
        ${l.info?`<div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">${l.info}</div>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:var(--font-mono);font-weight:700;color:${l.amount<0?'var(--color-accent)':'var(--text-primary)'}">${l.amount<0?'−':''}€${Math.abs(l.amount).toFixed(2)}</div>
        <div style="font-size:.7rem;color:${confColor[l.conf]}">IA ${confLabel[l.conf]}</div>
      </div>
    </div>`).join('');

  // Recommendations
  const dr = document.getElementById('detalleRecs');
  if(dr) dr.innerHTML = b.recs.map((r,i)=>`
    <div style="padding:12px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);transition:var(--transition-base)" class="card-interactive" onclick="completeRec(this,'${r.title}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
        <div style="font-weight:700;font-size:.85rem">${r.title}</div>
        <span style="color:var(--color-accent);font-weight:800;font-size:.85rem;white-space:nowrap">€${r.saving}/año</span>
      </div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px">${r.info}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:.7rem;background:var(--bg-surface-3);padding:2px 8px;border-radius:99px;color:var(--text-muted)">Esfuerzo: ${r.effort}</span>
        <button class="btn btn-accent btn-sm" style="font-size:.7rem;padding:4px 10px">Aplicar →</button>
      </div>
    </div>`).join('');

  // Chat suggestions
  const cs = document.getElementById('chatSuggestions');
  if(cs) cs.innerHTML = [
    '¿Por qué subió la factura?',
    '¿Qué tarifa me conviene?',
    '¿Cuándo vence mi promo?',
    '¿Puedo bajar la potencia?'
  ].map(q=>`<button class="btn btn-secondary btn-sm" onclick="askChat('${q}')">${q}</button>`).join('');

  if(typeof lucide!=='undefined') setTimeout(()=>lucide.createIcons(),50);
}

function completeRec(el, title) {
  el.style.opacity='0.5';
  el.style.textDecoration='line-through';
  showToast('Recomendación marcada ✓','ok');
  launchConfetti();
}

// ── CHAT ──────────────────────────────────
const AI_RESPONSES = {
  'subió': 'Esta factura subió principalmente por el incremento en el precio de la energía en hora punta (+22% vs. el mes anterior). Tu consumo en P1 aumentó de 180 a 234 kWh, posiblemente por el frío. 💡 Solución: mueve lavadora y lavavajillas a la franja de 22h-8h.',
  'tarifa': 'Basándonos en tu perfil (234 kWh/mes, mayoritariamente en P1), la tarifa indexada PVPC-plus te beneficiaría en verano pero podría salirte cara en invierno. Te recomiendo Holaluz Clara con precio fijo para tu nivel de consumo.',
  'promo': 'Tu descuento de fidelización de Orange de €5/mes caduca el **04/04/2026**. Si no actúas en 18 días, tu factura sube a €79,99/mes. Mejor alternativa: Digi Fibra 1Gb + 50GB por €20/mes.',
  'potencia': 'Tu potencia contratada es 3.45 kW. Según los datos de tu contador, nunca has superado 2.8 kW en el último año. Podrías bajar a 2.3 kW y ahorrar €45/año sin riesgo de corte.',
  'default': 'Excelente pregunta. Basándome en los datos de tu factura ({context}), aquí está mi análisis: este concepto tiene un potencial de optimización. ¿Te gustaría que te detalle las opciones disponibles?'
};

function askChat(question) {
  const input = document.getElementById('chatInput');
  if(input) { input.value = question; sendChat(); }
}
function sendChat() {
  const input = document.getElementById('chatInput');
  const msgs  = document.getElementById('chatMessages');
  if(!input || !msgs || !input.value.trim()) return;
  const q = input.value.trim();
  input.value = '';
  msgs.innerHTML += `<div class="chat-bubble user">${q}</div>`;
  msgs.scrollTop = msgs.scrollHeight;

  setTimeout(()=>{
    const lq = q.toLowerCase();
    let ans = AI_RESPONSES['default'];
    for(const [k,v] of Object.entries(AI_RESPONSES)) {
      if(k!=='default' && lq.includes(k)) { ans=v; break; }
    }
    if(currentBill) ans = ans.replace('{context}', currentBill.chatContext);
    msgs.innerHTML += `<div class="chat-bubble ai">${ans}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }, 800);
}

// ── COMPARADOR ────────────────────────────
function renderComparador() { renderCompTab(currentCompTab); }

function setCompTab(tab, btn) {
  currentCompTab = tab;
  document.querySelectorAll('#compTabs .tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  else { const found=document.querySelector(`#compTabs [data-tab="${tab}"]`); if(found) found.classList.add('active'); }
  renderCompTab(tab);
}

function renderCompTab(tab) {
  const filters = document.getElementById('compFilters');
  const results = document.getElementById('compResults');
  const insight = document.getElementById('compInsight');
  if(!filters||!results) return;

  const insightTexts = {
    luz: '💡 <strong>IA recomienda:</strong> Según tu consumo de 234 kWh/mes, la tarifa indexada te ahorraría €14/mes en verano, pero en invierno pagas más. Si prefieres estabilidad, elige Holaluz Clara.',
    gas: '🔥 <strong>IA recomienda:</strong> Estás en TUR (0,130 €/kWh). La alternativa libre más barata es un 27% más económica. Sin permanencia.',
    telecos: '📱 <strong>IA recomienda:</strong> Tus 30GB actuales son suficientes según tu uso. Con Digi consigues 50GB + fibra 1Gb por €30 menos al mes.',
    combustible: '⛽ <strong>IA recomienda:</strong> La gasolinera Repsol en Gran Vía está a 0,3km y es €0,05/l más barata. En 50L de repostaje: €2,50 ahorrados.',
  };
  if(insight) insight.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-start"><span class="badge-ai-live">IA</span><div style="font-size:.875rem">${insightTexts[tab]||''}</div></div>`;

  // Filters panel
  if(tab==='luz') filters.innerHTML=`
    <div class="section-title">⚡ Parámetros de consumo</div>
    <div class="slider-wrap"><div class="slider-label"><span>Consumo mensual</span><span id="luzKwhLabel">${compConsumption.luz} kWh</span></div>
      <input type="range" class="range-input" min="50" max="600" value="${compConsumption.luz}" oninput="compConsumption.luz=+this.value;document.getElementById('luzKwhLabel').textContent=this.value+' kWh';recalcComp()"></div>
    <div class="slider-wrap"><div class="slider-label"><span>Potencia contratada</span><span id="luzPotLabel">3,45 kW</span></div>
      <input type="range" class="range-input" min="1" max="15" step=".1" value="3.45" oninput="document.getElementById('luzPotLabel').textContent=parseFloat(this.value).toFixed(2)+' kW';recalcComp()"></div>
    <div style="margin-top:12px;padding:12px;background:var(--color-primary-50);border-radius:var(--radius-lg);font-size:.8rem"><strong style="color:var(--color-primary)">📋 Datos de tu última factura</strong><br/>234 kWh · Tarifa 2.0TD · Potencia 3.45kW</div>`;
  else if(tab==='gas') filters.innerHTML=`
    <div class="section-title">🔥 Parámetros de consumo</div>
    <div class="slider-wrap"><div class="slider-label"><span>Consumo mensual</span><span id="gasLabel">${compConsumption.gas} kWh</span></div>
      <input type="range" class="range-input" min="20" max="500" value="${compConsumption.gas}" oninput="compConsumption.gas=+this.value;document.getElementById('gasLabel').textContent=this.value+' kWh';recalcComp()"></div>
    <div style="margin-top:12px;padding:12px;background:var(--color-gas-bg);border-radius:var(--radius-lg);font-size:.8rem"><strong style="color:var(--color-gas)">📋 Tarifa actual: TUR</strong><br/>148 kWh · 0,130 €/kWh</div>`;
  else if(tab==='telecos') filters.innerHTML=`
    <div class="section-title">📱 Tu uso actual</div>
    <div class="slider-wrap"><div class="slider-label"><span>GB móvil al mes</span><span id="gbLabel">${compConsumption.telecos} GB</span></div>
      <input type="range" class="range-input" min="5" max="100" value="${compConsumption.telecos}" oninput="compConsumption.telecos=+this.value;document.getElementById('gbLabel').textContent=this.value+' GB';recalcComp()"></div>
    <div class="input-group mt-3"><label class="input-label">¿Quieres fibra incluida?</label>
      <select class="input" onchange="recalcComp()"><option>Sí, con fibra</option><option>No, solo móvil</option></select></div>
    <div style="margin-top:12px;padding:12px;background:var(--color-telecos-bg);border-radius:var(--radius-lg);font-size:.8rem"><strong style="color:var(--color-telecos)">⚠️ Promo caduca 04/04/2026</strong><br/>Actúa antes de que suba a €79,99</div>`;
  else filters.innerHTML=`
    <div class="section-title">⛽ Tu vehículo</div>
    <div class="input-group"><label class="input-label">Tipo de combustible</label>
      <select class="input"><option>Gasolina 95</option><option>Diésel</option><option>Gasolina 98</option></select></div>
    <div class="input-group mt-3"><label class="input-label">Código postal</label><input class="input" placeholder="28001" value="28001" onchange="recalcComp()"/></div>
    <div style="margin-top:12px;padding:12px;background:var(--color-combustible-bg);border-radius:var(--radius-lg);font-size:.8rem;color:var(--color-combustible)">📍 Mostrando gasolineras en radio 5km</div>`;

  recalcComp();
}

function recalcComp() {
  const results = document.getElementById('compResults');
  if(!results) return;
  const data = MOCK_COMPARATOR[currentCompTab] || [];
  results.innerHTML = data.map((t,i)=>{
    const isFuel = currentCompTab==='combustible';
    const priceLabel = isFuel ? t.price.toFixed(3)+' €/l' : fmt(t.price)+'/mes';
    const savingLabel = t.saving>0 ? (isFuel?'-'+t.saving.toFixed(3)+' €/l por litro':'Ahorras '+fmt(t.saving)+'/mes = '+fmt(t.saving*12)+'/año') : 'Tu tarifa actual';
    return `
    <div class="tariff-card ${t.recommended?'recommended':''}" style="animation:fadeIn 0.3s ${i*0.07}s ease both">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-weight:800;font-size:.95rem">${t.name}</span>
            ${t.badge?`<span class="badge ${t.recommended?'badge-green':'badge-gray'}">${t.badge}</span>`:''}
            ${t.affiliate?`<span style="font-size:.65rem;color:var(--text-muted);border:1px solid var(--border);padding:1px 6px;border-radius:99px">Colaboración verificada</span>`:''}
          </div>
          <div style="font-size:.8rem;color:var(--text-secondary);margin-bottom:8px">${t.details}</div>
          <div style="font-size:.8rem;color:var(--color-accent);font-weight:700">${savingLabel}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="tariff-price">${priceLabel}</div>
          ${t.recommended?`<button class="btn btn-accent btn-sm mt-2">Cambiar →</button>`:t.saving===0?'':'<button class="btn btn-secondary btn-sm mt-2">Ver oferta</button>'}
        </div>
      </div>
    </div>`}).join('');
  if(typeof lucide!=='undefined') setTimeout(()=>lucide.createIcons(),30);
}

// ── SCORE ─────────────────────────────────
function renderScore() {
  const scoreVal = 62;
  const ring = document.getElementById('scoreRingFill');
  const num  = document.getElementById('scoreNumber');
  const lbl  = document.getElementById('scoreLabel');
  const adv  = document.getElementById('scoreAdvice');

  if(ring) {
    const circumference = 2*Math.PI*76; // r=76
    setTimeout(()=>{
      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = circumference;
      ring.style.stroke = 'url(#scoreGrad)';
      // Insert gradient def
      const svg = ring.closest('svg');
      if(svg && !svg.querySelector('#scoreGrad')) {
        svg.insertAdjacentHTML('afterbegin',`<defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1641B0"/><stop offset="100%" stop-color="#059669"/></linearGradient></defs>`);
      }
      setTimeout(()=>{ ring.style.strokeDashoffset = circumference*(1-scoreVal/100); },100);
    },200);
  }
  if(num) animateCounter(num, scoreVal, 1400);
  if(lbl) lbl.textContent = scoreVal>=80?'Excelente ✨':scoreVal>=60?'Bueno 👍':scoreVal>=40?'Mejorable ⚠️':'Atención 🔴';
  if(adv) adv.textContent = 'Tu score mejoraría +25 puntos siguiendo la recomendación de Telecos.';

  // BREAKDOWN
  const breakdown = [
    {vertical:'⚡ Luz',     score:85, label:'Optimizada'},
    {vertical:'🔥 Gas',     score:45, label:'Mejorable'},
    {vertical:'📱 Telecos', score:30, label:'⚠ Urgente'},
    {vertical:'⛽ Combustible',score:70,label:'Aceptable'},
    {vertical:'🛡️ Seguros', score:0,  label:'Sin analizar'},
  ];
  const bd = document.getElementById('scoreBreakdown');
  if(bd) bd.innerHTML = `
    <div class="section-title">Desglose por vertical</div>
    <div class="flex-col gap-4">
    ${breakdown.map(b=>`
      <div>
        <div style="display:flex;justify-content:space-between;font-size:.85rem;font-weight:600;margin-bottom:6px">
          <span>${b.vertical}</span>
          <span style="color:${b.score>=70?'var(--color-accent)':b.score>=40?'var(--color-warning)':'var(--color-danger)'}">${b.score>0?b.score+'/100':b.label}</span>
        </div>
        <div class="progress-wrap"><div class="progress-fill ${b.score>=70?'progress-accent':b.score>=40?'progress-warning':'progress-danger'}" id="bar_${b.vertical.replace(/[^a-z]/gi,'')}" style="width:0%"></div></div>
      </div>`).join('')}
    </div>`;
  breakdown.forEach(b=>{
    setTimeout(()=>{
      const el = document.getElementById('bar_'+b.vertical.replace(/[^a-z]/gi,''));
      if(el) el.style.width = b.score+'%';
    },300);
  });

  // ACHIEVEMENTS
  const ag = document.getElementById('achievementsGrid');
  if(ag) ag.innerHTML = ACHIEVEMENTS.map(a=>`
    <div class="achievement ${a.unlocked?'unlocked':'achievement-locked'}">
      <div class="achievement-icon">${a.emoji}</div>
      <div><div style="font-weight:700;font-size:.875rem">${a.title}</div>
        <div style="font-size:.75rem;color:var(--text-secondary);margin-top:2px">${a.desc}</div>
        ${a.unlocked?`<div style="font-size:.7rem;color:#D97706;font-weight:700;margin-top:4px">🏆 Desbloqueado</div>`:`<div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">🔒 Bloqueado</div>`}</div>
    </div>`).join('');
}

// ── ALERTAS ───────────────────────────────
function renderAlertas() {
  const groups = {urgent:'alertasUrgenteList', warning:'alertasImportanteList', info:'alertasInfoList'};
  Object.values(groups).forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=''; });
  MOCK_ALERTS.forEach(a=>{
    const el = document.getElementById(groups[a.sev]);
    if(!el) return;
    el.innerHTML += `
      <div class="alert-item ${a.sev}" style="animation:fadeIn 0.4s ease both">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">${a.title}</div>
          <div style="font-size:.8rem;color:var(--text-secondary);line-height:1.5">${a.body}</div>
          ${a.daysLeft!==undefined?`<div style="margin-top:6px;font-size:.75rem;font-weight:700;color:var(--color-danger)">⏱ ${a.daysLeft} días restantes</div>`:''}
        </div>
        <button class="btn btn-secondary btn-sm" style="flex-shrink:0" onclick="${a.ctaFn}">${a.cta} →</button>
      </div>`;
  });
}

// ── HOGAR ─────────────────────────────────
function renderHogar() {
  // Services list
  const sc = document.getElementById('servicesContainer');
  if(sc) sc.innerHTML = HOGAR_SERVICES.map(s=>`
    <div class="service-row">
      <span style="font-size:1.3rem">${s.emoji}</span>
      <div style="flex:1"><div style="font-weight:600;font-size:.9rem">${s.name}</div>
        <div style="font-size:.75rem;color:var(--text-muted)">${s.active?s.provider+' · '+s.expiry:'No configurado'}</div></div>
      ${s.active?`<div style="font-family:var(--font-mono);font-weight:700;font-size:.9rem">${fmt(s.amount)}/mes</div>`:''}
      <label class="switch"><input type="checkbox" ${s.active?'checked':''} onchange="showToast('Servicio actualizado','ok')"><span class="slider"></span></label>
    </div>`).join('');

  // Spending chart
  const chart = document.getElementById('spendingChart');
  const labels = document.getElementById('spendingLabels');
  if(chart && labels) {
    const max = Math.max(...SPENDING_HISTORY.map(m=>m.total));
    chart.innerHTML = SPENDING_HISTORY.map(m=>`
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="font-size:.65rem;color:var(--text-muted)">${fmt(m.total).slice(1)}</div>
        <div style="width:100%;background:var(--color-primary);border-radius:4px 4px 0 0;transition:height 1s ease;height:${Math.round(m.total/max*140)}px"></div>
      </div>`).join('');
    labels.innerHTML = SPENDING_HISTORY.map(m=>`<span>${m.month}</span>`).join('');
  }

  // Energy label (recalculate on input)
  ['hM2','hPersonas'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', updateEnergyLabel);
  });
  updateEnergyLabel();

  // Budget tracker
  const presupuesto = document.getElementById('hPresupuesto');
  if(presupuesto) {
    const updateBudget = () => {
      const budget = parseFloat(presupuesto.value) || 0;
      const budgetStatus = document.getElementById('budgetStatus');
      if(!budget || !budgetStatus) return;
      const spend = getBills().reduce((s,b)=>s+(b.amount||0),0);
      const pct   = Math.min(spend/budget*100, 100);
      budgetStatus.style.display = 'block';
      const bc = document.getElementById('budgetCurrent'); if(bc) bc.textContent = fmt(spend);
      const bar = document.getElementById('budgetBar');
      if(bar) { bar.style.width=pct+'%'; bar.className='progress-fill '+(spend>budget?'progress-danger':pct>80?'progress-warning':'progress-accent'); }
      const msg = document.getElementById('budgetMsg');
      if(msg) msg.textContent = spend<=budget
        ? `Bien: €${(budget-spend).toFixed(2)} de margen restante`
        : `⚠️ Gastas €${(spend-budget).toFixed(2)} más de tu presupuesto`;
    };
    presupuesto.addEventListener('input', updateBudget);
    updateBudget();
  }
}

function updateEnergyLabel() {
  const m2  = parseFloat(document.getElementById('hM2')?.value)||80;
  const pax = parseFloat(document.getElementById('hPersonas')?.value)||3;
  const kwhPerM2 = (150 + pax*20) / m2;
  const grade = kwhPerM2<5?'A':kwhPerM2<7?'B':kwhPerM2<9?'C':kwhPerM2<11?'D':kwhPerM2<14?'E':'F';
  const badge = document.getElementById('energyLabelBadge');
  const text  = document.getElementById('energyLabelText');
  const desc  = document.getElementById('energyLabelDesc');
  const kwh   = document.getElementById('energyKwh');
  const bar   = document.getElementById('energyBar');
  if(badge) { badge.textContent=grade; badge.className='energy-badge energy-'+grade; }
  if(text)  text.textContent = grade+' — '+(kwhPerM2<9?'Eficiencia buena':'Margen de mejora');
  if(desc)  desc.textContent = 'Tu hogar: '+kwhPerM2.toFixed(1)+' kWh/m²/mes vs media 8 kWh/m²/mes';
  if(kwh)   kwh.textContent  = kwhPerM2.toFixed(1)+' kWh/m²/mes';
  if(bar)   bar.style.width  = Math.min(kwhPerM2/20*100,100)+'%';
}

// ── PERFIL ────────────────────────────────
function renderPerfil() {
  // Datos reales del usuario autenticado (o demo)
  const user   = currentUser;
  const email  = user?.email || 'demo@ahorra360.es';
  const name   = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario Demo';
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const av = document.getElementById('profileAvatar');
  if(av) av.textContent = initials;
  const pn = document.getElementById('profileName');  if(pn) pn.textContent=name;
  const pe = document.getElementById('profileEmail'); if(pe) pe.textContent=email;
  const pNombre = document.getElementById('pNombre'); if(pNombre) pNombre.value=name;
  const pEmail  = document.getElementById('pEmail');  if(pEmail)  pEmail.value=email;

  const bills    = getBills();
  const savings  = bills.reduce((s,b)=>s+(b.saving||0),0);
  const recs     = bills.reduce((s,b)=>s+(b.recs?.length||0),0);
  const statsData = [
    {label:'Facturas analizadas', value: bills.length},
    {label:'Ahorro potencial',    value: '€'+savings+'/año'},
    {label:'Recomendaciones',     value: recs},
    {label:'Score actual',        value: '62/100'},
  ];
  const ps = document.getElementById('profileStats');
  if(ps) ps.innerHTML = statsData.map(s=>`
    <div style="padding:12px;background:var(--bg-surface-2);border-radius:var(--radius-lg);border:1px solid var(--border)">
      <div style="font-size:.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em">${s.label}</div>
      <div style="font-size:1.2rem;font-weight:800;margin-top:4px">${s.value}</div>
    </div>`).join('');

  // Botón de cerrar sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = '1';
    logoutBtn.addEventListener('click', async () => {
      if(supabase) await supabase.auth.signOut();
      window.location.href = 'auth.html';
    });
  }
}

// ── CONFETTI ──────────────────────────────
function launchConfetti() {
  const colors=['#1641B0','#059669','#F59E0B','#EF4444','#8B5CF6'];
  for(let i=0;i<30;i++){
    const el=document.createElement('div');
    el.className='confetti-piece';
    el.style.cssText=`left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};transform:rotate(${Math.random()*360}deg);animation-delay:${Math.random()*0.5}s;animation-duration:${2+Math.random()*1.5}s;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),4000);
  }
}

// ── EXPORT / DELETE ───────────────────────
function exportUserData() {
  const payload = {
    exportDate: new Date().toISOString(),
    user: { email: currentUser?.email, id: currentUser?.id },
    bills: USER_BILLS
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ahorra360-datos-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Datos exportados ✓', 'ok');
}

async function deleteAccount() {
  if (!confirm('¿Estás seguro? Esta acción cerrará tu sesión. Para borrar tus datos permanentemente contacta con soporte.')) return;
  if (supabase) await supabase.auth.signOut();
  window.location.href = 'auth.html';
}

// ── INIT ──────────────────────────────────
async function initApp() {
  if(typeof lucide!=='undefined') lucide.createIcons();

  // Inicializar cliente Supabase (CDN UMD ya cargado antes de este script)
  if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  }
  if (!supabase) {
    console.error('[Ahorra360] Supabase CDN no disponible.');
    window.location.href = 'auth.html';
    return;
  }

  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

    if (sessionErr || !session) {
      window.location.href = 'auth.html';
      return;
    }

    currentUser = session.user;
    const name  = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    const email = currentUser.email;
    const init  = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    setSidebarUser(name, email, init);

    // Cargar facturas del usuario desde Supabase
    const { data: bills, error: billsErr } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (billsErr) {
      console.warn('[Ahorra360] Error cargando bills:', billsErr.message);
      if (billsErr.message?.includes('does not exist')) {
        setTimeout(() => showToast('⚠️ Ejecuta supabase-schema.sql en tu proyecto Supabase', 'error'), 1000);
      }
      USER_BILLS = [];
    } else {
      USER_BILLS = (bills || []).map(mapSupabaseBill);
    }

    // Navegar
    const hash = window.location.hash.replace('#','');
    navigate(hash && document.getElementById('page-'+hash) ? hash : 'inicio');

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.href = 'auth.html';
    });

  } catch(err) {
    console.error('[Ahorra360] initApp error:', err);
    window.location.href = 'auth.html';
  }
}

function setSidebarUser(name, email, initials) {
  const sn = document.getElementById('sidebarName');
  const se = document.getElementById('sidebarEmail');
  const sa = document.getElementById('sidebarAvatar');
  if(sn) sn.textContent = name;
  if(se) se.textContent = email;
  if(sa) sa.textContent = initials;
}

// Fix para PWA Zombie State (Carrera entre CDN y DOM)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM ya estaba listo cuando el script parseó
  initApp();
}
