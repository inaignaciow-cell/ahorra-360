/* ═══════════════════════════════════════════
   AHORRA 360 — app.js  v5
   ═══════════════════════════════════════════ */

// ── SUPABASE Y STRIPE ─────────────────────
const SUPA_URL = 'https://gzkhrgmfbzkskmnselnz.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6a2hyZ21mYnprc2ttbnNlbG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzAzNzYsImV4cCI6MjA4OTI0NjM3Nn0.t9yFb6qtHQCGfF4n9HOLU-uceIVUYXxDsAp3BSXbl50';

const STRIPE_PK = 'pk_test_51TCUWnCOXrdE1cjZeDaRBfjla49OZwD2An7O6Xvwn0RVjjwe1R1dyqTScuAg86XAn93NY4ZckNPJvjU96f0c07WB00YDjjwUDI';
const STRIPE_PRICE_ID = 'price_1TCUb7COXrdE1cjZhmXHiPne';

// supabase client — se inicializa en initApp()
let sbClient = null;

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
      {name:'Descuento fidelización', amount:-5.00, info:'🟢 Garantía de Ahorro: 276€/año', conf:'high'},
      {name:'IVA (21%)',              amount:11.55, info:'Sobre tarifa base+móvil', conf:'high'},
      {name:'TV Orange (addon)',      amount:5.44,  info:'Cine+Series — ¿lo miras?', conf:'medium'},
    ],
    recs:[
      {title:'Cambiar a Digi (misma cobertura)', saving:276, effort:'Baja', info:'Fibra 1Gb + móvil 50GB por €20/mes. Ahorro €30/mes sin permanencia.'},
      {title:'Cancelar TV Orange', saving:65, effort:'Baja', info:'Si no ves el addon de TV, €5.44/mes de ahorro puro.'},
      {title:'Negociar renovación antes del 04/04', saving:120, effort:'Media', info:'Retención te puede ofrecer mismo precio u otro descuento.'},
    ],
    chatContext:'factura telecos Orange Fusión, €49.99/mes, sobreprecio mensual detectado, fibra 100Mb + móvil 30GB'
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
    {name:'Orange Fusión 100 (actual)',   price:49.99, saving:0,     badge:'Tu tarifa actual',recommended:false,details:'🛡️ Tarifa 100% protegida por IA', affiliate:false},
  ],
  combustible:[
    {name:'Repsol — C/ Gran Vía',   price:1.749, saving:0.050, badge:'Más barata cerca', recommended:true,  details:'0.3 km · Horario: 24h'},
    {name:'BP — C/ Princesa',       price:1.779, saving:0.020, badge:'',                recommended:false, details:'1.1 km · Horario: 6-23h'},
    {name:'Cepsa — M-30',           price:1.789, saving:0.010, badge:'',                recommended:false, details:'2.4 km · Autopista'},
    {name:'Shell — C/ Bravo Murillo',price:1.799,saving:0,     badge:'Tu última gasolinera',recommended:false,details:'0.8 km'},
  ],
};

const MOCK_ALERTS = [
  {id:1, sev:'urgent',  title:'Sobreprecio detectado en Orange', body:'Estás pagando 24€/mes de más por tu Fibra y Móvil. La IA de Ahorra 360 ha encontrado mejores alternativas.', cta:'Ver comparador',  ctaFn:"navigate('comparador')", daysLeft:18},
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
  {emoji:'📱', name:'Telecos',    status:'urgent',  label:'🟢 Tarifa garantizada'},
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
  if(page==='tarjeta')    renderTarjeta();
  if(page==='radar')      renderRadar();
  if(typeof lucide !== 'undefined') setTimeout(()=>lucide.createIcons(),50);

  window.scrollTo(0, 0);
  window.history.replaceState(null, null, '#' + page);
  document.getElementById('sidebar')?.classList.remove('open');

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
  if(!sbClient) {
    authToast('Cuenta creada en modo demo ✓','ok');
    setTimeout(()=>{ window.location.href='dashboard.html'; }, 900);
    return true;
  }
  const {data, error} = await sbClient.auth.signUp({email, password:pass});
  if(error){ authToast(error.message,'error'); return false; }
  // If email confirmation needed
  if(data.user && !data.session) {
    authToast('Revisa tu email para confirmar la cuenta ✉️','ok');
    return false;
  }
  return true;
}

async function loginUser(email, pass) {
  if(!sbClient) {
    authToast('Iniciando sesión en modo demo...','ok');
    setTimeout(()=>{ window.location.href='dashboard.html'; }, 700);
    return;
  }
  const {error} = await sbClient.auth.signInWithPassword({email, password:pass});
  if(error){ authToast(error.message,'error'); return; }
  window.location.href='dashboard.html';
}

