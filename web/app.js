/**
 * Ahorra 360 - Frontend Core Logic
 * Handles Supabase Auth, mock uploads, and data rendering.
 */

const SUPABASE_URL = 'https://gzkhrgmfbzkskmnselnz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6a2hyZ21mYnprc2ttbnNlbG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzAzNzYsImV4cCI6MjA4OTI0NjM3Nn0.t9yFb6qtHQCGfF4n9HOLU-uceIVUYXxDsAp3BSXbl50';

// Initialize Supabase safely — only works from http:// (not file://)
window.supabase = window.supabase || null;
const isLocalFile = window.location.protocol === 'file:';
if (isLocalFile) {
    console.warn('[Ahorra360] Abriendo desde file:// — Supabase Auth no funcionará correctamente. Usa el servidor local.');
}
try {
    if (window.supabase && !isLocalFile && typeof window.supabase.createClient === 'function') {
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('[Ahorra360] Supabase conectado correctamente.');
    } else {
        window.supabase = null;
    }
} catch (e) {
    console.error('[Ahorra360] Error inicializando Supabase:', e);
    window.supabase = null;
}
const supabase = window.supabase;

const STATE_KEY = 'a360_data';
const DATA_VERSION = 2; // Bump this to force-reset stale localStorage data

// Default mock state
const DEFAULT_STATE = {
    user: null,
    hogar: null,
    invoices: [
        {
            id: '123',
            vertical: 'Luz',
            provider: 'Endesa',
            date: '1 dic – 31 dic 2025',
            amount: 66.23,
            consumption: '234 kWh',
            status: 'Revisada OK',
            saving: 180,
            timestamp: Date.now() - 1000000
        },
        {
            id: '456',
            vertical: 'Telecos',
            provider: 'Orange',
            date: '1 ene – 31 ene 2026',
            amount: 49.99,
            consumption: 'Fibra + 2 Líneas Móvil',
            status: 'Alerta Promo',
            saving: 360,
            timestamp: Date.now() - 500000
        },
        {
            id: '789',
            vertical: 'Gas',
            provider: 'Naturgy',
            date: '10 nov – 10 ene 2026',
            amount: 112.45,
            consumption: '1.200 kWh',
            status: 'Revisada OK',
            saving: 45,
            timestamp: Date.now() - 800000
        },
        {
            id: '101',
            vertical: 'Seguro Hogar',
            provider: 'Mapfre',
            date: 'Anual 2026',
            amount: 285.00,
            consumption: 'Cobertura Completa',
            status: 'Renovación Lista',
            saving: 0,
            timestamp: Date.now() - 1200000
        },
        {
            id: '102',
            vertical: 'Seguro Coche',
            provider: 'Mutua Madrileña',
            date: 'Anual 2026',
            amount: 420.50,
            consumption: 'Todo Riesgo Franquicia',
            status: 'Revisada OK',
            saving: 85,
            timestamp: Date.now() - 2000000
        },
        {
            id: '103',
            vertical: 'Combustible',
            provider: 'Repsol',
            date: '15 feb 2026',
            amount: 55.20,
            consumption: '34 Litros (Diésel)',
            status: 'Mejorable',
            saving: 96,
            timestamp: Date.now() - 300000
        }
    ],
    alerts: [
        { id: 1, type: 'promo', title: 'Fin de promoción Orange Fibra', desc: 'Tu descuento del 50% "Promoción Bienvenida" termina el 15 de Abril (en 30 días). Tu cuota pasará a 99,98€.' },
        { id: 2, type: 'seguro', title: 'Seguro de Hogar Mapfre: Renovación próxima', desc: 'El preaviso legal de 30 días para cancelar sin penalización empieza en 2 semanas. Mapfre prevé una subida del 8% de tu prima.' },
        { id: 3, type: 'gasolina', title: 'Gasolina: Ruta habitual cara', desc: 'Sueles repostar en Repsol A-6. Hay una gasolinera low-cost a 3 min de tu ruta que baja el litro en 0.18€.' }
    ]
};

