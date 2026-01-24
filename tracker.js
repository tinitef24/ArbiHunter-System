// ==UserScript==
// @name         Arbitrage Master Master v1.6
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        BACKEND: 'https://arbitur.space',
        INTERVAL: 2500,
        START_DELAY: 10000,
        MAX_WAIT_FOR_FUNDING: 60000
    };

    let cardStates = new Map();
    let isProcessing = false;
    let systemActive = false;

    // --- 🎮 CLASSIC LOGGERS (Single-line, Dark background) ---
    const logger = (m, color = "#6366f1") => console.log(`%c[ARB-TRACKER] ${m}`, `color: ${color}; font-weight: bold; background: #1e1e2e; padding: 2px 5px; border-radius: 4px;`);
    const loggerAZ = (m, color = "#a855f7") => console.log(`%c[AUTO-ZERO] ${m}`, `color: ${color}; font-weight: bold; background: #1e1e2e; padding: 2px 5px; border-radius: 4px;`);

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
            #${ROOT_ID} { position: fixed; bottom: 80px; right: 20px; z-index: 999999; font-family: 'Segoe UI', sans-serif; }
            .glass { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; color: white; padding: 20px; width: 280px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: all 0.3s ease; }
            .hidden { display: none !important; }
            .row { display: flex; justify-content: space-between; margin: 12px 0; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; font-size: 13px; align-items: center; }
            .btn-main { width: 100%; padding: 12px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; cursor: pointer; font-weight: bold; font-size: 14px; transition: transform 0.1s; }
            .btn-main:active { transform: scale(0.98); }
            .btn-stats { width: 100%; background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 8px; border-radius: 8px; cursor: pointer; margin-top: 10px; font-size: 12px; }
            .rocket { width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 28px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); transition: transform 0.2s; }
            .rocket:hover { transform: scale(1.1); }
            #${ROOT_ID} input[type="text"] { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .status-pending { background: #f59e0b; color: black; }
            .status-approved { background: #10b981; color: black; }
            .ver-badge { font-size:10px; color:#475569; text-align:center; margin-top:10px; }
            .donate-box { margin-top: 12px; padding: 8px; border-radius: 12px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05)); border: 1px dashed rgba(245, 158, 11, 0.3); text-align: center; cursor: pointer; transition: all 0.2s; }
            .donate-box:hover { background: rgba(245, 158, 11, 0.15); border-style: solid; transform: translateY(-1px); }
            .donate-title { font-size: 10px; font-weight: bold; color: #f59e0b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
            .donate-text { font-size: 11px; color: #fff; display: flex; align-items: center; justify-content: center; gap: 5px; }
            .switch { position: relative; display: inline-block; width: 34px; height: 20px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #334155; transition: .4s; border-radius: 20px; }
            .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
            input:checked + .slider { background-color: #6366f1; }
            input:checked + .slider:before { transform: translateX(14px); }
        `;
        document.head.appendChild(style);
        return wrap;
    }

    // --- AUTH LOGIC ---
    async function checkAuth() {
        const wrap = createUI();
        const apiKey = localStorage.getItem('arb_api_key');
        const userId = localStorage.getItem('arb_id');
        const name = localStorage.getItem('arb_name');

        if (!userId) { renderRegister(wrap); return; }
        if (userId && !apiKey) { renderPending(wrap, userId, name); return; }

        renderMain(wrap, name);
        startSystem();
    }

    function renderRegister(wrap) {
        wrap.innerHTML = `
            <div class="glass">
                <h3 style="margin:0 0 15px 0">🔐 Доступ до системи</h3>
                <p style="font-size:12px; color:#94a3b8; margin-bottom:15px">Введіть ваше ім'я для запиту доступу...</p>
                <input id="reg_in" type="text" placeholder="Прізвище Ім'я">
                <button id="reg_btn" class="btn-main">Надіслати запит</button>
            </div>`;

        document.getElementById('reg_btn').onclick = async () => {
            const n = document.getElementById('reg_in').value;
            if (!n) return alert("Введіть ім'я!");
            try {
                const res = await fetch(`${CONFIG.BACKEND}/api/register`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firstName: n })
                }).then(r => r.json());
                if (res.success) {
                    localStorage.setItem('arb_id', res.userId);
                    localStorage.setItem('arb_name', n);
                    checkAuth();
                } else { alert("Помилка реєстрації"); }
            } catch (e) { alert("Сервер недоступний"); }
        };
    }

    function renderPending(wrap, userId, name) {
        wrap.innerHTML = `
            <div class="glass" style="text-align:center">
                <div style="font-size:40px; margin-bottom:10px">⏳</div>
                <h3 style="margin:0">Очікування підтвердження</h3>
                <p style="font-size:12px; color:#94a3b8; margin:10px 0">ID: ${userId}</p>
                <div id="check_status" style="font-size:12px; color:#f59e0b">Перевірка статусу...</div>
                <button id="reset_btn" class="btn-stats" style="margin-top:15px">❌ Скасувати запит</button>
            </div>`;

        document.getElementById('reset_btn').onclick = () => {
            if (confirm('Очистити дані реєстрації?')) {
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
                } else if (res.status === 'rejected') {
                    clearInterval(poll);
                    wrap.innerHTML = `<div class="glass" style="text-align:center; border-color:#ef4444"><h3 style="color:#ef4444">❌ Відмовлено</h3><p>Запит відхилено.</p><button onclick="localStorage.clear();location.reload()" class="btn-stats">Скинути</button></div>`;
                }
            } catch (e) { }
        }, 3000);
    }

    function renderMain(wrap, name) {
        const isH = localStorage.getItem('arb_hide') === 'true';

        wrap.innerHTML = `
            <div class="glass ${isH ? 'hidden' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                    <div style="display:flex; align-items:center; gap:8px">
                        <span style="font-size:18px">🛰️</span>
                        <div>
                            <div style="font-weight:bold; font-size:14px">${name}</div>
                            <div style="font-size:10px; color:#10b981">● Online</div>
                        </div>
                    </div>
                    <span id="close_btn" style="cursor:pointer; opacity:0.7">✕</span>
                </div>
                
                <div class="row">
                    <span>Моніторинг</span>
                    <label class="switch">
                        <input type="checkbox" id="act_ch" ${localStorage.getItem('arb_active') !== 'false' ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="row">
                    <span>Auto-Zero</span>
                    <label class="switch">
                        <input type="checkbox" id="zero_ch" ${localStorage.getItem('arb_auto_zero') === 'true' ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>

                <button id="test_btn" class="btn-main">🧪 Тест з'єднання</button>
                <button id="stats_btn" class="btn-stats">👥 Команда онлайн</button>

                <div class="donate-box" id="donate_btn">
                    <div class="donate-title">Підтримка автора</div>
                    <div class="donate-text"><span>☕</span> Купити каву (BEP20)</div>
                </div>

                <div class="ver-badge">v1.6 Stable</div>
            </div>
            <div class="rocket ${isH ? '' : 'hidden'}" id="rock_btn">🚀</div>
        `;

        document.getElementById('close_btn').onclick = () => { localStorage.setItem('arb_hide', 'true'); renderMain(wrap, name); };
        document.getElementById('rock_btn').onclick = () => { localStorage.setItem('arb_hide', 'false'); renderMain(wrap, name); };
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
        isProcessing = true;

        const apiKey = localStorage.getItem('arb_api_key');
        if (!apiKey) { isProcessing = false; return; }

        const localProcessed = new Set();

        for (const card of document.querySelectorAll('.trade-card')) {
            const sym = card.querySelector('.trade-details strong')?.innerText;
            if (!sym) continue;

            const ex1 = card.querySelector('.short')?.innerText.trim() || '?';
            const ex2 = card.querySelector('.long')?.innerText.trim() || '?';
            const cardKey = `${sym}_${ex1}_${ex2}`;

            if (localProcessed.has(cardKey)) continue;
            localProcessed.add(cardKey);

            const ordersRow = Array.from(card.querySelectorAll('tr')).find(r => r.innerText.includes('Orders'));
            const current = parseInt(ordersRow?.querySelector('td:last-child')?.innerText || "0");
            const prev = cardStates.get(cardKey) || 0;

            if (prev !== current) {
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
            }
        }
        isProcessing = false;
    }

    function sendHeartbeat() {
        const id = localStorage.getItem('arb_id');
        const key = localStorage.getItem('arb_api_key');
        if (!id || !key) return;
        fetch(`${CONFIG.BACKEND}/api/heartbeat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: id,
                userName: localStorage.getItem('arb_name'),
                isMonitoring: localStorage.getItem('arb_active') !== 'false',
                apiKey: key
            })
        }).catch(() => { });
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
            alert(`Онлайн (${users.length}):\n${users.map(u => `${u.monitoring ? '🟢' : '🔴'} ${u.name}`).join('\n')}`);
        } catch (e) { }
    }

    window.addEventListener('load', checkAuth);
})();