async function loginWithGoogle() {
  if(!sbClient) {
    // Demo mode — redirect directly
    authToast('Conectando con Google en modo demo...','ok');
    setTimeout(()=>{ window.location.href='dashboard.html'; }, 800);
    return;
  }
  await sbClient.auth.signInWithOAuth({
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
    if (sbClient && currentUser) {
      const { error } = await sbClient.auth.updateUser({ data: { full_name: name } });
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
    if (sbClient && currentUser) {
      // 1. Crear o actualizar el Hogar
      const { data: hogarData, error: hogarErr } = await sbClient.from('hogares').upsert({
        owner_id: currentUser.id,
        nombre: nombre || null,
        cp:     cp || null,
        m2:     m2,
        personas: personas,
        tipo:   tipo,
        zona:   zona,
        updated_at:   new Date().toISOString()
      }, { onConflict: 'owner_id' }).select().single();
      
      if (hogarErr) throw hogarErr;

      // 2. Vincular como Hogar principal en el Perfil
      if (hogarData) {
        window.currentHogarId = hogarData.id;
        await sbClient.from('profiles').update({ hogar_principal_id: hogarData.id }).eq('id', currentUser.id);
      }
    }
    showToast('Hogar guardado en la nube ✓', 'ok');
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

// ── ZERO-CLICK ONBOARDING (FASE 12) ──────────
function openTrustCenter() {
  if(document.getElementById('trustCenterLayout')) return;
  const overlay = document.createElement('div');
  overlay.id = 'trustCenterLayout';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.85);backdrop-filter:blur(10px);z-index:999999;display:flex;align-items:center;justify-content:center;perspective:1000px';
  overlay.innerHTML = `
    <div style="background:var(--bg-surface);width:100%;max-width:850px;border-radius:24px;box-shadow:0 30px 60px rgba(0,0,0,0.4);display:flex;overflow:hidden;animation:slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards;min-height:500px">
      <!-- Panel Izquierdo: Beneficios y Seguridad -->
      <div style="background:var(--bg-surface-2);padding:40px;width:40%;display:flex;flex-direction:column;justify-content:center;border-right:1px solid var(--border)">
        <div style="font-size:3rem;margin-bottom:16px">🛡️</div>
        <h2 style="font-family:var(--font-heading);font-weight:900;font-size:1.8rem;margin-bottom:16px;line-height:1.2">Conexión Blindada</h2>
        <p style="color:var(--text-secondary);line-height:1.5;margin-bottom:24px;font-size:0.95rem">La IA de Ahorra 360 se conecta en "Modo Lectura" sin capacidad de operar tu dinero (Normativa RegTech PSD2).</p>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:12px;color:var(--text-secondary);font-size:0.9rem">
          <li>🔒 <b>Encriptación AES-256</b> bancaria.</li>
          <li>📊 <b>Extracción IA</b> de domiciliaciones.</li>
          <li>🎭 <b>100% Anónimo</b> sin extraer balances.</li>
        </ul>
        <div style="margin-top:auto;font-size:0.75rem;color:var(--text-muted);display:flex;align-items:center;gap:6px">
          <i data-lucide="shield-check" width="14" height="14"></i> Auditado por Banco de España
        </div>
      </div>
      <!-- Panel Derecho: Selector -->
      <div style="padding:40px;width:60%;display:flex;flex-direction:column;position:relative" id="tcContent">
        <button class="btn btn-secondary btn-sm" style="position:absolute;top:20px;right:20px;border-radius:50%;width:36px;height:36px;padding:0;justify-content:center" onclick="document.getElementById('trustCenterLayout').remove()"><i data-lucide="x" width="16" height="16"></i></button>
        <h3 style="font-weight:800;font-size:1.2rem;margin-bottom:8px">Selecciona tu Entidad</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:24px">Elige tu banco principal para descargar todo tu mapa financiero en segundos.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          ${['Santander','BBVA','CaixaBank','Sabadell','Revolut','N26'].map(b => `
            <button style="background:var(--bg-surface);border:1px solid var(--border);padding:12px 16px;border-radius:12px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor='var(--color-primary)'" onmouseout="this.style.borderColor='var(--border)'" onclick="startBankSync('${b}')">
               <div style="width:36px;height:36px;border-radius:8px;background:var(--bg-surface-3);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;color:var(--color-primary)">${b.charAt(0)}</div>
               <div style="font-weight:600;font-size:0.9rem">${b}</div>
            </button>
          `).join('')}
        </div>
        <div style="margin-top:32px;text-align:center">
          <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:12px">¿Prefieres conectar tu correo en su lugar?</div>
          <button class="btn btn-secondary w-full" onclick="startBankSync('Google/Microsoft', true)"><i data-lucide="mail" width="16" height="16"></i> Analizar Bandejas de Entrada (OAuth)</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function startBankSync(entity, isEmail = false) {
  const container = document.getElementById('tcContent');
  if(!container) return;
  container.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
       <div style="font-size:3.5rem;margin-bottom:16px;animation:spin 1.5s linear infinite">🛠️</div>
       <h3 style="font-weight:900;font-size:1.4rem;margin-bottom:8px">Conectando con ${entity}</h3>
       <p style="color:var(--text-secondary);margin-bottom:24px;font-size:0.9rem">Nuestra IA está extrayendo y clasificando movimientos recurrentes de los últimos 12 meses.</p>
       <div style="background:var(--bg-surface-2);border-radius:99px;height:6px;width:100%;max-width:300px;overflow:hidden;margin-bottom:16px">
         <div id="syncLoaderBar" style="background:var(--ai-gradient);height:100%;width:0%;transition:width 0.4s ease"></div>
       </div>
       <div id="syncStatusObj" style="font-size:0.8rem;color:var(--color-primary);font-weight:600">Validando Certificados...</div>
    </div>
  `;
  
  const steps = [
    { p: 15, text: isEmail ? "Conectando POP3/IMAP..." : "Handshake PSD2 (Open Banking)..." },
    { p: 30, text: "Buscando domiciliaciones activas..." },
    { p: 55, text: "Detectado: Factura de Iberdrola (98€)..." },
    { p: 75, text: "Detectado: Netflix Premium Fantasma (12€)..." },
    { p: 85, text: "Construyendo HUD Financiero local..." },
    { p: 100, text: "Extracción Zero-Click Completada!" }
  ];

  let curr = 0;
  const bar = document.getElementById('syncLoaderBar');
  const txt = document.getElementById('syncStatusObj');
  const interval = setInterval(() => {
    if(curr >= steps.length) {
      clearInterval(interval);
      setTimeout(() => finalizeZeroClickOnboarding(), 1400);
      return;
    }
    bar.style.width = steps[curr].p + '%';
    txt.textContent = steps[curr].text;
    curr++;
  }, 950);
}

function finalizeZeroClickOnboarding() {
  document.getElementById('trustCenterLayout')?.remove();
  
  const magicServices = [
    { emoji: '⚡', name: 'Luz', provider: 'Iberdrola', amount: 98.40, expiry: '2027-01' },
    { emoji: '📱', name: 'Telecos', provider: 'Movistar', amount: 89.90, expiry: '' },
    { emoji: '🛡️', name: 'Seguros', provider: 'Mapfre', amount: 35.00, expiry: '' },
    { emoji: '🎬', name: 'Suscripción', provider: 'Netflix', amount: 12.99, expiry: '' }
  ];

  magicServices.forEach(payload => {
     HOGAR_SERVICES.push({...payload, active:true});
     if (sbClient && currentUser && window.currentHogarId) {
        sbClient.from('servicios').insert({
          hogar_id: window.currentHogarId,
          tipo: payload.name.toLowerCase(),
          proveedor: payload.provider,
          coste_mensual_estimado: payload.amount,
          es_activo: true
        }).then(() => {}).catch(e=>console.warn(e));
     }
  });

  renderHogar();
  launchConfetti();
  navigate('hogar-legacy'); // Renderizar el panel auto-rellenado
  showToast('¡Magia hecha! Hemos construido tu mapa financiero entero.', 'ok');
}

async function addService() {
  if(document.getElementById('addServiceOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'addServiceOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:var(--bg-surface);padding:28px;border-radius:24px;width:100%;max-width:380px;box-shadow:var(--shadow-xl);border:1px solid var(--border);animation:slideUp .25s ease">
      <h3 style="font-weight:800;font-size:1.1rem;margin-bottom:18px">+ Añadir servicio Manual</h3>
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

async function confirmAddService() {
  const emojiMap = {luz:'⚡',gas:'🔥',telecos:'📱',combustible:'⛽',seguros:'🛡️'};
  const type     = document.getElementById('newSvcType')?.value;
  const provider = document.getElementById('newSvcProvider')?.value?.trim();
  const amount   = parseFloat(document.getElementById('newSvcAmount')?.value || '0');
  
  if (!provider) return showToast('Introduce el nombre del proveedor', 'error');
  
  const payload = {
    emoji: emojiMap[type]||'📋',
    name: type.charAt(0).toUpperCase()+type.slice(1),
    provider, amount, expiry:'', active:true
  };
  
  // Guardar en UI Memoria
  HOGAR_SERVICES.push(payload);
  
  // Guardar en Supabase PostgreSQL
  if (sbClient && currentUser && window.currentHogarId) {
    try {
      await sbClient.from('servicios').insert({
        hogar_id: window.currentHogarId,
        tipo: type,
        proveedor: provider,
        coste_mensual_estimado: amount,
        es_activo: true
      });
    } catch(e) { console.warn("Error guardando servicio en Supabase", e); }
  }

  document.getElementById('addServiceOverlay')?.remove();
  renderHogar();
  showToast('Servicio añadido y sincronizado ✓', 'ok');
}


// ════════════════════════════════════════════
//  RENDER FUNCTIONS
// ════════════════════════════════════════════

// ── INITIATION ────────────────────────────
// ── GHOST MODE (FASE 8) ───────────────────
let ghostTerminalInterval = null;
let isGhostModeActive = false;

function toggleGhostMode(checkbox) {
  isGhostModeActive = checkbox.checked;
  
  if(isGhostModeActive) {
    document.documentElement.style.setProperty('--bg-body', '#F1F5F9'); 
    showToast('🚀 Piloto Automático ACTIVADO.', 'ok');
    logToGhostTerminal('Piloto Automático EN LÍNEA. Inicializando clúster de IA...', 'sys');
    
    // start background activity simulation if gmail connected
    const connected = document.getElementById('gmailConnectedBlock') && document.getElementById('gmailConnectedBlock').style.display !== 'none';
    if(connected) startGhostActivity();
    
    if(!window.rpaActive) {
      window.rpaActive = true;
      animateRPA();
    }
  } else {
    document.documentElement.style.setProperty('--bg-body', '#FAFAFA'); 
    showToast('Piloto Automático DESACTIVADO.', '');
    logToGhostTerminal('Operaciones en red suspendidas. Control manual restaurado.', 'sys');
    if(ghostTerminalInterval) clearInterval(ghostTerminalInterval);
  }
}

function connectGmail(btn) {
  btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="margin-right:8px" width="14" height="14"></i> Conectando...';
  if(typeof lucide!=='undefined') lucide.createIcons();
  
  setTimeout(() => {
    document.getElementById('gmailSyncBlock').style.display = 'none';
    document.getElementById('gmailConnectedBlock').style.display = 'flex';
    
    logToGhostTerminal('OAuth exitoso: vinculado con testuser123@gmail.com.', 'success');
    logToGhostTerminal('Daemon IMAP levantado. Sincronizando bandejas...', 'sys');
    showToast('📧 Google Mail enlazado correctamente.', 'ok');
    
    if(isGhostModeActive) startGhostActivity();
  }, 1500);
}

function disconnectGmail() {
  document.getElementById('gmailConnectedBlock').style.display = 'none';
  document.getElementById('gmailSyncBlock').style.display = 'flex';
  const btn = document.getElementById('btnConnectGmail');
  btn.innerText = 'Conectar Gmail';
  logToGhostTerminal('Socket IMAP desconectado por el usuario.', 'warning');
  if(ghostTerminalInterval) clearInterval(ghostTerminalInterval);
}

function logToGhostTerminal(msg, type='normal') {
  const terminal = document.getElementById('ghostTerminalLogs');
  if(!terminal) return;
  
  const now = new Date();
  const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
  
  const div = document.createElement('div');
  div.className = 'ghost-log-entry';
  
  let colorClass = '';
  if(type === 'sys') colorClass = 'style="color:#94A3B8"';
  else if(type === 'success') colorClass = 'class="ghost-log-success"';
  else if(type === 'warning') colorClass = 'class="ghost-log-warning"';
  else colorClass = 'style="color:#E0F2FE"';
  
  div.innerHTML = `<span class="ghost-log-time">[${timeStr}]</span> <span ${colorClass}>${msg}</span>`;
  terminal.appendChild(div);
  terminal.scrollTop = terminal.scrollHeight; // Auto-scroll
}

function startGhostActivity() {
  if(ghostTerminalInterval) clearInterval(ghostTerminalInterval);
  
  const scenarios = [
    { msg: "🔎 Scraping de emails recibidos en las últimas 4h...", delay: 2000 },
    { msg: "📬 Encontrado PDF adjunto <Factura_Endesa_Marzo.pdf>", type: 'user', delay: 4500 },
    { msg: "⚙️ Parser IA: Extraído CUPS y Consumo (240 kWh). OCR = 99.8%", type: "sys", delay: 6500 },
    { msg: "🧠 Evaluando en background... El usuario paga 0.16€/kWh.", type: "sys", delay: 9000 },
    { msg: "💡 Alerta de Ahorro: Repsol a 0.10€/kWh -> Gap anual +172€", type: "success", delay: 11000 },
    { msg: "🤖 Generando payload de Negociación para Nodo 3 (Bot)...", type: "warning", delay: 14000 }
  ];
  
  let i = 0;
  ghostTerminalInterval = setInterval(() => {
    if(i >= scenarios.length) {
      clearInterval(ghostTerminalInterval);
      return;
    }
    logToGhostTerminal(scenarios[i].msg, scenarios[i].type || 'normal');
    i++;
  }, 2500); 
}

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
    { sev:'urgent',  icon:'🎯', title:'Sobreprecio detectado en Orange', body:'Estás pagando de más. Cambiando con un clic a Digi ahorras €276/año garantizados.', cta:'Ver alternativas', fn:"navigate('comparador')" },
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

  // Oracle Phase 15
  renderOracleChart();

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

  // RENDER SUBASTA EN VIVO
  renderLiveAuction();
}

let auctionInterval = null;
function renderLiveAuction() {
  const radar = document.getElementById('liveAuctionRadar');
  if(!radar) return;
  
  if(radar.dataset.rendered) return; // Ya generado, no reiniciar si navega
  radar.dataset.rendered = "true";

  let bids = [
    { provider: 'Iberdrola', price: 0.115, time: 'Hace 5 min' },
    { provider: 'Naturgy', price: 0.108, time: 'Hace 2 min' }
  ];
  let currentBest = 0.108;
  
  const updateHTML = () => {
    radar.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
        <div>
          <div style="font-size:0.8rem; font-weight:800; color:#D97706; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px">Agrupando usuarios en 28001</div>
          <div style="font-size:1.1rem; font-weight:800; color:#92400E">Bloque Energía: 342 usuarios listos</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.75rem; color:#D97706; font-weight:700; margin-bottom:2px">Tiempo restante</div>
          <div style="font-size:1.4rem; font-weight:900; color:#B45309; font-family:var(--font-mono); background:#FEF3C7; padding:4px 10px; border-radius:8px; border:1px solid #FCD34D" id="auctionTimer">01:59:59</div>
        </div>
      </div>
      
      <div style="background:rgba(255,255,255,0.6); border-radius:12px; padding:12px; margin-bottom:16px;">
        <div style="font-size:0.75rem; color:#92400E; font-weight:700; margin-bottom:8px">ÚLTIMAS PUJAS DE COMERCIALIZADORAS</div>
        <div id="auctionBidsList" style="display:flex; flex-direction:column; gap:8px">
          ${bids.map((b, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#fff; border-radius:8px; border:1px solid #FDE68A; opacity:${i===0?1:0.6}; animation:slideDown 0.3s ease-out">
              <div style="display:flex; align-items:center; gap:8px">
                <span style="font-weight:700; font-size:0.9rem; color:#b45309">${b.provider}</span>
                <span style="font-size:0.7rem; color:#d97706">${b.time}</span>
              </div>
              <div style="font-weight:900; font-size:1.1rem; color:#059669; font-family:var(--font-mono)">${b.price.toFixed(3)} €/kWh</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <button class="btn" style="width:100%; background:linear-gradient(90deg, #F59E0B, #D97706); border:none; color:white; font-size:1rem; padding:14px; border-radius:12px; box-shadow:0 4px 14px rgba(217, 119, 6, 0.4); display:flex; align-items:center; justify-content:center; gap:8px; font-weight:800; transition:all 0.2s" onclick="joinCoopAuction(this)">
        <i data-lucide="users" width="20" height="20"></i> UNIRME A LA COMPRA COLECTIVA
      </button>
      <div style="text-align:center; margin-top:10px; font-size:0.7rem; color:#B45309; opacity:0.8">Sin compromiso. Solo te cambiaremos si gana una tarifa más barata que la tuya.</div>
    `;
    if(typeof lucide!=='undefined') lucide.createIcons();
  };
  
  updateHTML();
  
  // Timer visual simulation
  let timeLeft = 7199;
  if(auctionInterval) clearInterval(auctionInterval);
  auctionInterval = setInterval(() => {
    timeLeft--;
    const el = document.getElementById('auctionTimer');
    if(!el) return;
    const h = Math.floor(timeLeft/3600).toString().padStart(2,'0');
    const m = Math.floor((timeLeft%3600)/60).toString().padStart(2,'0');
    const s = (timeLeft%60).toString().padStart(2,'0');
    el.textContent = `${h}:${m}:${s}`;
    
    // Simulate new bids incoming
    if(timeLeft === 7195) { // after 4 seconds
      bids.unshift({ provider: 'Endesa', price: 0.098, time: 'Ahora mismo' });
      updateHTML();
      showToast('¡Nueva puja en la subasta! Endesa acaba de ofrecer 0.098€/kWh', 'ok');
    }
    if(timeLeft === 7188) { // after 11 seconds
      bids.unshift({ provider: 'Repsol', price: 0.089, time: 'Ahora mismo' });
      bids[1].time = 'Hace 7 seg';
      updateHTML();
      showToast('🔥 ¡Repsol acaba de romper el mercado con 0.089€/kWh!', 'ok');
    }
  }, 1000);
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

    const { data: savedBill, error: saveErr } = await sbClient
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

  // --- ZERO-CLICK AFFILIATE ENGINE (Fumada) ---
  const affContainer = document.getElementById('affiliateMatchOffer');
  if (affContainer) {
    affContainer.innerHTML = ''; // Reiniciar
    
    // Llamar a la API simulada de afiliados
    fetch('/api/match_affiliate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vertical: b.vertical,
        provider_name: b.provider_name,
        amount: b.amount
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.match && data.match.userSavings > 0) {
        const m = data.match;
        affContainer.innerHTML = `
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border: 2px solid #F59E0B; border-radius: var(--radius-xl); padding: 20px; margin-bottom: 24px; box-shadow: 0 10px 25px rgba(245, 158, 11, 0.15); animation: slideUp 0.4s ease-out;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
              <div style="background:#F59E0B; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:white; animation:pulse 2s infinite">✨</div>
              <div style="flex:1">
                <div style="font-size:0.75rem; font-weight:800; color:#D97706; text-transform:uppercase; letter-spacing:0.05em">Ahorra 360 AI Matcher</div>
                <div style="font-size:1.1rem; font-weight:800; color:#92400E">Oferta de ${m.provider} encontrada</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:1.4rem; font-weight:900; color:#B45309">€${m.userSavings}</div>
                <div style="font-size:0.75rem; color:#D97706; font-weight:600">ahorro estimado/año</div>
              </div>
            </div>
            ${m.shieldActive ? `
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px dashed #10B981; border-radius: 10px; padding: 10px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 10px;">
              <div style="font-size: 1.2rem;">🛡️</div>
              <div style="font-size: 0.75rem; color: #065F46; line-height: 1.3">
                <strong>Escudo Anti-Permanencia:</strong> Hemos detectado una posible penalización de €${m.penalty} en tu contrato actual. <strong>Ahorra 360 la pagará por ti</strong> al completar el cambio.
              </div>
            </div>` : ''}
            <div style="font-size:0.875rem; color:#92400E; opacity:0.9; margin-bottom:16px;">
              Hemos encontrado la tarifa <strong>${m.plan} (${m.priceDesc})</strong>. Actualmente pagas mucho más a ${b.provider_name || 'tu compañía'}. No te compliques con papeleos, nosotros nos encargamos de todo gratuitamente gestionando la portabilidad.
            </div>
            <button class="btn" style="width:100%; background:linear-gradient(90deg, #F59E0B, #D97706); border:none; color:white; font-size:1rem; padding:14px; border-radius:12px; box-shadow:0 4px 14px rgba(217, 119, 6, 0.4); display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700" onclick="executeMagicSwitch('${m.provider}', ${m.userSavings}, ${m.penalty})">
              <i data-lucide="zap" width="18" height="18"></i> CAMBIAR DE COMPAÑÍA EN 1-CLIC
            </button>
            <div style="text-align:center; margin-top:10px; font-size:0.7rem; color:#B45309; opacity:0.7">Servicio gratuito. Protegido temporalmente.</div>
          </div>
        `;
        if(typeof lucide!=='undefined') lucide.createIcons();
      }
    })
    .catch(console.error);
  }
}

// Ventana flotante (Modal) RPA Simulador
function executeMagicSwitch(provider, savings, penalty = 0) {
  if (!window.currentProfile?.is_premium) {
    return checkoutGhostMode(false);
  }
  if (document.getElementById('magicSwitchOverlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'magicSwitchOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;perspective:1000px';
  
  overlay.innerHTML = `
    <div style="background:var(--bg-surface);padding:32px;border-radius:24px;width:100%;max-width:380px;box-shadow:0 24px 50px rgba(0,0,0,0.25);border:1px solid var(--border);animation:popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; text-align:center">
      
      <div id="magicProgressIcon" style="font-size:3rem; margin-bottom:16px; animation:bounce 1s infinite">🥷</div>
      
      <h3 style="font-weight:900;font-size:1.3rem;margin-bottom:8px" id="magicSwitchTitle">Gestor IA Operando</h3>
      <div style="font-size:.9rem;color:var(--text-muted);margin-bottom:24px;line-height:1.4" id="magicSwitchDesc">
        Conectando con servidores seguros...
      </div>
      
      <div style="background:var(--bg-surface-2); border-radius:99px; height:8px; width:100%; overflow:hidden; margin-bottom:24px; position:relative">
        <div id="magicLoaderBar" style="background:var(--color-primary); height:100%; width:5%; transition:width .3s ease"></div>
      </div>
      
      <div id="magicLog" style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted); text-align:left; background:var(--bg-surface-3); padding:12px; border-radius:12px; height:80px; overflow-y:auto; line-height:1.6; margin-bottom:16px">
        [+] Inicializando proxy...
      </div>
      
      <button id="magicCloseBtn" class="btn btn-secondary w-full" style="display:none" onclick="document.getElementById('magicSwitchOverlay').remove()">Hecho, salir y disfrutar</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const log = document.getElementById('magicLog');
  const bar = document.getElementById('magicLoaderBar');
  const addLog = (text) => {
    log.innerHTML += `<br>[+] ${text}`;
    log.scrollTop = log.scrollHeight;
  };
  
  // Script mágico
  setTimeout(() => { addLog('Rellenando DNI digital OCR...'); bar.style.width='25%'; }, 1500);
  setTimeout(() => { 
    if (penalty > 0) {
      addLog('<span style="color:#D97706">[🛡️] Activando Escudo: Autorizando pago de €' + penalty + ' de multa...</span>');
    }
    addLog('Recuperando IBAN del perfil guardado...'); 
    bar.style.width='50%'; 
  }, 3000);
  setTimeout(() => { addLog('Fingiendo ser tú en la web de ' + provider + '...'); bar.style.width='75%'; document.getElementById('magicProgressIcon').textContent='🤖'; }, 4500);
  setTimeout(() => { 
    addLog('<span style="color:var(--color-accent)">¡ÉXITO! Contrato firmado electrónicamente.</span>'); 
    bar.style.width='100%'; 
    bar.style.background='var(--color-accent)';
    document.getElementById('magicProgressIcon').textContent='🎉';
    document.getElementById('magicSwitchTitle').textContent = '¡Te ahorraste €' + savings + '!';
    document.getElementById('magicSwitchDesc').textContent = 'Acabamos de darte de alta en ' + provider + ' y gestionado tu baja en la anterior compañía. Todo automáticamente.';
    document.getElementById('magicCloseBtn').style.display='block';
    launchConfetti();
  }, 6500);
}

function completeRec(el, title) {
  el.style.opacity='0.5';
  el.style.textDecoration='line-through';
  showToast('Recomendación marcada ✓','ok');
  launchConfetti();
}

// ── CHAT ──────────────────────────────────
function askChat(question) {
  const input = document.getElementById('chatInput');
  if(input) { input.value = question; sendChat(); }
}
async function sendChat() {
  const input = document.getElementById('chatInput');
  const msgs  = document.getElementById('chatMessages');
  if(!input || !msgs || !input.value.trim()) return;
  const q = input.value.trim();
  input.value = '';
  
  // Mensaje del usuario
  msgs.innerHTML += `<div class="chat-bubble user">${q}</div>`;
  msgs.scrollTop = msgs.scrollHeight;

  // Placeholder de carga
  const idBurbuja = 'ai-msg-' + Date.now();
  msgs.innerHTML += `<div class="chat-bubble ai" id="${idBurbuja}">
    <span style="display:inline-block;animation:spin 1s linear infinite">✨</span> Pensando...
  </div>`;
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: q,
        billContext: currentBill
      })
    });
    
    if (!res.ok) throw new Error('Error al conectar con la IA');
    
    const data = await res.json();
    
    // Función simple de markdown a HTML para negritas
    const htmlText = data.reply.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br>');
    
    document.getElementById(idBurbuja).innerHTML = htmlText;
  } catch (err) {
    document.getElementById(idBurbuja).innerHTML = '<span style="color:var(--color-danger)">Ups, hubo un error de conexión con la IA. Inténtalo de nuevo.</span>';
  }
  
  msgs.scrollTop = msgs.scrollHeight;
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
      if(sbClient) await sbClient.auth.signOut();
      window.location.href = 'auth.html';
    });
  }

  // --- FASE 6: TIJERAS INTELIGENTES ---
  renderZombies();
}

