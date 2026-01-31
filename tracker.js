// ==UserScript==
// @name         Arbitrage Master Master v1.9.1
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        BACKEND: 'https://arbitur.space',
        INTERVAL: 2500,
        START_DELAY: 10000,
        MAX_WAIT_FOR_FUNDING: 60000,
        LOGGING_ENABLED: false  // 🔥 Однією змінною вмикаємо/вимикаємо ВСІ логи
    };

    let cardStates = new Map();
    let isProcessing = false;
    let systemActive = false;

    // --- 🎮 SMART LOGGERS  ---
    const logger = (m, color = "#6366f1") => {
        if (CONFIG.LOGGING_ENABLED) {
            console.log(`%c[ARB-TRACKER] ${m}`, `color: ${color}; font-weight: bold; background: #1e1e2e; padding: 2px 5px; border-radius: 4px;`);
        }
    };
    
    const loggerAZ = (m, color = "#a855f7") => {
        if (CONFIG.LOGGING_ENABLED) {
            console.log(`%c[AUTO-ZERO] ${m}`, `color: ${color}; font-weight: bold; background: #1e1e2e; padding: 2px 5px; border-radius: 4px;`);
        }
    };

    // --- UI HELPERS ---
    function createUI() {
        const ROOT_ID = 'arb-root-v1-2';
        const existing = document.getElementById(ROOT_ID);
        if (existing) return existing;

        const wrap = document.createElement('div');
        wrap.id = ROOT_ID;
        document.body.appendChild(wrap);

        const style = document.createElement('style');
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Inter:wght@400;600;800&display=swap');
            
            #${ROOT_ID} { position: fixed; bottom: 80px; right: 20px; z-index: 999999; font-family: 'Inter', system-ui, sans-serif; }
            .glass { 
                background: rgba(15, 23, 42, 0.75); 
                backdrop-filter: blur(24px) saturate(220%); 
                -webkit-backdrop-filter: blur(24px) saturate(220%);
                border: 1px solid rgba(255,255,255,0.12); 
                border-radius: 28px; 
                color: white; 
                padding: 24px; 
                width: 290px; 
                box-shadow: 0 25px 60px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1); 
                transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, backdrop-filter 0.3s ease;
                position: relative;
                overflow: hidden;
                transform-origin: bottom right;
            }
            .glass.anim-hide { transform: scale(0.8) translateY(20px); opacity: 0; pointer-events: none; }
            .glass.anim-show { transform: scale(1) translateY(0); opacity: 1; pointer-events: auto; }
            .glass::before {
                content: ''; position: absolute; top: 0; left: 0; right: 0; height: 100px;
                background: linear-gradient(180deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 100%);
                pointer-events: none;
            }
            .draggable-header { cursor: move; padding: 12px 0; margin: -24px -24px 20px -24px; border-bottom: 1px solid rgba(255,255,255,0.08); border-radius: 28px 28px 0 0; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding-left: 20px; padding-right: 20px; }
            .hidden { display: none !important; }
            .row { display: flex; justify-content: space-between; margin: 14px 0; background: rgba(255,255,255,0.04); padding: 14px; border-radius: 18px; font-size: 13px; align-items: center; border: 1px solid rgba(255,255,255,0.03); transition: all 0.2s; }
            .row:hover { background: rgba(255,255,255,0.08); transform: translateX(4px); border-color: rgba(99, 102, 241, 0.3); }
            .btn-main { 
                width: 100%; padding: 16px; border-radius: 18px; 
                background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                color: white; border: none; cursor: pointer; font-weight: 800; font-size: 14px; 
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                box-shadow: 0 8px 16px rgba(99, 102, 241, 0.4), inset 0 1px 1px rgba(255,255,255,0.2);
                text-transform: uppercase; letter-spacing: 0.5px;
            }
            .btn-main:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 12px 24px rgba(99, 102, 241, 0.5); }
            .btn-main:active { transform: scale(0.96); }
            .btn-stats { 
                width: 100%; padding: 14px; border-radius: 18px; 
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
                color: #fff; border: 1px solid rgba(139, 92, 246, 0.3); cursor: pointer; margin-top: 12px; 
                font-size: 13px; transition: all 0.3s; font-weight: 800;
                display: flex; align-items: center; justify-content: center; gap: 8px;
                backdrop-filter: blur(10px);
                text-transform: uppercase; letter-spacing: 0.5px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1);
            }
            .btn-stats:hover { 
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
                border-color: rgba(139, 92, 246, 0.6); 
                transform: translateY(-2px) scale(1.01);
                box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
            }
            .btn-stats:active { transform: scale(0.97); }
            .btn-stats i, .btn-stats span { filter: drop-shadow(0 0 5px rgba(255,255,255,0.3)); }
            .rocket { 
                width: 72px; height: 72px; 
                background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                border-radius: 26px; display: flex; align-items: center; justify-content: center; 
                cursor: pointer; font-size: 36px; 
                box-shadow: 0 15px 35px rgba(99, 102, 241, 0.6), inset 0 1px 2px rgba(255,255,255,0.3); 
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
                border: 2px solid rgba(255,255,255,0.15);
                transform-origin: bottom right;
            }
            .rocket.anim-hide { transform: scale(0.5); opacity: 0; pointer-events: none; }
            .rocket.anim-show { transform: scale(1); opacity: 1; pointer-events: auto; }
            .rocket:hover { transform: scale(1.15) rotate(10deg); box-shadow: 0 20px 45px rgba(99, 102, 241, 0.7); }
            .status-badge { padding: 4px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
            .ver-badge { font-size:9px; color:#475569; text-align:center; margin-top:15px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; opacity: 0.5; }
            .donate-box { 
                margin-top: 20px; padding: 16px; border-radius: 20px; 
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05)); 
                border: 1px solid rgba(245, 158, 11, 0.2); text-align: center; cursor: pointer; transition: all 0.3s; 
                position: relative; overflow: hidden;
            }
            .donate-box:hover { background: rgba(245, 158, 11, 0.2); transform: translateY(-3px); border-color: rgba(245, 158, 11, 0.4); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
            .donate-title { font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 900; color: #f59e0b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; }
            .donate-text { font-size: 12px; color: #fff; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; }
            .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.4); transition: .4s; border-radius: 26px; border: 1px solid rgba(255,255,255,0.15); }
            .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 2px; bottom: 2px; background-color: #64748b; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
            input:checked + .slider { background: linear-gradient(135deg, #6366f1, #a855f7); border-color: rgba(255,255,255,0.1); }
            input:checked + .slider:before { transform: translateX(24px); background-color: white; }
            .settings-btn { opacity: 0.5; transition: 0.2s; cursor: pointer; padding: 4px; border-radius: 6px; }
            .settings-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); transform: rotate(45deg); }

            .glass-input {
                width: 100%; padding: 16px; border-radius: 18px; 
                background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255,255,255,0.1);
                color: #fff; font-size: 14px; margin-bottom: 20px; transition: 0.3s;
                box-sizing: border-box; outline: none;
            }
            .glass-input:focus { border-color: #6366f1; background: rgba(0, 0, 0, 0.5); box-shadow: 0 0 15px rgba(99, 102, 241, 0.3); }
            .glass-input::placeholder { color: rgba(255,255,255,0.3); }
        `;
        document.head.appendChild(style);
        return wrap;
    }

    function initDragging(el, key) {
        let isDragging = false;
        let startX, startY, startRight, startBottom;

        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        if (saved.right) el.style.right = saved.right;
        if (saved.bottom) el.style.bottom = saved.bottom;

        el.addEventListener('mousedown', (e) => {
            const header = el.querySelector('.draggable-header');
            const rocket = el.querySelector('.rocket');

            // Allow dragging if clicking header OR rocket
            const isHeader = header && header.contains(e.target);
            const isRocket = rocket && rocket.contains(e.target) && !rocket.classList.contains('hidden');

            if (!isHeader && !isRocket) return;
            if (e.target.closest('button') || e.target.closest('.switch') || e.target.id === 'close_btn' || e.target.id === 'set_name_btn') return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            startRight = window.innerWidth - rect.right;
            startBottom = window.innerHeight - rect.bottom;
            el.style.transition = 'none';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = startX - e.clientX;
            const dy = startY - e.clientY;
            el.style.right = (startRight + dx) + 'px';
            el.style.bottom = (startBottom + dy) + 'px';
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            el.style.transition = '';
            document.body.style.userSelect = '';
            localStorage.setItem(key, JSON.stringify({
                right: el.style.right,
                bottom: el.style.bottom
            }));
        });
    }


    // --- AUTH LOGIC ---
    async function checkAuth() {
        const wrap = createUI();
        const apiKey = localStorage.getItem('arb_api_key');
        const userId = localStorage.getItem('arb_id');
        const name = localStorage.getItem('arb_name');

        // Legacy cleanup: remove old temp keys
        if (apiKey && apiKey.startsWith('temp_')) {
            logger("🧹 Виявлено застарілий ключ. Очищення...", "#f59e0b");
            localStorage.clear();
            location.reload();
            return;
        }

        if (!userId) { renderRegister(wrap); return; }
        if (userId && !apiKey) { renderPending(wrap, userId, name); return; }

        renderMain(wrap, name);
        startSystem();
    }

    function renderRegister(wrap) {
        wrap.innerHTML = `
            <div class="glass anim-show" id="reg_ui">
                <div class="draggable-header">
                    <div style="display:flex; align-items:center; gap:12px">
                        <div style="font-size:24px">🔐</div>
                        <div style="text-align: left">
                            <div style="font-weight:800; font-size:15px; color: #fff">Авторизація</div>
                            <div style="font-size:10px; color:#94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px">Registration Required</div>
                        </div>
                    </div>
                </div>
                
                <p style="font-size:13px; color:#cbd5e1; margin: 0 0 20px 0; line-height: 1.5">Введіть ваш позивний (Прізвище Ім'я) для отримання доступу до системи:</p>
                
                <input id="reg_in" class="glass-input" type="text" placeholder="Приклад: Хрипуненко Андрій" autocomplete="off">
                
                <button id="reg_btn" class="btn-main">Надіслати запит 🚀</button>
                
                <div class="ver-badge" style="margin-top: 25px">ArbiHunter Access Control</div>
            </div>`;

        initDragging(wrap, 'arb_ui_pos');

        const regBtn = document.getElementById('reg_btn');
        const regIn = document.getElementById('reg_in');

        regBtn.onclick = async () => {
            const n = regIn.value.trim();
            if (!n) return alert("Будь ласка, введіть ваше ім'я!");

            regBtn.innerHTML = '<span style="opacity:0.6">Надсилаємо...</span>';
            regBtn.disabled = true;

            try {
                const res = await fetch(`${CONFIG.BACKEND}/api/register`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firstName: n })
                }).then(r => r.json());

                if (res.success) {
                    localStorage.setItem('arb_id', res.userId);
                    localStorage.setItem('arb_name', n);
                    checkAuth();
                } else {
                    alert("Помилка реєстрації: " + (res.error || "Невідома помилка"));
                    regBtn.innerHTML = 'Надіслати запит 🚀';
                    regBtn.disabled = false;
                }
            } catch (e) {
                alert("Сервер недоступний. Спробуйте пізніше.");
                regBtn.innerHTML = 'Надіслати запит 🚀';
                regBtn.disabled = false;
            }
        };

        regIn.onkeypress = (e) => { if (e.key === 'Enter') regBtn.click(); };
    }

    function renderPending(wrap, userId, name) {
        wrap.innerHTML = `
            <div class="glass anim-show" style="text-align:center">
                <div class="draggable-header">
                    <div style="display:flex; align-items:center; gap:12px">
                        <div style="font-size:24px">⏳</div>
                        <div style="text-align: left">
                            <div style="font-weight:800; font-size:15px; color: #fff">Очікування</div>
                            <div style="font-size:10px; color:#f59e0b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px">Pending Approval</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin: 20px 0; padding: 20px; background: rgba(245, 158, 11, 0.05); border-radius: 20px; border: 1px dashed rgba(245, 158, 11, 0.2)">
                    <div style="font-size:12px; color:#94a3b8; margin-bottom: 4px">USER CALLSIGN</div>
                    <div style="font-size:18px; font-weight: 800; color: #fff">${name}</div>
                    <div style="font-size:10px; color:#475569; margin-top: 10px; font-family: monospace">ID: ${userId}</div>
                </div>

                <div id="check_status" style="font-size:13px; color:#cbd5e1; margin-bottom: 20px">Адміністратор обробляє ваш запит. Зачекайте, будь ласка...</div>
                
                <button id="reset_btn" class="btn-stats" style="border-color: rgba(239, 68, 68, 0.2); color: #ef4444">
                    ✕ Скасувати запит
                </button>
            </div>`;

        initDragging(wrap, 'arb_ui_pos');

        document.getElementById('reset_btn').onclick = () => {
            if (confirm('Очистити дані реєстрації та створити новий запит?')) {
                localStorage.clear();
                location.reload();
            }
        };

        const poll = setInterval(async () => {
            try {
                const res = await fetch(`${CONFIG.BACKEND}/api/check-status`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                }).then(r => r.json());

                if (res.status === 'approved') {
                    clearInterval(poll);
                    localStorage.setItem('arb_api_key', res.apiKey);
                    checkAuth();
                } else if (res.status === 'rejected' || res.status === 'banned' || res.status === 'not_found') {
                    clearInterval(poll);
                    const msg = res.status === 'rejected' ? 'Запит відхилено.' : (res.status === 'banned' ? 'Вас заблоковано.' : 'ID не знайдено.');
                    wrap.innerHTML = `
                        <div class="glass" style="text-align:center; border-color:#ef4444">
                            <h3 style="color:#ef4444">❌ Помилка</h3>
                            <p style="font-size:14px">${msg}</p>
                            <button onclick="localStorage.clear();location.reload()" class="btn-main" style="margin-top:20px">Скинути та почати заново</button>
                        </div>`;
                }
            } catch (e) { }
        }, 3000);
    }

    function renderMain(wrap, name) {
        const isH = localStorage.getItem('arb_hide') === 'true';

        wrap.innerHTML = `
            <div class="glass ${isH ? 'anim-hide hidden' : 'anim-show'}" id="main_ui">
                <div class="draggable-header">
                    <div style="display:flex; align-items:center; gap:12px">
                        <div style="font-size:24px; filter: drop-shadow(0 0 8px rgba(99,102,241,0.5))">🛰️</div>
                        <div style="text-align: left">
                            <div style="display:flex; align-items:center; gap:6px">
                                <div id="display_name" style="font-weight:800; font-size:15px; color: #fff; letter-spacing: -0.3px">${name}</div>
                                <span id="set_name_btn" class="settings-btn" title="Змінити нікнейм">⚙️</span>
                            </div>
                            <div style="font-size:10px; color:#10b981; font-weight: 700; text-transform: uppercase; letter-spacing: 1px">● Live Monitoring</div>
                        </div>
                    </div>
                    <span id="close_btn" style="cursor:pointer; opacity:0.6; font-size: 20px; padding: 4px; transition: 0.2s">✕</span>
                </div>
                
                <div class="row">
                    <div style="display:flex; align-items:center; gap:10px">
                        <span style="font-size:18px">📡</span>
                        <span style="font-weight: 600; color: #e2e8f0">Моніторинг</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="act_ch" ${localStorage.getItem('arb_active') !== 'false' ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="row">
                    <div style="display:flex; align-items:center; gap:10px">
                        <span style="font-size:18px">🎯</span>
                        <span style="font-weight: 600; color: #e2e8f0">Auto-Zero</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="zero_ch" ${localStorage.getItem('arb_auto_zero') === 'true' ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>

                <button id="test_btn" class="btn-main" style="margin-top: 10px">⚡ Тест з'єднання</button>
                <button id="stats_btn" class="btn-stats">👥 Команда онлайн</button>

                <div class="donate-box" id="donate_btn">
                    <div class="donate-title">Support Project</div>
                    <div class="donate-text"><span>☕</span> Buy Author coffee <span style="font-size: 10px; opacity: 0.6">(BEP20)</span></div>
                </div>

                <div class="ver-badge">v1.9.1 Stable</div>
            </div>
            <div class="rocket ${isH ? 'anim-show' : 'anim-hide hidden'}" id="rock_btn">🚀</div>
        `;

        initDragging(wrap, 'arb_ui_pos');

        const mainUI = document.getElementById('main_ui');
        const closeBtn = document.getElementById('close_btn');
        const rockBtn = document.getElementById('rock_btn');
        const setNameBtn = document.getElementById('set_name_btn');

        setNameBtn.onclick = () => {
            const newName = prompt('Введіть нове ім\'я (Callsign):', localStorage.getItem('arb_name'));
            if (newName && newName.trim()) {
                localStorage.setItem('arb_name', newName.trim());
                renderMain(wrap, newName.trim());
                sendHeartbeat();
            }
        };

        closeBtn.onmouseenter = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseleave = () => closeBtn.style.opacity = '0.6';

        closeBtn.onclick = () => {
            localStorage.setItem('arb_hide', 'true');

            // Start UI exit
            mainUI.classList.remove('anim-show');
            mainUI.classList.add('anim-hide');

            setTimeout(() => {
                mainUI.classList.add('hidden');
                rockBtn.classList.remove('hidden');
                // Small delay to trigger entry animation
                setTimeout(() => {
                    rockBtn.classList.remove('anim-hide');
                    rockBtn.classList.add('anim-show');
                }, 10);
            }, 400);
        };

        rockBtn.onclick = () => {
            localStorage.setItem('arb_hide', 'false');

            // Start Rocket exit
            rockBtn.classList.remove('anim-show');
            rockBtn.classList.add('anim-hide');

            setTimeout(() => {
                rockBtn.classList.add('hidden');
                mainUI.classList.remove('hidden');
                // Small delay to trigger entry animation
                setTimeout(() => {
                    mainUI.classList.remove('anim-hide');
                    mainUI.classList.add('anim-show');
                }, 10);
            }, 300);
        };
        document.getElementById('act_ch').onchange = (e) => {
            localStorage.setItem('arb_active', e.target.checked);
            logger(`Моніторинг: ${e.target.checked}`, e.target.checked ? "#10b981" : "#ef4444");
            sendHeartbeat();
        };
        document.getElementById('zero_ch').onchange = (e) => {
            localStorage.setItem('arb_auto_zero', e.target.checked);
            loggerAZ(`Auto-Zero: ${e.target.checked}`, e.target.checked ? "#10b981" : "#ef4444");
        };
        document.getElementById('test_btn').onclick = runTest;
        document.getElementById('stats_btn').onclick = showStats;

        document.getElementById('donate_btn').onclick = () => {
            const addr = '0x0bed23201c5c0095acef3bbc1c92c7c59f15e867';
            navigator.clipboard.writeText(addr).then(() => {
                const text = document.querySelector('.donate-text');
                const original = text.innerHTML;
                text.innerHTML = '<span style="color:#10b981">✅ Копійовано!</span>';

                alert(`🚀 Підтримка автора\n\nМережа: BNB Smart Chain (BEP20)\nАдреса: ${addr}\n\n✅ Адреса вже скопійована в буфер обміну! Дякую за підтримку! ☕`);

                setTimeout(() => { text.innerHTML = original; }, 2000);
            });
        };
    }

    // --- ⚡ AUTO-ZERO (TURBO PERSISTENCE) ---
    let lastStopTimestamp = 0;

    document.addEventListener('mousedown', (e) => {
        const target = e.target;
        const stopBtn = target.closest('.stop') || target.closest('.stop-button') || target.innerText === 'STOP';

        if (stopBtn) {
            lastStopTimestamp = Date.now();
            loggerAZ(`🛑 STOP button pressed at ${new Date(lastStopTimestamp).toLocaleTimeString()}`);
            return;
        }

        const startBtn = target.closest('.start') || target.closest('.start-button');
        if (startBtn) {
            if (localStorage.getItem('arb_auto_zero') !== 'true') return;

            const now = Date.now();
            if (lastStopTimestamp > 0 && (now - lastStopTimestamp) < 5000) {
                loggerAZ(`🛡️ Protection: Fast restart detected. Allowing start.`);
                return;
            }

            const card = startBtn.closest('.trade-card');
            if (card) {
                const groups = Array.from(card.querySelectorAll('.field-group, .inline-field-group'));
                const maxOrderGroup = groups.find(g => {
                    const t = g.innerText.toLowerCase();
                    return t.includes('max orders') || t.includes('max open');
                });

                if (maxOrderGroup) {
                    const input = maxOrderGroup.querySelector('input');
                    const saveBtn = maxOrderGroup.querySelector('button');

                    if (input && input.value !== '0') {
                        loggerAZ(`◆ Non-zero: "${input.value}". INTERCEPTING!`, "#f59e0b");
                        e.preventDefault();
                        e.stopPropagation();

                        const originalText = startBtn.innerText;
                        startBtn.innerText = 'Resetting...';
                        startBtn.style.opacity = '0.7';

                        const forceValue = (el, val) => {
                            try {
                                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                                setter.call(el, val);
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                if (el._valueTracker) el._valueTracker.setValue(val);
                            } catch (err) { el.value = val; }
                        };

                        input.focus();
                        forceValue(input, '0');

                        let passes = 0;
                        const persistenceId = setInterval(() => {
                            if (input.value !== '0') {
                                loggerAZ(`🔃 Detected revert! Re-forcing 0.`);
                                forceValue(input, '0');
                            }
                            if (++passes >= 15) {
                                clearInterval(persistenceId);
                                input.blur();
                            }
                        }, 100);

                        if (saveBtn) {
                            let saveAtt = 0;
                            const checkSaveId = setInterval(() => {
                                if ((!saveBtn.disabled && input.value === '0') || ++saveAtt >= 60) {
                                    clearInterval(checkSaveId);
                                    if (input.value !== '0') forceValue(input, '0');

                                    if (!saveBtn.disabled) {
                                        loggerAZ(`💾 SAVE ready!`);
                                        saveBtn.click();
                                        startBtn.innerText = 'Reset Done';
                                        startBtn.style.backgroundColor = '#239825';
                                    } else {
                                        loggerAZ(`⚠️ Force-enabling Save.`);
                                        saveBtn.disabled = false;
                                        saveBtn.removeAttribute('disabled');
                                        saveBtn.click();
                                        startBtn.innerText = 'Reset (Forced)';
                                    }

                                    setTimeout(() => {
                                        startBtn.innerText = originalText;
                                        startBtn.style.opacity = '1';
                                        startBtn.style.backgroundColor = '';
                                    }, 1000);
                                }
                            }, 50);
                        }
                    }
                }
            }
        }
    }, true);

    // --- 📊 MONITOR ENGINE ---
    let filterToggleTimestamp = 0;
    let cardZeroCounts = new Map();

    document.addEventListener('click', (e) => {
        if (e.target.closest('.favorites-star-button')) {
            filterToggleTimestamp = Date.now();
            logger("Фільтр змінено! Пауза моніторингу на 3с...", "#f59e0b");
        }
    });

    function getSignedFunding(cell) {
        if (!cell) return { text: '-', val: 0 };
        const raw = cell.innerText.split(',')[0].trim();
        const val = parseFloat(raw.replace('%', ''));
        if (isNaN(val)) return { text: '-', val: 0 };
        const signed = cell.classList.contains('loss-rate') ? -Math.abs(val) : Math.abs(val);
        return { text: (signed > 0 ? '+' : '') + signed + '%', val: signed };
    }

    function extractData(card, action, orders) {
        try {
            const table = card.querySelector('.exhange-price-info');
            const rows = Array.from(table.querySelectorAll('tr'));
            const fRow = rows.find(r => r.textContent.toLowerCase().includes('funding rate'));
            const nRow = rows.find(r => r.textContent.toLowerCase().includes('next funding'));
            const field = (txt) => Array.from(card.querySelectorAll('.field-group, .inline-field-group')).find(g => g.innerText.includes(txt));

            const funding1 = getSignedFunding(fRow?.cells[1]);
            const funding2 = getSignedFunding(fRow?.cells[2]);
            const next1 = nRow?.cells[1]?.innerText.trim() || "-";

            let isUrgent = false;
            const uMatch = next1.match(/\((\d+):(\d+)\)/);
            if (uMatch && !next1.includes('h') && parseInt(uMatch[1]) < 15) isUrgent = true;

            return {
                action,
                symbol: card.querySelector('.trade-details strong')?.innerText || '?',
                side: card.querySelector('.botside-short, .active')?.innerText || 'SHORT',
                ex1: card.querySelector('.short')?.innerText.trim() || '?',
                ex2: card.querySelector('.long')?.innerText.trim() || '?',
                exName1: rows[0]?.cells[1]?.innerText.trim() || '?',
                exName2: rows[0]?.cells[2]?.innerText.trim() || '?',
                openSpread: field('Open Spread')?.querySelector('input')?.value || '0',
                closeSpread: field('Close Spread')?.querySelector('input')?.value || '0',
                openTicks: field('Open ticks')?.querySelector('input')?.value || '0',
                closeTicks: field('Close ticks')?.querySelector('input')?.value || '0',
                orderSize: field('Order Size')?.querySelector('input')?.value || '0',
                orderSizeUsdt: field('Order Size')?.querySelector('.estimated-size-usdt')?.innerText.replace('≈', '').trim() || '0$',
                ordersCount: orders,
                maxSize: Array.from(card.querySelectorAll('.field-group')).find(g => g.innerText.includes('Allowed size'))?.querySelector('span')?.innerText.split('Max:')[1]?.trim() || '?',
                f1_num: funding1.val,
                f2_num: funding2.val,
                next1: next1,
                next2: nRow?.cells[2]?.innerText.trim() || '-',
                isUrgent,
                enterSpread: table.querySelector('.enterSpread')?.innerText || '-%',
                startTime: card.querySelector('.started-at-timer')?.innerText.replace('Started at: ', '') || '-'
            };
        } catch (e) { return null; }
    }

    function checkFundingReady() {
        const cards = document.querySelectorAll('.trade-card');
        if (cards.length === 0) return false;

        let allReady = true;
        cards.forEach(card => {
            const table = card.querySelector('.exhange-price-info');
            const rows = Array.from(table?.querySelectorAll('tr') || []);
            const fRow = rows.find(r => r.textContent.toLowerCase().includes('funding rate'));

            if (!fRow) {
                allReady = false;
                return;
            }

            const fund1 = getSignedFunding(fRow.cells[1]);
            const fund2 = getSignedFunding(fRow.cells[2]);

            // Ready if any funding is non-zero (or not "-%")
            if (fund1.val === 0 && fund2.val === 0) {
                allReady = false;
            }
        });
        return allReady;
    }

    if (window.arb_monitor_active) return;
    window.arb_monitor_active = true;

    async function monitor() {
        if (!systemActive || isProcessing || localStorage.getItem('arb_active') === 'false') return;

        // --- 🧊 DEBOUNCE: SITE STABILIZATION ---
        if (Date.now() - filterToggleTimestamp < 3000) return;

        isProcessing = true;

        const apiKey = localStorage.getItem('arb_api_key');
        if (!apiKey) { isProcessing = false; return; }

        const localProcessed = new Set();
        const foundOnPage = new Set();

        for (const card of document.querySelectorAll('.trade-card')) {
            const sym = card.querySelector('.trade-details strong')?.innerText;
            if (!sym) continue;

            const ex1 = card.querySelector('.short')?.innerText.trim() || '?';
            const ex2 = card.querySelector('.long')?.innerText.trim() || '?';
            const cardKey = `${sym}_${ex1}_${ex2}`;

            if (localProcessed.has(cardKey)) continue;
            localProcessed.add(cardKey);
            foundOnPage.add(cardKey);

            const ordersRow = Array.from(card.querySelectorAll('tr')).find(r => r.innerText.includes('Orders'));
            const current = parseInt(ordersRow?.querySelector('td:last-child')?.innerText || "0");
            const prev = cardStates.get(cardKey) || 0;

            // Reset zero counter if position is active
            if (current > 0) cardZeroCounts.delete(cardKey);

            if (prev !== current) {
                // If it's a "Close" candidate (current === 0), it must survive 3 cycles
                if (current === 0) {
                    let zeroCount = (cardZeroCounts.get(cardKey) || 0) + 1;
                    cardZeroCounts.set(cardKey, zeroCount);

                    if (zeroCount < 3) {
                        logger(`⏳ Confirmation for ${sym} Close (${zeroCount}/3)...`, "#94a3b8");
                        continue;
                    }
                }

                logger(`Зміна ${sym} [${ex1}-${ex2}]: ${prev} -> ${current}`, "#f59e0b");
                const act = (prev === 0 && current > 0) ? 'open' : (current > prev ? 'increase' : (current === 0 ? 'close' : 'decrease'));
                const data = extractData(card, act, current);

                if (data) {
                    console.log(`%c[ARB-TRACKER] %c📤 [CLIENT] Sending data for ${sym} (${ex1}-${ex2})`, "color: #6366f1; font-weight: bold; background: #1e1e2e; padding: 2px 5px; border-radius: 4px;", "color: #fff;");
                    try {
                        const res = await fetch(`${CONFIG.BACKEND}/api/position`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                positionData: data,
                                userName: localStorage.getItem('arb_name'),
                                userId: localStorage.getItem('arb_id'),
                                apiKey
                            })
                        });

                        const resJ = await res.json();

                        if (res.ok && resJ.success) {
                            logger(`✅ Signal sent: ${sym} (${ex1}-${ex2}) ${act.toUpperCase()}`, "#10b981");
                        } else {
                            const errorMsg = resJ.error || resJ.reason || "Unknown Error";
                            if (resJ.reason === 'duplicate_smart') {
                                logger(`ℹ️ Signal skipped: ${sym} (${ex1}-${ex2}) (Deduplicated)`, "#94a3b8");
                            } else if (resJ.reason === 'lower_spread') {
                                logger(`ℹ️ Скипнуто: ${sym} (Вже є сигнал з кращим спредом)`, "#94a3b8");
                            } else {
                                logger(`⛔ Server denied: ${errorMsg}`, "#ef4444");
                            }
                            if (res.status === 403) systemActive = false;
                        }
                    } catch (e) {
                        logger(`❌ Network Error: ${e.message}`, "#ef4444");
                    }
                    await new Promise(r => setTimeout(r, 500));
                }
                cardStates.set(cardKey, current);
                if (current === 0) cardZeroCounts.delete(cardKey);
            }
        }

        // --- 👻 Handle Disappeared Cards ---
        for (const [key, state] of cardStates.entries()) {
            if (!foundOnPage.has(key) && state > 0) {
                let zeroCount = (cardZeroCounts.get(key) || 0) + 1;
                cardZeroCounts.set(key, zeroCount);

                if (zeroCount >= 3) {
                    logger(`🚫 Card disappeared: ${key}. Marking as CLOSED.`, "#ef4444");
                    cardStates.set(key, 0);
                    cardZeroCounts.delete(key);
                } else {
                    logger(`⏳ Card ${key} missing from DOM (${zeroCount}/3)...`, "#94a3b8");
                }
            }
        }

        isProcessing = false;
    }

    async function sendHeartbeat() {
        const id = localStorage.getItem('arb_id');
        const key = localStorage.getItem('arb_api_key');
        if (!id || !key) return;
        try {
            const res = await fetch(`${CONFIG.BACKEND}/api/heartbeat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: id,
                    userName: localStorage.getItem('arb_name'),
                    isMonitoring: localStorage.getItem('arb_active') !== 'false',
                    apiKey: key
                })
            });
            if (res.status === 403) {
                logger("⛔ Доступ анульовано. Очищення сесії...", "#ef4444");
                localStorage.removeItem('arb_api_key');
                localStorage.removeItem('arb_id'); // Clear ID too to force re-reg if rejected
                checkAuth();
            }
        } catch (e) { }
    }

    function startSystem() {
        logger("Ініціалізація трекеру...", "#6366f1");
        sendHeartbeat();
        setInterval(sendHeartbeat, 60000);

        const startTime = Date.now();
        const checkReady = setInterval(() => {
            const isReady = checkFundingReady();
            const elapsed = Date.now() - startTime;

            if (isReady) {
                clearInterval(checkReady);
                logger("✅ Всі дані прогружені. Запуск моніторингу!", "#10b981");
                systemActive = true;
                setInterval(monitor, CONFIG.INTERVAL);
            } else if (elapsed > CONFIG.MAX_WAIT_FOR_FUNDING) {
                clearInterval(checkReady);
                logger("⚠️ Тайм-аут очікування фандінгу. Запуск з наявними даними.", "#f59e0b");
                systemActive = true;
                setInterval(monitor, CONFIG.INTERVAL);
            } else {
                logger("⏳ Очікування завантаження даних...", "#94a3b8");
            }
        }, 2000);
    }

    async function runTest() {
        const apiKey = localStorage.getItem('arb_api_key');
        const userId = localStorage.getItem('arb_id');
        if (!userId || !apiKey) return;
        logger("🚀 STARTING CONNECTIVITY TEST...", "#a855f7");
        try {
            const t1 = performance.now();
            const res = await fetch(`${CONFIG.BACKEND}/api/test-connection`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, apiKey, userName: localStorage.getItem('arb_name') })
            });
            const t2 = performance.now();
            if (res.ok) alert(`✅ Статус: ОК\nЗатримка: ${(t2 - t1).toFixed(0)}ms`);
        } catch (e) { alert("Error"); }
    }

    async function showStats() {
        try {
            const users = await fetch(`${CONFIG.BACKEND}/api/active-details`).then(r => r.json());
            const list = users.map(u => {
                let icon = '🔴';
                if (u.isOnline) {
                    icon = u.monitoring ? '🟢' : '🟡';
                }
                return `${icon} ${u.name}`;
            }).join('\n');

            alert(`Статус команди (${users.length}):\n\n${list}\n\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n🟢 - Онлайн + Моніторинг\n🟡 - В мережі, але моніторинг OFF\n🔴 - Офлайн (>2 хв)`);
        } catch (e) { }
    }

    window.addEventListener('load', checkAuth);
})();