function getState() {
    const data = localStorage.getItem(STATE_KEY);
    if (data) {
        const parsed = JSON.parse(data);
        // If data version doesn't match, reset to default (clears stale demo data)
        if (parsed._version !== DATA_VERSION) {
            console.log('[Ahorra360] Stale localStorage data detected, resetting to default.');
            localStorage.removeItem(STATE_KEY);
            const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
            fresh._version = DATA_VERSION;
            return fresh;
        }
        return parsed;
    }
    const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
    fresh._version = DATA_VERSION;
    return fresh;
}

function saveState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

async function loginUser(email, password) {
    if (!supabase) {
        console.log('[Ahorra360] Supabase no disponible → usando modo demo');
        return mockLoginUser(email, password);
    }
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            // Mensaje de error claro en español
            const msg = error.message.includes('Invalid login') || error.message.includes('invalid_credentials')
                ? 'Email o contraseña incorrectos. Comprueba tus datos.'
                : 'Error de inicio de sesión: ' + error.message;
            showToast(msg, 'error');
            return false;
        }
        const state = getState();
        state.user = { email: data.user.email, name: data.user.email.split('@')[0], id: data.user.id };
        saveState(state);
        window.location.href = 'dashboard.html';
        return true;
    } catch (e) {
        console.error('[Ahorra360] Error de red al iniciar sesión:', e);
        showToast('Error de conexión. Comprueba tu internet e inténtalo de nuevo.', 'error');
        return false;
    }
}

async function loginWithGoogle() {
    if (!supabase) {
        showToast('Conexión con base de datos no disponible.', 'error');
        return;
    }
    try {
        // Obtenemos la URL actual. Si estamos en file:// esto fallará al redirigir,
        // pero para despliegues locales (localhost) o web funciona.
        let redirectUrl = window.location.origin + window.location.pathname.replace('auth.html', 'dashboard.html');
        if (redirectUrl.includes('file://')) {
            showToast('Google Login requiere un servidor web. Usa la versión publicada.', 'warning');
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });
        if (error) {
            showToast('Error conectando con Google: ' + error.message, 'error');
        }
    } catch (e) {
        showToast('Error inesperado: ' + e.message, 'error');
    }
}

function mockLoginUser(email, password) {
    const state = getState();
    state.user = { email, name: email.split('@')[0] };
    saveState(state);
    window.location.href = 'dashboard.html';
    return true;
}

async function registerUser(email, password) {
    if (!supabase) {
        console.log('[Ahorra360] Supabase no disponible → usando modo demo');
        return mockRegisterUser(email, password);
    }
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            console.error('[Ahorra360] Error en signUp:', error);
            // Mensajes de error en español claros
            let msg = 'Error en el registro: ' + error.message;
            if (error.message.includes('already registered') || error.message.includes('User already')) {
                msg = 'Este email ya está registrado. ¿Quieres iniciar sesión?';
            } else if (error.message.includes('Password should be')) {
                msg = 'La contraseña debe tener al menos 6 caracteres.';
            } else if (error.message.includes('valid email')) {
                msg = 'Introduce un email válido.';
            }
            showToast(msg, 'error');
            return false;
        }

        if (!data || !data.user) {
            showToast('Error temporal. Por favor, inténtalo de nuevo.', 'error');
            return false;
        }

        // Supabase puede devolver user sin email_confirmed_at
        // si tiene activada la confirmación de email
        const needsConfirmation = !data.user.email_confirmed_at && !data.session;
        if (needsConfirmation) {
            // Guardar datos básicos del usuario aunque no esté confirmado
            const state = getState();
            state.user = { email: data.user.email, name: data.user.email.split('@')[0], id: data.user.id, pendingConfirmation: true };
            saveState(state);
            // Mostrar pantalla de confirmación de email
            showEmailConfirmationView(email);
            return false; // No avanzar al setup todavía
        }

        // Usuario creado y confirmado (confirmación de email desactivada en Supabase)
        const state = getState();
        state.user = { email: data.user.email, name: data.user.email.split('@')[0], id: data.user.id };
        saveState(state);
        return true;

    } catch (e) {
        console.error('[Ahorra360] Error de red en registro:', e);
        // Si hay error de red (CORS, sin conexión), usar modo demo
        if (e.message && (e.message.includes('fetch') || e.message.includes('network') || e.message.includes('CORS'))) {
            console.warn('[Ahorra360] Error de red → activando modo demo');
            showToast('Sin conexión con el servidor. Entrando en modo demo.', 'warning');
            return mockRegisterUser(email, password);
        }
        showToast('Error inesperado: ' + e.message, 'error');
        return false;
    }
}