// ── FASE 6: TIJERAS INTELIGENTES LÓGICA ────────────────
function renderZombies() {
  const container = document.getElementById('zombieSubscriptions');
  if(!container) return;

  const zombies = [
    { name: 'Gimnasio Virtual Pro', price: 19.99, lastUsed: 'Hace 4 meses', logo: '💪' },
    { name: 'Suscripción Revistas', price: 8.50, lastUsed: 'Hace 7 meses', logo: '📰' },
    { name: 'App Meditación Premium', price: 12.99, lastUsed: 'Hace 1 año', logo: '🧘' }
  ];

  if (!container.dataset.rendered) {
    container.innerHTML = zombies.map(sub => `
      <div class="card card-interactive" style="display:flex; flex-direction:column; justify-content:space-between; border-left:4px solid var(--color-danger); transition: all 0.3s ease; position:relative; overflow:hidden">
        <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:16px">
          <div style="font-size:2rem; filter:grayscale(0.5); opacity:0.8">${sub.logo}</div>
          <div style="flex:1">
            <div style="font-weight:800; font-size:1.1rem; color:var(--text-primary)">${sub.name}</div>
            <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:600; margin-top:2px">Uso detectado: ${sub.lastUsed}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.2rem; font-weight:900; color:var(--color-danger); font-family:var(--font-mono)">€${sub.price}/mes</div>
          </div>
        </div>
        <button class="btn" style="width:100%; border:none; background: linear-gradient(135deg, #10B981, #059669); color:white; font-weight:800; font-size:1rem; padding:10px; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 15px rgba(16, 185, 129, 0.4)" onclick="triggerMachete(this, '${sub.name}', ${sub.price})">
          CORTAR SUSCRIPCIÓN ✂️
        </button>
      </div>
    `).join('');
    container.dataset.rendered = "true";
  }
}

