// ==UserScript==
// @name         Arbitrage Card Sharer
// @version      1.3
// @description  Share trade cards to Telegram topics
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // --- CONFIGURATION ---
    const CONFIG = {
        BACKEND: 'https://arbitur.space',
        TOPICS: {
            "💬 Основний чат": null,
            "📊 Позиції": "55",      // Замініть на реальний ID гілки "Позиції"
            "🔔 Сигнали": "176",     // Замініть на реальний ID гілки "Сигнали"
            "🧪 Тести": "621"       // Замініть на реальний ID гілки "Тести"
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

        /* Modal Overlay */
        #arb-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.85); z-index: 1000000;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(8px);
            animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Modal Box */
        .arb-modal {
            background: #1e293b; 
            border: 1px solid #334155; 
            border-radius: 16px;
            padding: 24px; 
            width: 90%; max-width: 420px;
            color: #f8fafc; 
            font-family: 'Segoe UI', system-ui, sans-serif;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            display: flex; flex-direction: column; gap: 16px;
            transform: translateY(0);
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .arb-modal h3 { margin: 0; font-size: 18px; font-weight: 600; color: #fff; display:flex; align-items:center; gap:8px;}

        /* Preview Image */
        .arb-preview-container {
            background: #0f172a;
            border-radius: 12px;
            border: 1px solid #334155;
            padding: 10px;
            display: flex; justify-content: center;
            overflow: hidden;
        }
        .arb-preview-img {
            max-width: 100%; 
            max-height: 250px; 
            object-fit: contain; 
            border-radius: 4px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }

        /* Inputs */
        .arb-label { display: block; font-size: 12px; font-weight: 500; color: #94a3b8; margin-bottom: 6px; }
        
        .arb-select, .arb-input {
            width: 100%; 
            padding: 10px 12px; 
            background: #0f172a; 
            border: 1px solid #475569;
            color: #fff; 
            border-radius: 8px; 
            outline: none;
            font-size: 14px;
            transition: border-color 0.15s;
            box-sizing: border-box;  /* Додано для рівної ширини */
            font-family: inherit;
        }
        .arb-select:focus, .arb-input:focus { border-color: #6366f1; }
        .arb-input { min-height: 70px; resize: vertical; }

        /* Actions */
        .arb-actions { display: flex; gap: 12px; margin-top: 8px; }
        .arb-btn {
            flex: 1;
            padding: 10px; 
            border-radius: 8px; 
            border: none; 
            font-weight: 600; 
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex; justify-content: center; align-items: center; gap: 6px;
        }
        .arb-btn-cancel { 
            background: transparent; color: #94a3b8; border: 1px solid #334155; 
        }
        .arb-btn-cancel:hover { background: rgba(255,255,255,0.05); color: #fff; border-color: #475569; }

        .arb-btn-send { 
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); 
            color: white; 
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        .arb-btn-send:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4); }
        .arb-btn-send:active { transform: translateY(0); }
        .arb-btn-send:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        /* Utility */
        .hidden-for-capture { display: none !important; }

        .arb-donate-wrap { margin-top: 15px; padding: 10px; border-radius: 12px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.03)); border: 1px dashed rgba(245, 158, 11, 0.25); cursor: pointer; transition: all 0.2s; }
        .arb-donate-wrap:hover { background: rgba(245, 158, 11, 0.12); border-style: solid; transform: scale(1.01); }
        .arb-donate-title { font-size: 10px; font-weight: 800; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; text-align: center; }
        .arb-donate-text { font-size: 11px; color: #cbd5e1; text-align: center; line-height: 1.4; }
        .arb-donate-text span { color: #fff; font-weight: 600; }
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

        // Watch for new cards
        setInterval(addShareButtons, 1500);
    }

    function addShareButtons() {
        const cards = document.querySelectorAll('.trade-card');
        cards.forEach(card => {
            // Find the header area. Based on terminal.html, it's inside .trade-details <p>
            // Structure: <div class="trade-details"><p>... <strong>CLO</strong> ...</p></div>
            const headerP = card.querySelector('.trade-details p');

            // Avoid duplicates
            if (headerP && !headerP.querySelector('.arb-share-btn')) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.innerHTML = '✈️';
                btn.className = 'arb-share-btn';
                btn.title = 'Share Card';

                // Insert before the pin button if it exists, otherwise append
                const pinBtn = headerP.querySelector('.pin-button');
                if (pinBtn) {
                    headerP.insertBefore(btn, pinBtn);
                } else {
                    headerP.appendChild(btn);
                }

                btn.onclick = (e) => {
                    e.stopPropagation(); // Prevent card drag/click
                    e.preventDefault();
                    captureAndShare(card);
                };
            }
        });
    }

    async function captureAndShare(cardElement) {
        // Prepare card for "Beauty Shot"
        const originalTransition = cardElement.style.transition;
        cardElement.style.transition = 'none';

        // 1. Hide clutter
        // Selectors to hide: 
        // .tc-move-controls (Up/Down arrow container)
        // .restart-button (Refresh icon)
        // .pin-button (Pin icon)
        // .favorites-star-button (Star icon)
        // .arb-share-btn (Self)
        // .side-buttons (Long/Short toggle buttons - Keep the active one? No, just hide buttons) 
        // Actually, for side buttons, it might look weird if missing. Let's keep data, hide "controls".

        const selectorsToHide = [
            '.tc-move-controls',
            '.restart-button',
            '.pin-button',
            '.favorites-star-button',
            '.arb-share-btn',
            '.side-buttons', // Hide the toggle buttons (Long/Short)
            'input[type="checkbox"]', // Hide checkboxes
            '.ticks-fields button', // Hide Save buttons
            '.editable-fields button', // Hide all Save/Start/Stop buttons
            // We want to keep the VALUES but hide the interactive buttons.
        ];

        const hiddenElements = [];
        selectorsToHide.forEach(sel => {
            cardElement.querySelectorAll(sel).forEach(el => {
                // Save original display style
                const originalDisplay = el.style.display;
                el.dataset.originalDisplay = originalDisplay;
                el.style.display = 'none';
                hiddenElements.push(el);
            });
        });

        // Also: Make sure background is solid for the image
        const originalBg = cardElement.style.background;
        cardElement.style.background = '#1e293b'; // Force slate-800 for the snapshot
        cardElement.style.borderRadius = '12px';
        cardElement.style.padding = '10px';
        // Add a nice border for the snapshot
        cardElement.style.border = '1px solid #475569';

        try {
            // 2. Capture
            const canvas = await html2canvas(cardElement, {
                backgroundColor: '#0f172a', // The "page" background behind the card
                scale: 2, // Retina quality
                logging: false,
                useCORS: true,
                allowTaint: true,
                ignoreElements: (element) => element.classList.contains('tc-move-controls') // Double check
            });

            // 3. Restore Card State
            cardElement.style.background = originalBg;
            cardElement.style.border = '';
            cardElement.style.borderRadius = '';
            cardElement.style.padding = '';
            cardElement.style.transition = originalTransition;

            hiddenElements.forEach(el => {
                el.style.display = el.dataset.originalDisplay || '';
            });

            const imgData = canvas.toDataURL('image/png');
            showModal(imgData);

        } catch (e) {
            console.error("Capture failed:", e);
            alert("❌ Failed to capture card.");
            // Restore anyway in case of error
            hiddenElements.forEach(el => {
                el.style.display = el.dataset.originalDisplay || '';
            });
            cardElement.style.background = originalBg;
            cardElement.style.transition = originalTransition;
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
                    <span id="arb-close" style="cursor:pointer; padding:6px; opacity:0.6; font-size:20px">&times;</span>
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
                        <option value="‼️ Фандінги, обережно.">‼️ Фандінги, обережно.</option >
                        <option value="✅ Деколи бере">✅ Деколи бере</option>
                        <option value="⚠️ Дує PNL">⚠️ Дує PNL</option>
                        <option value="🧪 Тестую">🧪 Тестую</option>
                        <option value="❌ Поганий сигнал">❌ Поганий сигнал</option>
                        <option value="custom">💬 Свій коментар...</option>
                    </select>
                    <input type="text" id="arb-custom-comment" class="arb-input" placeholder="Введіть свій коментар..." style="display:none; margin-top:8px;">
                </div>

                <div class="arb-donate-wrap" id="arb-donate-btn">
                    <div class="arb-donate-title">Дякуємо за ваші профіти! 🚀</div>
                    <div class="arb-donate-text">Ваша підтримка — паливо для нових фіч. <br><span>Тисни, щоб пригостити адміна кавою ☕</span></div>
                </div>

                <div class="arb-actions">
                    <button class="arb-btn arb-btn-cancel" id="arb-cancel">Cancel</button>
                    <button class="arb-btn arb-btn-send" id="arb-send">Send Signal ✈️</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Handlers
        const close = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        };

        ['arb-close', 'arb-cancel'].forEach(id => {
            document.getElementById(id).onclick = close;
        });

        // Close on outside click
        overlay.onclick = (e) => {
            if (e.target === overlay) close();
        };

        // Обробник зміни preset dropdown
        const presetSelect = document.getElementById('arb-comment-preset');
        const customInput = document.getElementById('arb-custom-comment');

        presetSelect.onchange = () => {
            if (presetSelect.value === 'custom') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
            }
        };

        // Donation Logic
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

        // Send Logic
        document.getElementById('arb-send').onclick = async () => {
            const btn = document.getElementById('arb-send');
            const topicId = document.getElementById('arb-topic').value;

            // Визначаємо коментар: або з preset, або custom
            let comment = '';
            if (presetSelect.value === 'custom') {
                comment = customInput.value.trim();
            } else if (presetSelect.value) {
                comment = presetSelect.value;
            }

            const originalText = btn.innerHTML;
            btn.innerHTML = 'Sending...';
            btn.disabled = true;

            try {
                const res = await fetch(`${CONFIG.BACKEND}/api/share-card`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: imgData,
                        caption: comment,
                        threadId: topicId || null,
                        userName: localStorage.getItem('arb_name') || 'User'
                    })
                });

                const json = await res.json();
                if (json.success) {
                    btn.innerHTML = '✅ Shared Successfully!';
                    btn.style.background = '#10b981'; // Green
                    setTimeout(close, 1500);
                } else {
                    throw new Error(json.error || 'Unknown error');
                }
            } catch (e) {
                console.error(e);
                alert("❌ Error sending: " + e.message);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        };
    }

    // Start
    init();
})();