// Muestra una vista de "confirma tu email" dentro del card de auth
function showEmailConfirmationView(email) {
    // Si existe la función goToView (estamos en auth.html), la usamos
    // Añadimos una vista dinámica de confirmación
    const container = document.querySelector('.auth-card');
    if (!container) return;

    // Ocultar todas las views
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    // Ocultar el header de auth
    const hdr = document.querySelector('.auth-header');
    if (hdr) hdr.style.display = 'none';

    // Crear o actualizar la vista de confirmación
    let confirmView = document.getElementById('view-confirm-email');
    if (!confirmView) {
        confirmView = document.createElement('div');
        confirmView.id = 'view-confirm-email';
        confirmView.className = 'view text-center';
        container.appendChild(confirmView);
    }
    confirmView.innerHTML = `
        <div style="width:64px;height:64px;background:#DBEAFE;color:#1D4ED8;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <i data-lucide="mail" width="32" height="32"></i>
        </div>
        <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:8px">¡Revisa tu email!</h2>
        <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:16px">
            Hemos enviado un enlace de verificación a<br/>
            <strong style="color:var(--text-primary)">${email}</strong>
        </p>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-bottom:24px">Abre el correo y haz clic en el enlace para activar tu cuenta. Después vuelve aquí e inicia sesión.</p>
        <button class="btn btn-primary btn-lg w-full" style="justify-content:center" onclick="goToView('login')">
            <i data-lucide="log-in" width="18" height="18"></i> Iniciar sesión
        </button>
        <p style="margin-top:12px;font-size:0.8rem;color:var(--text-muted)">¿No te llegó? Revisa la carpeta de spam.</p>
    `;
    confirmView.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
}