function triggerMachete(btnElement, subName, price) {
  const card = btnElement.closest('.card');
  
  // Efecto visual y de sonido (simulado)
  btnElement.innerHTML = 'Cancelando suscripción de forma segura... 🛡️';
  btnElement.style.background = '#0F172A';
  
  setTimeout(() => {
    // Aplicar animación CSS de navajazo
    card.classList.add('sliced-card');
    
    showToast(`✂️ ¡Suscripción Cancelada! Dejarás de pagar €${price}/mes por ${subName}.`, 'ok');
    launchConfetti();
    
    setTimeout(() => {
      card.style.display = 'none';
    }, 600);
  }, 800);
}

// FUMADA FASE 5 LÓGICA
function joinCoopAuction(btn) {
  btn.innerHTML = '¡Inscrito en el Grupo de 343 usuarios! 🎉';
  btn.style.background = '#10B981';
  btn.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
  showToast('Te notificaremos cuando termine la subasta. ✅', 'ok');
  launchConfetti();
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

// ── MAPPING ───────────────────────────────
function mapSupabaseBill(row) {
  const emojiMap = {luz:'⚡',gas:'🔥',telecos:'📱',combustible:'⛽',seguros:'🛡️'};
  return {
    id:          row.id,
    vertical:    row.vertical || 'luz',
    emoji:       emojiMap[row.vertical] || '📄',
    name:        row.provider_name || 'Factura',
    amount:      row.amount || 0,
    date:        row.billing_date || row.created_at?.slice(0,10) || '',
    saving:      row.saving || 0,
    status:      row.status || 'analizado',
    lines:       row.lines || [],
    recs:        row.recs || [],
    chatContext: row.chat_context || []
  };
}

// ── INIT ──────────────────────────────────
async function initApp() {
  if(typeof lucide!=='undefined') lucide.createIcons();

  // Inicializar cliente Supabase (CDN UMD ya cargado antes de este script)
  if (window.supabase && window.supabase.createClient) {
    sbClient = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  }
  if (!sbClient) {
    console.error('[Ahorra360] Supabase CDN no disponible.');
    window.location.href = 'auth.html';
    return;
  }

  // ── MODO REAL (Supabase conectado) ────
  try {
    const { data: { session }, error: sessionErr } = await sbClient.auth.getSession();

    if (sessionErr || !session) {
      window.location.href = 'auth.html';
      return;
    }

    currentUser = session.user;
    
    // Interceptar callback de éxito de Stripe
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session_id')) {
      await sbClient.from('profiles').update({ is_premium: true }).eq('id', currentUser.id);
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      setTimeout(() => {
        showToast('¡Pago verificado y subscripción activada!', 'ok');
        if (typeof launchConfetti !== 'undefined') launchConfetti();
      }, 500);
    }
    
    const name  = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    const email = currentUser.email;
    const init  = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    setSidebarUser(name, email, init);

    // 1. Cargar Perfil y Hogar Principal
    const { data: profile } = await sbClient.from('profiles').select('*, hogares(*)').eq('id', currentUser.id).single();
    if (profile) {
      window.currentProfile = profile;
      if (profile.is_premium) {
        const pb = document.getElementById('profilePlanBadge');
        if(pb) pb.innerHTML = '<span class="badge badge-accent">Plan PRO/Ghost (Activo)</span>';
      }
      if (typeof document !== 'undefined') {
        const pn = document.getElementById('pNombre'); if(pn) pn.value = profile.full_name || '';
      }
    }

    // 2. Cargar Facturas desde la nueva tabla 'facturas' y con RLS
    const { data: facturas, error: factErr } = await sbClient
      .from('facturas')
      .select('*')
      .order('fecha_emision', { ascending: false });

    if (factErr || !facturas || facturas.length === 0) {
      console.warn('[Ahorra360] No se encontraron facturas en Supabase o falló RLS. Usando Demo Mock.');
      USER_BILLS = [];
    } else {
      USER_BILLS = facturas.map(mapSupabaseBill);
    }

    // 3. Cargar Servicios (Suministros regulares)
    const { data: servicios, error: srvErr } = await sbClient
      .from('servicios')
      .select('*')
      .eq('es_activo', true);

    if (!srvErr && servicios && servicios.length > 0) {
      // Mapear los servicios de la BDD a la variable en memoria
      const emojiMap = {luz:'⚡',gas:'🔥',telecos:'📱',combustible:'⛽',seguros:'🛡️'};
      HOGAR_SERVICES.length = 0; // Limpiar anteriores
      servicios.forEach(s => {
        HOGAR_SERVICES.push({
          emoji: emojiMap[s.tipo] || '📋',
          name: s.tipo.charAt(0).toUpperCase() + s.tipo.slice(1),
          provider: s.proveedor,
          amount: parseFloat(s.coste_mensual_estimado || 0),
          expiry: s.fecha_renovacion ? s.fecha_renovacion.slice(0,7) : '',
          active: true
        });
      });
    }

    // Navegar a Inicio o Hash
    const hash = window.location.hash.replace('#','');
    navigate(hash && document.getElementById('page-'+hash) ? hash : 'inicio');

    // Escuchar cambios de sesión
    sbClient.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.href = 'auth.html';
    });

  } catch(err) {
    console.error('[Ahorra360] initApp error:', err);
    // Mostrar demo en lugar de un bucle de redirects infinito
    USER_BILLS = [];
    navigate('inicio');
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

// ── LOGICA MULTIHOGAR ──────────────────────────
function renderHogar() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openInviteModal() {
  const m = document.getElementById('modalInvite');
  if(m) {
    m.style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function closeInviteModal() {
  const m = document.getElementById('modalInvite');
  if(m) m.style.display = 'none';
}

function copyInvite(btn) {
  const input = btn.previousElementSibling;
  input.select();
  document.execCommand('copy');
  showToast('¡Enlace de invitación copiado y listo para enviar!', 'ok');
}

function triggerGhostPadres(btn) {
  btn.innerHTML = '<span style="animation:spin 1s linear infinite; display:inline-block">⚙️</span> Autorizando Piloto Automático...';
  btn.style.opacity = '0.8';
  setTimeout(() => {
    btn.innerHTML = '<i data-lucide="check-circle" width="14" height="14"></i> Piloto Automático Trabajando (Reclamando)';
    btn.style.background = '#059669';
    btn.style.border = 'none';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    showToast('Delegación en Piloto Automático aceptada remotamente. El equipo experto está trabajando.', 'ok');
  }, 2000);
}

function animateRPA() {
  const bar = document.getElementById('rpaBar1');
  const status = document.getElementById('rpaStatus1');
  if(!bar || !status) return;

  const steps = [
    { text: "Navegando a repsol.es...", p: 15 },
    { text: "Bypassing Captcha v3...", p: 30 },
    { text: "Extrayendo DNI de vault...", p: 45 },
    { text: "Rellenando formulario personal...", p: 60 },
    { text: "Validando IBAN...", p: 75 },
    { text: "Firmando contrato digital...", p: 90 },
    { text: "Alta completada ✅", p: 100 }
  ];

  let current = 0;
  const rpaInterval = setInterval(() => {
    if(!isGhostModeActive) return; // Pause if ghost mode is disabled
    
    if(current >= steps.length) {
      clearInterval(rpaInterval);
      setTimeout(() => {
          // Restart loop to keep it active for the demo
          bar.style.transition = 'none';
          bar.style.width = '0%';
          status.innerText = "Reiniciando job...";
          setTimeout(() => { 
            bar.style.transition = 'width 1s ease'; 
            current = 0; 
            animateRPA(); 
          }, 1500);
      }, 5000);
      return;
    }
    bar.style.width = steps[current].p + '%';
    status.innerText = steps[current].text;
    
    if(steps[current].p === 100) {
      logToGhostTerminal("Job RPA [Script_Alta_Repsol] finalizado con ÉXITO.", "success");
    } else {
      // Optional logging trace for major steps
      if(steps[current].p === 30 || steps[current].p === 75) {
         logToGhostTerminal("RPA Trace: " + steps[current].text, "sys");
      }
    }
    
    current++;
  }, 2200);
}

// ── STRIPE GHOST MODE PAYWALL ─────────────
async function checkoutGhostMode(fromBurofax = false) {
  if (window.currentProfile?.is_premium) {
    showToast('Ya tienes Piloto Automático activo. Gestión sin límites habilitada.', 'ok');
    return;
  }
  if (STRIPE_PK.includes('TU_CLAVE')) {
    showToast('Modo de prueba Stripe. (El Admin no ha configurado la PK)', 'error');
    return simulateStripeSuccess(fromBurofax);
  }
  showToast('Conectando de forma segura con Stripe...', 'ok');
  try {
    const stripe = Stripe(STRIPE_PK);
    const { error } = await stripe.redirectToCheckout({
      lineItems: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      successUrl: window.location.origin + window.location.pathname + '?session_id={CHECKOUT_SESSION_ID}' + window.location.hash,
      cancelUrl: window.location.href,
      clientReferenceId: currentUser?.id
    });
    if (error) throw error;
  } catch (err) {
    showToast('Checkout no configurado correctamente en el servidor.', 'error');
  }
}

function simulateStripeSuccess(fromBurofax) {
   const overlay = document.createElement('div');
   overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;perspective:1000px';
   overlay.innerHTML = `
     <div style="background:var(--bg-surface);padding:40px;border-radius:24px;text-align:center;max-width:400px;animation:popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;box-shadow: 0 24px 50px rgba(0,0,0,0.5)">
       <div style="font-size:3.5rem;margin-bottom:16px;animation:bounce 2s infinite">💳</div>
       <h2 style="font-weight:900;font-size:1.5rem;margin-bottom:12px;font-family:var(--font-heading)">Piloto Automático Premium</h2>
       <p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.5;margin-bottom:24px">Se requiere una <b>Suscripción Plus (4,99€/mes)</b> para delegarnos el 100% de la gestión formal y reclamaciones certificadas.</p>
       <div style="background:var(--color-warning-50);color:var(--color-warning);font-size:0.8rem;padding:12px;border-radius:12px;margin-bottom:24px;border:1px dashed var(--color-warning);text-align:left">
         <i data-lucide="alert-triangle" width="14" height="14" style="display:inline;vertical-align:-2px"></i> <b>Modo emulador local activo:</b><br/>Como no has configurado tu Stripe API Key real en <code>app.js</code>, simulo el pago al pinchar abajo.
       </div>
       <button class="btn btn-primary w-full" id="btnSimulatePay" style="border-radius:99px;font-size:1.05rem;padding:14px;box-shadow:var(--shadow-lg)">Simular Pago Premium</button>
       <button class="btn btn-secondary w-full mt-2" onclick="this.parentElement.parentElement.remove()">Cancelar</button>
     </div>
   `;
   document.body.appendChild(overlay);
   if(typeof lucide!=='undefined') lucide.createIcons();
   
   document.getElementById('btnSimulatePay').onclick = async () => {
     overlay.remove();
     showToast('¡Suscripción adquirida! RPA Ghost Mode DESBLOQUEADO.', 'ok');
     launchConfetti();
     
     if (!window.currentProfile) window.currentProfile = {};
     window.currentProfile.is_premium = true;
     
     const pb = document.getElementById('profilePlanBadge');
     if(pb) pb.innerHTML = '<span class="badge badge-accent">Plan PRO/Ghost (Activo)</span>';
     
     if (sbClient && currentUser) {
       await sbClient.from('profiles').update({ is_premium: true }).eq('id', currentUser.id);
     }
     
     if (fromBurofax) {
        triggerBurofax(document.getElementById('btnGhostBurofax') || document.body);
     }
   };
}

function triggerBurofax(btn) {
  if(!isGhostModeActive) {
    showToast('Activa el Piloto Automático primero para utilizar la Gestoría Asistida por IA.', 'error');
    return;
  }
  if(!window.currentProfile?.is_premium) {
     if(btn) btn.id = 'btnGhostBurofax'; // Tag target
     return checkoutGhostMode(true);
  }
  btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="margin-right:8px" width="16" height="16"></i> Generando Reclamación Segura...';
  if(typeof lucide!=='undefined') lucide.createIcons();
  
  logToGhostTerminal('Iniciando procedimiento de reclamación por cobros abusivos...', 'warning');
  
  setTimeout(() => {
    logToGhostTerminal('Generando texto del Burofax empleando jurisprudencia del Tribunal Supremo...', 'sys');
  }, 1500);
  
  setTimeout(() => {
    logToGhostTerminal('Firmando documento con certificado digital de Ahorra360...', 'sys');
  }, 3500);
  
  setTimeout(() => {
    btn.style.background = '#0F172A';
    btn.innerHTML = '<i data-lucide="check-circle" width="16" height="16"></i> Reclamación Enviada';
    btn.disabled = true;
    if(typeof lucide!=='undefined') lucide.createIcons();
    
    showToast('⚖️ Burofax certificado enviado con éxito. Recuperación en curso.', 'ok');
    logToGhostTerminal('Burofax certificado enviado. Plazo estimado de devolución: 15 días.', 'success');
  }, 6500);
}

// ── CHARTS INTELIGENCIA FASE 12 ──────────────────
let chartDonut=null, chartBar=null;
function renderAdvisorCharts() {
  if (typeof Chart === 'undefined') return;

  const currentAnnualExpense = HOGAR_SERVICES.reduce((acc,s)=>acc + (s.amount||0), 0) * 12;
  // Ahorro teórico basado en mercado (25%) -> Extracción bancaria cruzada con BBBDD
  const annualSavingPotential = currentAnnualExpense * 0.25; 
  
  document.getElementById('impact5YearsHighlight').innerText = '€' + (annualSavingPotential * 5).toFixed(0);

  // 1. Donut Chart - Gastos
  const ctxDonut = document.getElementById('expensesDonutChart');
  if(ctxDonut) {
    if(chartDonut) chartDonut.destroy();
    
    let labels = [], data = [];
    HOGAR_SERVICES.forEach(s => { labels.push(s.name); data.push(s.amount); });
    if(data.length === 0) { labels=['Vacío']; data=[1]; } // Fallback vacio

    chartDonut = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['#6366F1','#F59E0B','#10B981','#EC4899','#8B5CF6','#3B82F6'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#64748b', font:{family:'"Inter",sans-serif', size:11} } }
        },
        cutout: '75%'
      }
    });
  }

  // 2. Bar Chart - Proyección a 5 Años
  const ctxBar = document.getElementById('savingsProjectionChart');
  if(ctxBar) {
    if(chartBar) chartBar.destroy();
    
    const years = ['Año 1', 'Año 2', 'Año 3', 'Año 4', 'Año 5'];
    // Gasto acumulado (Si no hace nada)
    const sinAhorra = years.map((_, i) => currentAnnualExpense * (i+1));
    // Gasto acumulado (Con Ahorra 360 optimizador)
    const conAhorra = years.map((_, i) => (currentAnnualExpense - annualSavingPotential) * (i+1));

    chartBar = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Tu banco sin IA',
            data: sinAhorra,
            backgroundColor: '#CBD5E1',
            borderRadius: 6
          },
          {
            label: 'Patrimonio con Ahorra 360',
            data: conAhorra,
            backgroundColor: '#10B981',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#64748b', font:{family:'"Inter",sans-serif'} } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color:'rgba(0,0,0,0.04)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

// Interceptar navigate para cargar gráficas automáticamente
const originalNavigate = navigate;
navigate = function(page) {
   originalNavigate(page);
   if(page === 'advisor') {
      setTimeout(()=>renderAdvisorCharts(), 200);
   }
};

// ── AI CONCIERGE (FASE 13) ──────────────────────
function toggleConcierge() {
  const widget = document.getElementById('ai-concierge-widget');
  if(!widget) return;
  const isClosed = widget.classList.contains('concierge-closed');
  if(isClosed) {
    widget.classList.remove('concierge-closed');
    const badge = widget.querySelector('.fab-badge');
    if(badge) badge.style.display = 'none';
    setTimeout(() => document.getElementById('conciergeInput').focus(), 300);
  } else {
    widget.classList.add('concierge-closed');
  }
}

function handleConciergeInput(e) {
  if(e.key === 'Enter') sendConciergeMessage();
}

function appendConciergeMessage(text, type, rawHtml = false) {
  const container = document.getElementById('conciergeMessages');
  const msg = document.createElement('div');
  msg.className = `msg-bubble ${type}`;
  if(type === 'ai') {
     msg.innerHTML = rawHtml ? text : `<div style="display:flex;gap:10px"><i data-lucide="bot" width="16" height="16" style="min-width:16px;margin-top:2px;color:var(--color-primary)"></i> <div>${text}</div></div>`;
  } else {
     msg.innerHTML = text;
  }
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  if(typeof lucide !== 'undefined') lucide.createIcons();
  return msg;
}

function showConciergeTyping() {
  const container = document.getElementById('conciergeMessages');
  const msg = document.createElement('div');
  msg.className = `msg-bubble ai`;
  msg.id = 'conciergeTyping';
  msg.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function removeConciergeTyping() {
  const typing = document.getElementById('conciergeTyping');
  if(typing) typing.remove();
}

function sendConciergeMessage() {
  const input = document.getElementById('conciergeInput');
  const text = input.value.trim();
  if(!text) return;
  
  appendConciergeMessage(text, 'user');
  input.value = '';
  document.getElementById('conciergeSendBtn').disabled = true;
  
  // Heuristic NLU Simulation
  showConciergeTyping();
  setTimeout(() => {
    removeConciergeTyping();
    document.getElementById('conciergeSendBtn').disabled = false;
    processAgenticAction(text.toLowerCase());
  }, 1200 + Math.random()*800);
}

function processAgenticAction(intent) {
  if(intent.includes('luz') || intent.includes('electrici') || intent.includes('iberdrola') || intent.includes('endesa')) {
     appendConciergeMessage('Entendido. Estás pagando una media de 98€/mes de Luz. <b>Lanzando Subasta Flash entre 25 comercializadoras energéticas</b>...', 'ai', true);
     appendConciergeMessage('⚡ Ejecutando Subasta en background...', 'sys');
     setTimeout(() => { openAuction('Luz'); }, 1500);
  } 
  else if(intent.includes('fibra') || intent.includes('movil') || intent.includes('internet') || intent.includes('telef')) {
     appendConciergeMessage('Detecto sobreprecio en la tarifa de telecomunicaciones de tu hogar principal. No te preocupes, yo me encargo de rastrear la mejor tarifa y hacer la portabilidad. <b>Activando Magic Switch.</b>', 'ai', true);
     appendConciergeMessage('🔄 Llamando a motor Magic Switch Autónomo...', 'sys');
     setTimeout(() => { executeMagicSwitch('telecos', 89.90); }, 1500);
  }
  else if(intent.includes('banco') || intent.includes('sincroni') || intent.includes('recibo') || intent.includes('cuenta')) {
     appendConciergeMessage('Sin problema. Para auditar todas tus métricas necesito conectar con tu Banco por Open Banking (Lectura). Abriendo el <b>Trust Center</b> ahora mismo.', 'ai', true);
     setTimeout(() => { openTrustCenter(); }, 1500);
  }
  else if(intent.includes('seguro') || intent.includes('mapfre') || intent.includes('coche') || intent.includes('hogar')) {
     appendConciergeMessage('Esa póliza está un 18% por encima del mercado. Voy a disparar la <b>Subasta Flash de Seguros</b> para conseguir mejores coberturas al menor precio automáticamente.', 'ai', true);
     setTimeout(() => { openAuction('Seguro'); }, 1500);
  }
  else if(intent.includes('demanda') || intent.includes('reclam') || intent.includes('activista') || intent.includes('denuncia')) {
     appendConciergeMessage('Has pronunciado la palabra mágica. Nuestro equipo jurídico automatizado tiene varias demandas colectivas abiertas contra abusos de eléctricas. <b>Redirigiendo al Modo Activista...</b>', 'ai', true);
     setTimeout(() => { navigate('activista'); }, 1500);
  }
  else if(intent.includes('solar') || intent.includes('placa') || intent.includes('coche') || intent.includes('electrico') || intent.includes('ev')) {
     appendConciergeMessage('Entendido. Vamos a simular el impacto económico de cambiar tu infraestructura. <b>Abriendo la IA Gemela del Hogar...</b>', 'ai', true);
     setTimeout(() => { navigate('hogar'); }, 1500);
  }
  else if(intent.includes('oraculo') || intent.includes('predic') || intent.includes('futuro') || intent.includes('fijo')) {
     appendConciergeMessage('Buena idea. Vamos a consultar el mercado de futuros para ver si te conviene bloquear una tarifa ahora mismo. <b>Consultando el Oráculo predictivo a 12 meses...</b>', 'ai', true);
     setTimeout(() => { navigate('inicio'); document.getElementById('oracleChart').scrollIntoView({behavior:'smooth'}); }, 1500);
  }
  else if(intent.includes('grupo') || intent.includes('colectiv') || intent.includes('club') || intent.includes('10000')) {
     appendConciergeMessage('¡La unión hace la fuerza! Te voy a llevar a la Plaza Mayor de Ahorra 360 para que te unas a la puja colectiva. <b>Buscando la bolsa activa...</b>', 'ai', true);
     setTimeout(() => { navigate('inicio'); document.getElementById('btnJoinClub').scrollIntoView({behavior:'smooth'}); }, 1500);
  }
  else if(intent.includes('llamar') || intent.includes('voz') || intent.includes('negocia') || intent.includes('telefono') || intent.includes('telefónic')) {
     appendConciergeMessage('Reconocimiento vocal afirmativo. Preparando el motor sintético ElevenLabs para interceptar a tu proveedor. <b>Iniciando llamada telefónica...</b>', 'ai', true);
     setTimeout(() => { startPhoneCallSim('Atención Comercial Endesa'); }, 2000);
  }
  else if(intent.includes('pasaporte') || intent.includes('identidad') || intent.includes('datos') || intent.includes('b2b') || intent.includes('perfil')) {
     appendConciergeMessage('Desplegando tu Identidad de Datos Segura verificada por PSD2. Accediendo a tu <b>Pasaporte de Consumidor Premium...</b>', 'ai', true);
     setTimeout(() => { navigate('pasaporte'); }, 1500);
  }
  else if(intent.includes('tarjeta') || intent.includes('cashback') || intent.includes('reembolso') || intent.includes('pagar')) {
     appendConciergeMessage('Preparando tu panel Fintech. Abriendo sistema de <b>Ahorra 360 Card</b> con tu Cashback disponible listado...', 'ai', true);
     setTimeout(() => { navigate('tarjeta'); }, 1500);
  }
  else if(intent.includes('macro') || intent.includes('radar') || intent.includes('noticias') || intent.includes('bce')) {
     appendConciergeMessage('Escaneando el ecosistema global de mercados. Localizando impactos monetarios directos en tus contratos. Abriendo el <b>Radar Macro...</b>', 'ai', true);
     setTimeout(() => { navigate('radar'); }, 1500);
  }
  else {
     appendConciergeMessage('No reconozco esa instrucción específica. Prueba a decirme "Mostrar mi pasaporte", "Noticias económicas", "Comprar coche eléctrico", "Unirme al club de compras" o "Llamar a Iberdrola".', 'ai', true);
  }
}

// ── FASE 15: MODO ORÁCULO ──────────────────────
let oracleChartInstance = null;
function renderOracleChart() {
  const ctx = document.getElementById('oracleChart');
  if(!ctx) return;
  
  if(oracleChartInstance) {
    oracleChartInstance.destroy();
  }
  
  const months = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'];
  const baseLine = [65, 62, 70, 85, 110, 80, 55, 60, 75, 90, 85, 70]; // Projected amounts
  
  // Colors: green for < 65, yellow for 65-85, red for > 85
  const bgColors = baseLine.map(val => {
    if(val >= 100) return 'rgba(239, 68, 68, 0.8)'; // Red
    if(val >= 80) return 'rgba(245, 158, 11, 0.8)'; // Yellow
    return 'rgba(16, 185, 129, 0.8)'; // Green
  });

  if (typeof Chart === 'undefined') return;

  oracleChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Gasto Proyectado (€)',
        data: baseLine,
        backgroundColor: bgColors,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Inter', size: 14 },
          bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
          padding: 12,
          callbacks: {
            label: function(context) {
              const val = context.raw;
              if (val >= 100) return `€${val} (Riesgo Alto - TTF Spike)`;
              if (val >= 80) return `€${val} (Aviso Incertidumbre)`;
              return `€${val} (Zona Segura)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }
        }
      }
    }
  });
}

// ── FASE 16: IA GEMELA DEL HOGAR (SIMULADOR) ──
function runSimulations() {
  // EV Simulation
  const evToggle = document.getElementById('simEvToggle');
  const evKm = parseFloat(document.getElementById('simEvKm').value) || 15000;
  const evImpact = document.getElementById('simEvImpact');
  
  if (evToggle && evToggle.checked) {
    const gasCost = (7 / 100) * 1.6 * evKm;
    const evCost = (18 / 100) * 0.1 * evKm;
    const netSaving = gasCost - evCost;
    evImpact.textContent = `+ ${Math.round(netSaving)} €/año`;
    evImpact.style.color = '#10B981';
  } else if (evToggle) {
    evImpact.textContent = '--- €';
    evImpact.style.color = 'var(--text-muted)';
  }

  // Solar Simulation
  const solarToggle = document.getElementById('simSolarToggle');
  const solarKwp = parseFloat(document.getElementById('simSolarKwp').value) || 3.5;
  const solarImpact = document.getElementById('simSolarImpact');
  
  if (solarToggle && solarToggle.checked) {
    const generation = solarKwp * 1500;
    const selfConsump = (generation * 0.4) * 0.15;
    const exports = (generation * 0.6) * 0.06;
    const totalSolarSaving = selfConsump + exports;
    
    solarImpact.textContent = `+ ${Math.round(totalSolarSaving)} €/año`;
    solarImpact.style.color = '#10B981';
  } else if (solarToggle) {
    solarImpact.textContent = '--- €';
    solarImpact.style.color = 'var(--text-muted)';
  }
}

// ── FASE 17: CLUB DE LOS 10.000 ───────────────
function joinClub10000(btn) {
  btn.disabled = true;
  btn.innerHTML = '<div style="animation:spin 1s linear infinite; display:inline-block">⚙️</div> Apuntándote...';
  
  setTimeout(() => {
    btn.innerHTML = '<i data-lucide="check-circle" width="16" height="16"></i> ¡Ya estás reservado!';
    btn.style.background = '#10B981';
    btn.style.color = 'white';
    lucide.createIcons();
    
    // Animate progress bar slightly
    const pg = document.getElementById('clubProgressBar');
    if(pg) pg.style.width = '82.48%';
    const count = document.getElementById('clubJoinedCount');
    if(count) count.textContent = '8.248 apuntados (¡Incluido tú!)';
    
    showToast('Te has unido al Club de los 10.000. Te avisaremos en 48h con la tarifa ganadora.', 'ok');
    if(typeof launchConfetti === 'function') launchConfetti();
  }, 1200);
}

// ── FASE 18: MODO ACTIVISTA ───────────────────
function joinLawsuit(btn, type) {
  btn.disabled = true;
  btn.innerHTML = '<div style="animation:spin 1s linear infinite; display:inline-block">⚙️</div> Generando mandato legal...';
  
  setTimeout(() => {
    btn.innerHTML = '<i data-lucide="check-circle" width="16" height="16"></i> Apoderamiento Firmado y Presentado';
    btn.style.background = '#10B981';
    btn.style.color = 'white';
    lucide.createIcons();
    showToast(`Te has adherido a la Demanda Colectiva contra abusos (${type}). Nuestro bufete asociado te confirmará el progreso.`, 'ok');
  }, 1500);
}

// ── FASE 20: LLAMADA IA (ElevenLabs Sim) ───────────
let callInterval = null;
let scriptTimeouts = [];

function startPhoneCallSim(company = 'Iberdrola') {
  const modal = document.getElementById('modalPhoneCall');
  if(!modal) return;
  modal.style.display = 'flex';
  lucide.createIcons();
  
  document.getElementById('callTargetName').textContent = 'Dialing: ' + company;
  const timerLabel = document.getElementById('callTimer');
  const transcriptBox = document.getElementById('callTranscript');
  const barsArr = document.querySelectorAll('.bar');
  
  transcriptBox.innerHTML = '';
  timerLabel.textContent = '00:00';
  
  // Pause waveform initally
  barsArr.forEach(b => b.style.animationPlayState = 'paused');
  
  let callTime = 0;
  clearInterval(callInterval);
  scriptTimeouts.forEach(clearTimeout);
  scriptTimeouts = [];
  
  // Scripted conversation mimicking ElevenLabs integration
  const script = [
    { t: 0, who: 'sys', text: 'Conectando (Centralita SIP)...' },
    { t: 3000, who: 'sys', text: 'Llamada respondida.' },
    { t: 3500, who: 'operadora', text: 'Operador: Hola, ¿con quién hablo?' },
    { t: 6000, who: 'ia', text: 'IA: Buenos días. Hablo en representación y mandato explícito de Ignacio.' },
    { t: 10000, who: 'operadora', text: 'Operador: Dígame, ¿el motivo de su consulta?' },
    { t: 14000, who: 'ia', text: 'IA: Exijo igualación de tarifa base. Su cliente paga 48€ de más respecto a ofertas de sus competidores del mercado.' },
    { t: 20000, who: 'operadora', text: 'Operador: Eh... Un momento, por favor, voy a revisar la póliza.' },
    { t: 25000, who: 'sys', text: 'Esperando respuesta... (Música en espera)' },
    { t: 30000, who: 'operadora', text: 'Operador: Como cliente premium, le aplico un 15% adicional de descuento hoy mismo.' },
    { t: 35000, who: 'ia', text: 'IA: Trato hecho. Proceda a actualizar las condiciones para el mes en curso o elevaremos baja.' },
    { t: 39000, who: 'sys', text: '¡Acuerdo cerrado! Extrayendo descuento.' }
  ];

  // Logic to simulate call duration
  let hasAnswered = false;
  scriptTimeouts.push(setTimeout(() => {
    hasAnswered = true;
    callInterval = setInterval(() => {
      callTime++;
      const s = String(callTime % 60).padStart(2, '0');
      const m = String(Math.floor(callTime / 60)).padStart(2, '0');
      timerLabel.textContent = `${m}:${s}`;
    }, 1000);
  }, 3000));

  script.forEach(line => {
    scriptTimeouts.push(setTimeout(() => {
      const p = document.createElement('div');
      p.style.fontSize = '0.85rem';
      p.style.lineHeight = '1.4';
      p.style.padding = '8px';
      p.style.borderRadius = '8px';
      p.style.opacity = '0';
      p.style.transition = 'opacity 0.3s ease';
      
      // Control UI components (e.g., waveform) responding to character
      if(line.who === 'operadora') {
        p.style.color = '#D1D5DB';
        p.style.background = 'rgba(255,255,255,0.05)';
        barsArr.forEach(b => b.style.animationPlayState = 'paused');
      } else if(line.who === 'ia') {
        p.style.color = '#34D399';
        p.style.background = 'rgba(16,185,129,0.05)';
        p.style.fontWeight = '700';
        p.style.borderLeft = '2px solid #34D399';
        barsArr.forEach(b => b.style.animationPlayState = 'running');
      } else {
        p.style.color = '#F59E0B';
        p.style.fontStyle = 'italic';
        p.style.textAlign = 'center';
        barsArr.forEach(b => b.style.animationPlayState = 'paused');
      }
      
      p.textContent = line.text;
      transcriptBox.appendChild(p);
      setTimeout(() => p.style.opacity = '1', 50); // fade in
      
      // Auto-scroll
      transcriptBox.scrollTo({ top: transcriptBox.scrollHeight, behavior: 'smooth' });
      
      if(line.t === 39000) {
        scriptTimeouts.push(setTimeout(() => endPhoneCallSim(), 3500));
      }
    }, line.t));
  });
}

function endPhoneCallSim() {
  const modal = document.getElementById('modalPhoneCall');
  if(modal) modal.style.display = 'none';
  clearInterval(callInterval);
  scriptTimeouts.forEach(clearTimeout);
  
  if(typeof launchConfetti === 'function') launchConfetti();
  showToast('Acuerdo extrajudicial completado: ¡Tu IA ha bajado la factura -15% por voz!', 'star');
}

// ── FASE 21: PASAPORTE B2B ───────────────────
function togglePassportAccess(checkbox, company) {
  if(checkbox.checked) {
    showToast(`Acceso Open Data concedido a ${company}. Acaban de licitar para firmar tu contrato B2B.`, 'ok');
    if(typeof launchConfetti === 'function') launchConfetti();
  } else {
    showToast(`Acceso revocado para ${company}. Tu Identidad de Datos vuelve a estar blindada y ciega para ellos.`, 'error');
  }
}

// ── PÁGINA TARJETA (FASE 22) ────────────────
function renderTarjeta() {
  const holder = document.getElementById('cardHolderName');
  if (holder) holder.textContent = currentUser?.user_metadata?.full_name || 'USUARIO AHORRA';
  
  const txList = document.getElementById('tarjetaTxList');
  if (!txList) return;
  
  const ctx = [
    { date: 'Hoy, 14:30', name: 'Cashback Amazon', amount: '+€2.40', type: 'plus' },
    { date: 'Ayer, 09:15', name: 'Cashback Uber', amount: '+€1.10', type: 'plus' },
    { date: '10 Mar, 10:00', name: 'Suscripción Ahorra 360 Plus', amount: '-€9.99', type: 'minus' },
    { date: '01 Mar, 21:40', name: 'Cashback Mercadona', amount: '+€4.50', type: 'plus' },
  ];
  
  txList.innerHTML = ctx.map((t, i) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border-bottom:${i < ctx.length - 1 ? '1px solid var(--border)' : 'none'};">
       <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:40px; height:40px; border-radius:50%; background:var(--bg-surface-2); display:flex; align-items:center; justify-content:center; color:var(--text-secondary);">
             <i data-lucide="${t.type === 'plus' ? 'arrow-down-left' : 'arrow-up-right'}" width="18" height="18" style="color:${t.type === 'plus' ? 'var(--color-accent)' : 'var(--text-primary)'};"></i>
          </div>
          <div>
            <div style="font-weight:600; font-size:0.95rem;">${t.name}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${t.date}</div>
          </div>
       </div>
       <div style="font-weight:700; font-size:1.1rem; color:${t.type === 'plus' ? 'var(--color-accent)' : 'var(--text-primary)'};">
          ${t.amount}
       </div>
    </div>
  `).join('');
}

// ── SUPABASE INITIALIZATION & AUTH ────────
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof SUPA_URL !== 'undefined' && !SUPA_URL.includes('your-project')) {
    try {
      if (window.supabase) {
        sbClient = window.supabase.createClient(SUPA_URL, SUPA_KEY);
      }
    } catch(e) { console.warn('Supabase init failed:', e); }
  }

  if (isDashboard() && sbClient) {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session && !DEMO_MODE) {
      window.location.href = 'auth.html';
      return;
    }
    
    sbClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = 'auth.html';
      } else if (session) {
        currentUser = session.user;
        updateUserUI(currentUser);
      }
    });
    
    if (session) {
      currentUser = session.user;
      updateUserUI(currentUser);
      // Cargar hogar principal (Fase 11 Data Integration)
      loadUserHogarData(session.user.id);
    }
  }
});

