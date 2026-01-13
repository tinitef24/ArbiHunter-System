// ==UserScript==
// @name         Arbitrage Card Sharer 
// @version      1.3.9
// @match        *://*/*
// @grant        none
// ==/UserScript==


(function () {
    'use strict';

    // --- CONFIGURATION ---
    const CONFIG = {
        BACKEND: 'https://arbitur.space',
        THEME_GREEN: '#239825', // User requested custom green
        TOPICS: {
            "💬 Основний чат": null,
            "🔎 Позиції": "32748",
            "🔔 Сигнали": "2",
            "🧪 Тести": "8"
        },
        COLORS: {
            RED: '#ef4444',
            WARNING: '#f59e0b',
            BLACK: '#000000'
        }
    };



    // --- LIBS ---

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${url}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = url;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }



    // --- UI STYLES ---

    const styles = `

        /* Share Button */

        .arb-share-btn {
            background: none; border: none; padding: 0;
            cursor: pointer; font-size: 16px; margin: 0 4px; 
            opacity: 0.7; transition: 0.2s;
            display: inline-flex; align-items: center; justify-content: center;
        }
        .arb-share-btn:hover { opacity: 1; transform: scale(1.1); }

        #arb-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.85); z-index: 1000000;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(8px);
        }

        .arb-modal {
            background: #1e293b; border: 1px solid #334155; border-radius: 16px;
            padding: 24px; width: 90%; max-width: 420px;
            color: #f8fafc; font-family: 'Segoe UI', system-ui, sans-serif;
            display: flex; flex-direction: column; gap: 16px;
        }

        /* Snapshot Mode */
        .arb-snapshot-mode { 
            background: #ffffff !important; 
            border: 1px solid #d1d5db !important; 
            width: 440px !important; 
            padding: 24px !important;
            border-radius: 12px !important;
            color: #000000 !important;
        }

        /* Оновлений колір для всіх елементів */
        .arb-snapshot-mode .success,
        .arb-snapshot-mode .profit-rate,
        .arb-snapshot-mode .highlight-profit-rate,
        .arb-snapshot-mode .profit,
        .arb-snapshot-mode span[style*="green"],
        .arb-snapshot-mode span[style*="#0ecb81"],
        .arb-snapshot-mode span[style*="#10b981"],
        .arb-snapshot-mode span[style*="14, 203, 129"] { 
            color: ${CONFIG.THEME_GREEN} !important; 
            font-weight: 800 !important; 
        }

        .arb-snapshot-temp-input { 
            display: inline-block !important;
            background: #ffffff !important; 
            border: 1px solid #9ca3af !important; 
            border-radius: 6px !important;
            padding: 4px 10px !important;
            color: #000000 !important;
            font-size: 14px !important;
            font-weight: 700 !important;
            min-width: 60px;
        }

        .arb-snapshot-side { 
            font-weight: 900 !important;
            font-size: 20px !important;
            text-transform: uppercase !important;
            color: ${CONFIG.THEME_GREEN} !important;
            display: block;
            margin-bottom: 8px;
        }
        .arb-snapshot-side.short { color: #f6465d !important; }

        .arb-snapshot-footer { 
            margin-top: 20px !important;
            padding-top: 10px !important;
            border-top: 1px solid #eeeeee !important;
            display: flex !important;
            justify-content: space-between !important;
            color: #777777 !important;
            font-size: 12px !important;
        }

        .arb-preview-container { background: #0f172a; border-radius: 12px; padding: 10px; display: flex; justify-content: center; }
        .arb-preview-img { max-width: 100%; max-height: 250px; object-fit: contain; }
        .arb-label { display: block; font-size: 12px; font-weight: 500; color: #94a3b8; margin-bottom: 6px; }
        .arb-select, .arb-input { width: 100%; padding: 10px; background: #0f172a; border: 1px solid #475569; color: #fff; border-radius: 8px; box-sizing: border-box; }
        .arb-btn { flex: 1; padding: 10px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; }
        .arb-btn-send { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; }



        /* Donation Box in Modal */
        .arb-donate-box {
            margin-top: 10px; padding: 12px; border-radius: 12px;
            background: rgba(245, 158, 11, 0.1); border: 1px dashed rgba(245, 158, 11, 0.5);
            text-align: center; cursor: pointer; transition: 0.2s;
        }
        .arb-donate-box:hover { background: rgba(245, 158, 11, 0.15); transform: translateY(-1px); }
        .arb-donate-title { font-size: 11px; font-weight: 800; color: #f59e0b; text-transform: uppercase; margin-bottom: 4px; }
        .arb-donate-text { font-size: 12px; color: #fff; display: flex; align-items: center; justify-content: center; gap: 6px; }
    `;



    function injectStyles() {
        if (document.getElementById('arb-share-styles')) return;
        const style = document.createElement('style');
        style.id = 'arb-share-styles';
        style.innerHTML = styles;
        document.head.appendChild(style);
    }

    // --- MAIN ---
    async function init() {
        console.log("✈️ Arbitrage Share: Init...");
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        injectStyles();
        setInterval(addShareButtons, 1500);
    }



    function addShareButtons() {
        const cards = document.querySelectorAll('.trade-card');
        cards.forEach(card => {
            const headerP = card.querySelector('.trade-details p');
            if (headerP && !headerP.querySelector('.arb-share-btn')) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.innerHTML = '✈️';
                btn.className = 'arb-share-btn';
                btn.title = 'Share Card';
                const pinBtn = headerP.querySelector('.pin-button');
                if (pinBtn) {
                    headerP.insertBefore(btn, pinBtn);
                } 
                else {
                    headerP.appendChild(btn);
                }

                btn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    captureAndShare(card);
                };
            }
        });
    }

    async function captureAndShare(cardElement) {
        const originalStyle = cardElement.getAttribute('style');
        const hiddenElements = [];
        const tempElements = [];

        cardElement.classList.add('arb-snapshot-mode');

        const selectorsToHide = [
            '.tc-move-controls', '.restart-button', '.pin-button', '.favorites-star-button',
            '.arb-share-btn', 'button:not(.botside-short):not(.botside-long)', 'input[type="checkbox"]',
            'input[type="hidden"]', '.field-group > button'
        ];

        selectorsToHide.forEach(sel => {
            cardElement.querySelectorAll(sel).forEach(el => {
                el.dataset.oldDisplay = el.style.display;
                el.style.setProperty('display', 'none', 'important');
                hiddenElements.push(el);
            });
        });

        // Конвертація інпутів
        cardElement.querySelectorAll('input:not([type="checkbox"]), select').forEach(input => {
            if (input.offsetParent === null) return;
            const replacement = document.createElement('div');
            replacement.className = 'arb-snapshot-temp-input';
            replacement.innerText = input.value || '-';

            const rect = input.getBoundingClientRect();
            // Зменшуємо віконце Order Size, щоб влізла ціна
            const isOrderSize = input.closest('.field-group')?.innerText.includes('Order Size');
            if (isOrderSize) {
                replacement.style.width = '70px'; // Фіксована менша ширина
                replacement.style.marginRight = '5px';
            } else if (rect.width > 20) {
                replacement.style.width = rect.width + 'px';
            }

            input.dataset.oldDisplay = input.style.display;
            input.style.display = 'none';
            input.parentNode.insertBefore(replacement, input);
            tempElements.push(replacement);
        });

        // Side Buttons
        const sideWrap = cardElement.querySelector('.side-buttons-wrap') || cardElement.querySelector('.side-buttons');
        if (sideWrap) {
            const activeBtn = sideWrap.querySelector('.active') || sideWrap.querySelector('.botside-short, .botside-long');
            if (activeBtn) {
                const sideText = activeBtn.innerText;
                const sideDisplay = document.createElement('span');
                sideDisplay.className = 'arb-snapshot-side ' + (sideText.toLowerCase().includes('short') ? 'short' : '');
                sideDisplay.innerText = sideText;
                Array.from(sideWrap.children).forEach(child => {
                    child.dataset.oldDisplay = child.style.display;
                    child.style.display = 'none';
                });
                sideWrap.appendChild(sideDisplay);
                tempElements.push(sideDisplay);
            }
        }

        const originalTimer = cardElement.querySelector('.started-at-timer');
        if (originalTimer) {
            originalTimer.dataset.oldDisplay = originalTimer.style.display;
            originalTimer.style.display = 'none';
            hiddenElements.push(originalTimer);
        }

        const watermark = document.createElement('div');
        watermark.className = 'arb-snapshot-footer';
        const timestamp = originalTimer?.innerText.replace('Started at: ', '') || '';
        watermark.innerHTML = `<span>ArbiHunter System 🚀</span> <span>Started at: ${timestamp}</span>`;
        cardElement.appendChild(watermark);
        tempElements.push(watermark);

        try {
            await new Promise(r => setTimeout(r, 150));
            const canvas = await html2canvas(cardElement, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true
            });
            showModal(canvas.toDataURL('image/png'));
        } catch (e) {
            console.error(e);
        } finally {
            cardElement.classList.remove('arb-snapshot-mode');
            if (originalStyle) cardElement.setAttribute('style', originalStyle);
            else cardElement.removeAttribute('style');

            tempElements.forEach(el => el.remove());
            hiddenElements.forEach(el => {
                el.style.display = el.dataset.oldDisplay || '';
                delete el.dataset.oldDisplay;
            });
            cardElement.querySelectorAll('input, select').forEach(el => {
                if (el.dataset.oldDisplay !== undefined) {
                    el.style.display = el.dataset.oldDisplay;
                    delete el.dataset.oldDisplay;
                }
            });
            if (sideWrap) {
                Array.from(sideWrap.children).forEach(child => {
                    if (child.dataset.oldDisplay !== undefined) {
                        child.style.display = child.dataset.oldDisplay;
                        delete child.dataset.oldDisplay;
                    }
                });
            }
        }
    }
    function showModal(imgData) {
        const existing = document.getElementById('arb-modal-overlay');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'arb-modal-overlay';
        overlay.innerHTML = `
            <div class="arb-modal">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <h3>📤 Share Signal</h3>
                    <span id="arb-close" style="cursor:pointer; padding:6px; opacity:0.6; font-size:24px">&times;</span>
                </div>
                <div class="arb-preview-container">
                    <img src="${imgData}" class="arb-preview-img">
                </div>
                <div>
                    <label class="arb-label">Select Topic</label>
                    <select id="arb-topic" class="arb-select">
                        ${Object.keys(CONFIG.TOPICS).map(t => `<option value="${CONFIG.TOPICS[t] || ''}">${t}</option>`).join('')}
                    </select>
                </div>
                <div>
                     <label class="arb-label">Коментар:</label>
                    <select id="arb-comment-preset" class="arb-select">
                        <option value="">— Без коментаря —</option>
                        <option value="🔥 Грано ходить">🔥 Грано ходить</option>
                        <option value="‼️ Фандінги, обережно.">‼️ Фандінги, обережно.</option>
                        <option value="✅ Деколи бере">✅ Деколи бере</option>
                        <option value="⚠️ Дує PNL">⚠️ Дує PNL</option>
                        <option value="🧪 Тестую">🧪 Тестую</option>
                        <option value="❌ Поганий сигнал">❌ Поганий сигнал</option>
                        <option value="custom">💬 Свій коментар...</option>
                    </select>
                    <input type="text" id="arb-custom-comment" class="arb-input" placeholder="Введіть свій коментар..." style="display:none; margin-top:8px;">
                </div>
                <div class="arb-donate-box" id="arb-donate-btn">
                    <div class="arb-donate-title">Підтримка автора ArbiHunter 🚀</div>
                    <div class="arb-donate-text"><span>☕</span> Купити каву (BEP20)</div>
                </div>
                <div class="arb-actions">
                    <button class="arb-btn arb-btn-cancel" id="arb-cancel">Cancel</button>
                    <button class="arb-btn arb-btn-send" id="arb-send">Send Signal ✈️</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        // --- EVENTS ---
        document.getElementById('arb-close').onclick = () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 200); };
        document.getElementById('arb-cancel').onclick = () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 200); };
        document.getElementById('arb-donate-btn').onclick = () => {
            const addr = '0x0bed23201c5c0095acef3bbc1c92c7c59f15e867';
            navigator.clipboard.writeText(addr).then(() => {
                const title = document.querySelector('.arb-donate-title');
                const text = document.querySelector('.arb-donate-text');
                const originalTitle = title.innerText;
                const originalText = text.innerHTML;
                title.innerText = '✅ АДРЕСУ СКОПІЙОВАНО!';
                title.style.color = '#10b981';
                text.innerHTML = '<span style="color:#10b981">Мережа BEP20 готова до відправки!</span>';
                alert(`🎯 Для розвитку проекту\n\nКожен донат робить ArbiHunter System📚 швидшим та стабільнішим.\n\nМережа: BNB Smart Chain (BEP20)\nАдреса: ${addr}\n\n✅ Адреса вже в буфері обміну. Дякуємо, що ви з нами! 💪`);
                setTimeout(() => {
                    title.innerText = originalTitle;
                    title.style.color = '#f59e0b';
                    text.innerHTML = originalText;
                }, 3000);
            });
        };
        const presetSelect = document.getElementById('arb-comment-preset');
        const customInput = document.getElementById('arb-custom-comment');
        if (presetSelect) {
            presetSelect.onchange = () => {
                customInput.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
                if (presetSelect.value === 'custom') customInput.focus();
            };
        }
        const send = async (isAdmin = false) => {
            const btn = isAdmin ? document.getElementById('arb-send-admin') : document.getElementById('arb-send');
            const topicId = document.getElementById('arb-topic').value;
            let comment = presetSelect.value === 'custom' ? customInput.value.trim() : presetSelect.value;
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Sending...';
            btn.disabled = true;
            try {
                const res = await fetch(`${CONFIG.BACKEND}/api/share-card`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: imgData,
                        caption: comment || '',
                        threadId: isAdmin ? null : (topicId || null),
                        isAdminDirect: isAdmin,
                        userName: localStorage.getItem('arb_name') || 'User'
                    })
                });
                const json = await res.json();
                if (json.success) {
                    btn.innerHTML = '✅ Sent!';
                    btn.style.background = CONFIG.THEME_GREEN;
                    setTimeout(() => overlay.remove(), 1000);
                } else {
                    throw new Error(json.error || 'Unknown error');
                }
            } catch (e) {
                alert("❌ Error: " + e.message);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        };
        document.getElementById('arb-send').onclick = () => send(false);
        document.getElementById('arb-send-admin').onclick = () => send(true);
    }
    init();
})();