// Muestra un toast/notificación flotante
function showToast(message, type = 'info') {
    // Remover toast anterior si existe
    const existing = document.getElementById('a360-toast');
    if (existing) existing.remove();

    const colors = {
        error: { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B', icon: 'alert-circle' },
        warning: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E', icon: 'alert-triangle' },
        success: { bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46', icon: 'check-circle' },
        info: { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF', icon: 'info' }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.id = 'a360-toast';
    toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
        padding: 12px 20px; border-radius: 12px; font-size: 0.875rem; font-weight: 500;
        display: flex; align-items: center; gap: 8px; z-index: 9999;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);
        max-width: 400px; text-align: center;
        animation: slideUp 0.3s ease;
    `;
    toast.innerHTML = `<i data-lucide="${c.icon}" width="18" height="18"></i> ${message}`;
    document.body.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    // Auto-remove after 5s
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
}

function mockRegisterUser(email, password) {
    const state = getState();
    state.user = { email, name: email.split('@')[0] };
    saveState(state);
    goToView('setup');
    return true;
}

async function setHogar(name) {
    const state = getState();
    state.hogar = name;
    saveState(state);

    // Save to DB
    if (supabase && state.user && state.user.id) {
        const { error } = await supabase.from('hogares').insert([
            { user_id: state.user.id, nombre: name }
        ]);
        if (error) console.error("Error saving hogar to DB", error);
    }

    goToView('aha');
}

async function logoutUser() {
    if (supabase) {
        await supabase.auth.signOut();
    }
    const state = getState();
    state.user = null;
    state.hogar = null;
    saveState(state);
    window.location.href = 'index.html';
}

function getIconForVertical(v) {
    if (v.includes('Luz')) return { icon: '⚡', bg: '#FEF3C7', col: '#D97706' };
    if (v.includes('Agua')) return { icon: '💧', bg: '#DBEAFE', col: '#1E40AF' };
    if (v.includes('Gas')) return { icon: '🔥', bg: '#FEE2E2', col: '#DC2626' };
    if (v.includes('Telecos')) return { icon: '📱', bg: '#EDE9FE', col: '#6D28D9' };
    return { icon: '📄', bg: '#F3F4F6', col: '#4B5563' };
}

// UI Renderers for Dashboard
async function renderDashboard() {
    let state = getState();
    if (!state.user) {
        window.location.href = 'auth.html?mode=login';
        return;
    }

    // Try to load data from DB if available
    if (supabase) {
        try {
            // Load Hogar
            const { data: hogarData } = await supabase.from('hogares').select('nombre').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(1);
            if (hogarData && hogarData.length > 0) {
                state.hogar = hogarData[0].nombre;
            }

            // Load Facturas
            const { data: facturasData } = await supabase.from('facturas').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false });
            if (facturasData && facturasData.length > 0) {
                // Remove mocks if DB has real data
                state.invoices = facturasData.map(f => ({
                    id: f.id,
                    vertical: f.vertical,
                    provider: f.provider,
                    date: f.period_date,
                    amount: f.amount,
                    consumption: f.consumption,
                    status: f.status,
                    saving: f.saving,
                    timestamp: new Date(f.created_at).getTime()
                }));
            }
            saveState(state);
        } catch (e) { console.warn("Could not fetch from DB, using local", e); }
    }

    // Update header info
    const hName = document.getElementById('headerHogarName');
    if (hName) hName.innerText = state.hogar || 'Casa García'; // Default fallback

    const hUser = document.getElementById('sidebarUserName');
    if (hUser) hUser.innerText = state.user.name;

    // If no invoices loaded (e.g. new user or stale state), use default demo data
    if (!state.invoices || state.invoices.length === 0) {
        state.invoices = JSON.parse(JSON.stringify(DEFAULT_STATE.invoices));
    }

    // Render Invoices List
    const listContainer = document.getElementById('invoicesList');
    if (listContainer && state.invoices) {
        listContainer.innerHTML = '';

        // Calculate total
        let totalCents = 0;
        let totalSavings = 0;

        state.invoices.sort((a, b) => b.timestamp - a.timestamp).forEach(inv => {
            totalCents += Math.round(inv.amount * 100);
            totalSavings += inv.saving || 0;

            const style = getIconForVertical(inv.vertical);
            let savingBadge = inv.saving > 0
                ? `<span class="text-accent font-semibold"><i data-lucide="zap" width="12" style="display:inline;vertical-align:-2px"></i> Ahorro: €${inv.saving}/año</span>`
                : `<span class="text-warning font-semibold"><i data-lucide="clock" width="12" style="display:inline;vertical-align:-2px"></i> ${inv.status}</span>`;

            let statusBadge = inv.saving > 0
                ? `<span class="badge badge-green">Revisada OK</span>`
                : `<span class="badge badge-amber">Alerta Promo</span>`;

            if (inv.status === 'Analizando...') {
                statusBadge = `<span class="badge badge-blue"><i data-lucide="loader" class="animate-spin" width="10"></i> Analizando...</span>`;
                savingBadge = `<span class="text-muted">Procesando documento...</span>`;
            }

            const el = document.createElement('div');
            el.className = 'doc-item';

            // Navigate to fixed detail views
            el.onclick = () => { location.hash = '#factura/' + inv.id; };

            el.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="doc-icon" style="background:${style.bg};color:${style.col}">${style.icon}</div>
          <div class="doc-main">
            <div class="doc-title">${inv.vertical} ${inv.provider} ${statusBadge} <span class="badge badge-ai">✨ IA</span></div>
            <div class="doc-meta">
              <span>${inv.date}</span> • 
              ${savingBadge}
            </div>
          </div>
        </div>
        <div class="doc-right">
          <div style="text-align:right">
            <div class="doc-amount">€${inv.amount.toFixed(2).replace('.', ',')}</div>
            <div class="text-xs text-muted">${inv.consumption}</div>
          </div>
          <i data-lucide="chevron-right" width="20" class="text-muted"></i>
        </div>
      `;
            // Append invoice item
            listContainer.appendChild(el);
        });

        // Update stats
        const elGasto = document.getElementById('statGastoMes');
        if (elGasto) {
            // Use local format for numbers (e.g. 1.025,99)
            const parts = (totalCents / 100).toFixed(2).split('.');
            elGasto.innerHTML = `€${parseInt(parts[0]).toLocaleString('es-ES')}<span style="font-size:1rem;color:var(--text-muted)">,${parts[1]}</span>`;
        }

        const elAhorro = document.getElementById('statAhorroPotencial');
        if (elAhorro) elAhorro.innerHTML = `€${totalSavings.toLocaleString('es-ES')}`;

        // Render dynamic CSS pie chart if the element exists
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer && totalCents > 0) {
            // Group by vertical
            const totalsByVertical = {};
            state.invoices.forEach(inv => {
                const amount = inv.amount;
                // Group Insurance together
                let v = inv.vertical.includes('Seguro') ? 'Seguros' : inv.vertical;
                totalsByVertical[v] = (totalsByVertical[v] || 0) + amount;
            });

            // Create conic gradient string for pie chart
            const colors = {
                'Luz': '#F59E0B',      // Amber
                'Telecos': '#8B5CF6',  // Violet
                'Gas': '#EF4444',      // Red
                'Seguros': '#10B981',  // Emerald
                'Combustible': '#6B7280' // Gray
            };

            let gradientStr = '';
            let currentPct = 0;
            const totalEuros = totalCents / 100;

            const chartLegend = document.createElement('div');
            chartLegend.className = 'flex-col gap-2 mt-4 text-sm w-full';

            const sortedVerticals = Object.keys(totalsByVertical).sort((a,b) => totalsByVertical[b] - totalsByVertical[a]);

            sortedVerticals.forEach(v => {
                const amount = totalsByVertical[v];
                const pct = (amount / totalEuros) * 100;
                const col = colors[v] || '#CBD5E1';
                
                gradientStr += `${col} ${currentPct}% ${currentPct + pct}%, `;
                currentPct += pct;

                // Add to legend
                chartLegend.innerHTML += `
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <div style="width:12px;height:12px;border-radius:3px;background:${col}"></div>
                            <span>${v}</span>
                        </div>
                        <div class="font-semibold">€${amount.toFixed(2).replace('.',',')}</div>
                    </div>
                `;
            });

            gradientStr = gradientStr.slice(0, -2); // remove last comma

            chartContainer.innerHTML = `
                <div style="width:160px;height:160px;border-radius:50%;background:conic-gradient(${gradientStr});margin:0 auto;position:relative;box-shadow:inset 0 0 0 4px var(--bg-surface), 0 4px 6px -1px rgba(0,0,0,0.1)">
                  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:110px;height:110px;background:var(--bg-surface);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;box-shadow:0 0 10px rgba(0,0,0,0.05)">
                     <div class="text-xs text-muted font-semibold uppercase tracking-wide">Total</div>
                     <div class="font-bold text-xl">€${parseInt(totalEuros).toLocaleString('es-ES')}</div>
                  </div>
                </div>
            `;
            chartContainer.appendChild(chartLegend);
        }

    }

    if (window.lucide) window.lucide.createIcons();
}