function setSidebarUser(name, email, init) {
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  
  if (profileAvatar) profileAvatar.textContent = init || 'UA';
  if (profileName) profileName.textContent = name || 'Usuario';
  
  // Update desktop sidebar info if available
  document.querySelectorAll('.user-info .user-name').forEach(el => el.textContent = name || 'Usuario');
  document.querySelectorAll('.user-info .user-plan').forEach(el => el.textContent = email || '');
}

function updateUserUI(user) {
  const name = user?.user_metadata?.full_name || user.email;
  const init = name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() || 'UA';
  setSidebarUser(name, user.email, init);
  
  // Populate profile inputs if in DOM
  const pName = document.getElementById('pNombre');
  const pEmail = document.getElementById('pEmail');
  if (pName && !pName.value) pName.value = user?.user_metadata?.full_name || '';
  if (pEmail && !pEmail.value) pEmail.value = user.email || '';
}

async function loadUserHogarData(userId) {
  if (!sbClient) return;
  try {
    const { data: hogar, error } = await sbClient.from('hogares').select('*').eq('owner_id', userId).single();
    if (hogar) {
      window.currentHogarId = hogar.id;
      // Actualizar UI del hogar con los datos
      const hNom = document.getElementById('hNombre'); if (hNom) hNom.value = hogar.nombre || '';
      const hCP = document.getElementById('hCP'); if (hCP) hCP.value = hogar.cp || '';
      const hM2 = document.getElementById('hM2'); if (hM2) hM2.value = hogar.m2 || '';
      const hPex = document.getElementById('hPersonas'); if (hPex) hPex.value = hogar.personas || '';
      
      // Load services linked to this hogar
      const { data: svcs } = await sbClient.from('servicios').select('*').eq('hogar_id', hogar.id).eq('es_activo', true);
      if (svcs && svcs.length > 0) {
         // Limpiar locales
         HOGAR_SERVICES.length = 0;
         svcs.forEach(s => {
           HOGAR_SERVICES.push({
             name: s.tipo.charAt(0).toUpperCase() + s.tipo.slice(1),
             provider: s.proveedor,
             amount: s.coste_mensual_estimado || 0,
             emoji: s.tipo==='luz'?'⚡':s.tipo==='gas'?'🔥':s.tipo==='telecos'?'📱':'🛡️',
             active: s.es_activo,
             expiry: ''
           });
         });
         if(currentPage === 'hogar' || currentPage === 'inicio') {
            renderHogar();
            renderInicio();
         }
      }
    }
  } catch(e) { console.warn('UserData load error:', e); }
}

function logoutUser() {
  if (sbClient) {
    sbClient.auth.signOut();
  } else {
    window.location.href = 'auth.html';
  }
}

function switchDeepCompare(tab) {
  const tabs = ['darkmarket', 'subs', 'futuros', 'gemelo'];
  tabs.forEach(t => {
    const btn = document.getElementById('tab-dc-' + t);
    const view = document.getElementById('view-dc-' + t);
    if(btn) {
      if(t === tab) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    }
    if(view) {
      view.style.display = (t === tab) ? 'block' : 'none';
    }
  });
}

// ── FASE 23: RADAR MACROECONÓMICO ────────────────────────────────────
function renderRadar() {
  const now = new Date();
  const ts = document.getElementById('radarLastUpdate');
  if (ts) ts.textContent = `Actualizado: ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}h`;

  // ── KPIs ──
  const KPIS = [
    { label: 'PVPC España',   value: '0.142 €/kWh', delta: '+4.2%',  color: '#F59E0B', up: true,  icon: 'zap' },
    { label: 'Petróleo Brent',value: '82.4 $/bbl',  delta: '-1.8%',  color: '#10B981', up: false, icon: 'droplets' },
    { label: 'IPC España',    value: '2.9%',         delta: '-0.3pp', color: '#10B981', up: false, icon: 'trending-up' },
    { label: 'EURIBOR 12M',   value: '2.58%',        delta: '-0.12pp',color: '#10B981', up: false, icon: 'percent' },
  ];
  const kpiEl = document.getElementById('radarKpis');
  if (kpiEl) {
    kpiEl.innerHTML = KPIS.map(k => `
      <div class="saving-card" style="text-align:center;">
        <i data-lucide="${k.icon}" width="22" height="22" style="color:${k.color}; margin-bottom:8px;"></i>
        <div style="font-size:1.6rem; font-weight:900; color:var(--text-primary); line-height:1;">${k.value}</div>
        <div style="font-size:0.8rem; font-weight:700; color:${k.up ? '#EF4444' : '#10B981'}; margin:4px 0;">
          ${k.up ? '▲' : '▼'} ${k.delta}
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${k.label}</div>
      </div>
    `).join('');
  }

  // ── ENERGÍA ──
  const energyEl = document.getElementById('radarEnergy');
  if (energyEl) {
    const hourly = [
      { h: '00h', v: 0.068 }, { h: '06h', v: 0.082 }, { h: '09h', v: 0.158 },
      { h: '12h', v: 0.134 }, { h: '17h', v: 0.186 }, { h: '20h', v: 0.201 }, { h: '22h', v: 0.142 }
    ];
    const max = Math.max(...hourly.map(x => x.v));
    energyEl.innerHTML = `
      <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">Precio OMIE por franjas horarias hoy</div>
      <div style="display:flex; gap:6px; align-items:flex-end; height:80px; margin-bottom:8px;">
        ${hourly.map(h => {
          const pct = (h.v / max) * 100;
          const hot = h.v > 0.15;
          return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px;">
            <div style="flex:1; display:flex; align-items:flex-end; width:100%;">
              <div style="width:100%; height:${pct}%; background:${hot ? '#EF4444' : '#10B981'}; border-radius:4px 4px 0 0; min-height:4px;"></div>
            </div>
            <div style="font-size:0.65rem; color:var(--text-muted);">${h.h}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
        <span style="color:#10B981; font-weight:700;">✔ Mejor franja: 00-07h</span>
        <span style="color:#EF4444; font-weight:700;">⚠ Pico: 20-22h</span>
      </div>
    `;
  }

  // ── INFLACIÓN / EURIBOR ──
  const inflEl = document.getElementById('radarInflation');
  if (inflEl) {
    const series = [
      { label: 'IPC general',       val: 2.9,  prev: 3.2, unit: '%' },
      { label: 'IPC subyacente',    val: 2.4,  prev: 2.6, unit: '%' },
      { label: 'EURIBOR 12M',       val: 2.58, prev: 2.70, unit: '%' },
      { label: 'Tipo BCE',           val: 2.50, prev: 3.00, unit: '%' },
      { label: 'Gas TTF (€/MWh)',   val: 38.2, prev: 41.1, unit: '€' },
    ];
    inflEl.innerHTML = series.map(s => {
      const delta = (s.val - s.prev).toFixed(2);
      const up = delta > 0;
      return `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
        <span style="font-size:0.9rem; color:var(--text-primary);">${s.label}</span>
        <div style="display:flex; gap:12px; align-items:center;">
          <span style="font-size:0.8rem; color:var(--text-muted);">Anterior: ${s.unit === '%' ? '' : s.unit}${s.prev}${s.unit === '%' ? s.unit : ''}</span>
          <span style="font-weight:800; color:var(--text-primary);">${s.unit === '%' ? '' : s.unit}${s.val}${s.unit === '%' ? s.unit : ''}</span>
          <span style="font-size:0.8rem; font-weight:700; color:${up ? '#EF4444' : '#10B981'};">${up ? '▲' : '▼'} ${Math.abs(delta)}</span>
        </div>
      </div>`;
    }).join('');
  }

  // ── IA IMPACTS ──
  const impEl = document.getElementById('radarImpacts');
  if (impEl) {
    const impacts = [
      { severity: 'high',   icon: 'zap',          title: 'Pico eléctrico esta noche (20-22h)',           text: 'Anticipa tus electrodomésticos al mediodía. Estimamos -14€ en tu factura mensual.' },
      { severity: 'medium', icon: 'trending-down', title: 'EURIBOR bajó al 2.58%',                        text: 'Tu hipoteca variable revisada en junio se reducirá aprox. -42€/mes. Valoramos esperar antes de fijar un tipo fijo.' },
      { severity: 'low',    icon: 'droplets',      title: 'Gas TTF cae (-7% este mes)',                   text: 'Si tienes tarifa gas indexada, es un buen momento para no cambiarte a tarifa fija todavía.' },
      { severity: 'medium', icon: 'shield-alert',  title: 'IPC baja a 2.9% — revisa cláusulas de revisión', text: 'Si tu arrendador tiene cláusula IPC, la próxima revisión será más baja. Guarda esta captura.' },
    ];
    const colors = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
    impEl.innerHTML = impacts.map(i => `
      <div style="display:flex; gap:16px; align-items:flex-start; padding:14px; background:var(--bg-surface-2); border-radius:12px;">
        <div style="min-width:40px; height:40px; border-radius:50%; background:${colors[i.severity]}22; display:flex;align-items:center;justify-content:center;">
          <i data-lucide="${i.icon}" width="18" height="18" style="color:${colors[i.severity]};"></i>
        </div>
        <div>
          <div style="font-weight:700; font-size:0.95rem; margin-bottom:4px;">${i.title}</div>
          <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.5;">${i.text}</div>
        </div>
      </div>
    `).join('');
  }

  if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 60);
}