// UPLOAD SIMULATOR
function handleFileUpload(fileInputId) {
    const input = document.getElementById(fileInputId);
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const state = getState();

    // Close modal and show upload UI
    closeModals();
    document.getElementById('uploadProgressOverlay').classList.add('open');

    const steps = document.querySelectorAll('.upload-step');
    steps.forEach(s => s.classList.remove('active'));
    steps[0].classList.add('active'); // OCR step

    // Simulate process
    setTimeout(() => {
        steps[0].classList.remove('active');
        steps[0].classList.add('done');
        steps[1].classList.add('active'); // RAG LLM step

        setTimeout(() => {
            steps[1].classList.remove('active');
            steps[1].classList.add('done');
            steps[2].classList.add('active'); // Comparador step

            setTimeout(async () => {
                // Done
                document.getElementById('uploadProgressOverlay').classList.remove('open');

                // Infer something basic from file name
                let vertical = 'Luz';
                let prov = 'Iberdrola';
                let cons = '200 kWh';
                let amount = Math.round((Math.random() * 80 + 20) * 100) / 100;
                let saving = Math.round(Math.random() * 50);

                const fname = file.name.toLowerCase();
                if (fname.includes('agua')) { vertical = 'Agua'; prov = 'Canal YII'; cons = '12 m3'; amount = 25.50; saving = 0; }
                if (fname.includes('gas')) { vertical = 'Gas'; prov = 'Naturgy'; cons = '1.050 kWh'; amount = 85.20; saving = 25; }
                if (fname.includes('tele')) { vertical = 'Telecos'; prov = 'Vodafone'; cons = 'Fibra + Móvil'; amount = 65.00; saving = 120; }
                if (fname.includes('seguro')) { vertical = 'Seguro Hogar'; prov = 'Ocaso'; cons = 'Anual'; amount = 210.00; saving = 45; }

                const newInv = {
                    id: Date.now().toString(),
                    vertical: vertical,
                    provider: prov,
                    date: 'Nuevo Documento',
                    amount: amount,
                    consumption: cons,
                    status: 'Revisada OK',
                    saving: saving,
                    timestamp: Date.now()
                };

                // Guardar en DB si aplica
                if (supabase && state.user && state.user.id) {
                    const { data, error } = await supabase.from('facturas').insert([{
                        user_id: state.user.id,
                        vertical: newInv.vertical,
                        provider: newInv.provider,
                        period_date: newInv.date,
                        amount: newInv.amount,
                        consumption: newInv.consumption,
                        status: newInv.status,
                        saving: newInv.saving
                    }]).select();
                    if (!error && data) {
                        newInv.id = data[0].id; // Usar id real
                    }
                }

                state.invoices.push(newInv);
                saveState(state);

                // Re-render
                if (window.location.href.includes('dashboard')) {
                    renderDashboard();
                }

            }, 1500);
        }, 2000);
    }, 1500);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    // Check real Supabase session if available
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const state = getState();

        if (session) {
            // Update local state with real user info
            state.user = {
                email: session.user.email,
                name: session.user.email.split('@')[0],
                id: session.user.id
            };
            saveState(state);
        } else {
            // No session in Supabase, clear local user
            state.user = null;
            saveState(state);
        }
    }

    // Check auth everywhere except landing
    const isDashboard = window.location.href.includes('dashboard');
    const isAuth = window.location.href.includes('auth');

    const state = getState();

    if (isDashboard) {
        if (!state || !state.user) {
            window.location.href = 'auth.html?mode=login';
        } else {
            renderDashboard();
        }
    } else if (isAuth) {
        if (state && state.user && document.getElementById('view-login') && document.getElementById('view-login').classList.contains('active')) {
            window.location.href = 'dashboard.html';
        } else if (state && state.user && document.getElementById('view-register') && document.getElementById('view-register').classList.contains('active')) {
            goToView('setup'); // Si está registrado pero volvió a auth, forzar step de hogar
        }
    } else {
        // En index, si ya hay sesión, cambiar botón a ir al panel
        if (state && state.user) {
            const loginBtn = document.querySelector('nav a[href="auth.html?mode=login"]');
            const ctaBtn = document.querySelector('.hero a[href="auth.html"]');
            if (loginBtn) loginBtn.innerText = 'Ir al Panel';
            if (ctaBtn) {
                ctaBtn.innerHTML = 'Entrar al Panel <i data-lucide="arrow-right" width="18"></i>';
                ctaBtn.href = 'dashboard.html';
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }
});
