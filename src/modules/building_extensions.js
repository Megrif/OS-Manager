// --- SOUBOR: src/modules/building_extensions.js ---
window.OSM = window.OSM || {};

OSM.registerModule({
    id: 'building_extensions',
    name: 'Snadnější nákup rozšíření budov',
    description: 'Na stránce budovy vám umožní rychlý nákup vámi zvolených rozšíření.<br>Pozor nefunguje pro nákup vícero vězeňských cel. Koupí pouze jednu!',
    defaultEnabled: false,
    frequency: 'NONE',

    // Interní DB pro záchrannou detekci názvů
    extensionsDB: {
        'Záchranná služba': 0, 'Vězeňská cela': 0, 'Chirurgie': 0,
        'Letiště': 1, 'Interna': 1,
        'Traumatologie': 2,
        'Vyprošťovací práce': 3, 'Více cel': 3, 'Kardiologie': 3,
        'Neurologie': 4,
        'Neurochirurgie': 5,
        'Kontejner: Sorbentový': 6, 'Urologie': 6,
        'Kontejner: Chemický': 7, 'Gynekologie': 7,
        'Kontejner: Pěnidlový': 8,
        'Kontejner: Plynový': 9,
        'Kontejner: Hadicový': 10,
        'Stání pro kontejner (1)': 11,
        'Stání pro kontejner (2)': 12,
        'Kontejner: Technický': 13,
        'Kontejner: Elektrocentrála': 14,
        'Kontejner: Lodní': 15,
        'Kontejner: Nouzové zastřešení': 16,
        'Kontejner: Týlový': 17,
        'Železnice': 18,
        'Pořádková jednotka': 20,
        'Kapacita pro antony': 21,
        'Vodní stříkače': 22,
        'Kapacita pro velitele': 23,
        'Velká policejní stanice': 24,
        'Velké vězení': 25
    },

    onInit(url, pageType) {
        if (pageType !== 'BUILDING') return;
        this.tryInjectButton();
        this.startHeaderObserver();
    },

    startHeaderObserver() {
        const targetNode = document.getElementById('building_main_panel') || document.body;
        if (this.observer) this.observer.disconnect();
        this.observer = new MutationObserver(() => this.tryInjectButton());
        this.observer.observe(targetNode, { childList: true, subtree: true });
    },

    tryInjectButton() {
        const header = document.querySelector('h1');
        if (header && !document.getElementById('osmgr-bulk-buy-btn')) {
            this.injectButton(header);
        }
    },

    injectButton(header) {
        const btn = document.createElement('a');
        btn.id = 'osmgr-bulk-buy-btn';
        btn.className = 'btn btn-xs btn-success';
        btn.style.cssText = 'float: right; margin-top: 5px; margin-left: 10px; color: white; cursor: pointer; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
        btn.innerHTML = '<span class="glyphicon glyphicon-shopping-cart"></span> Rychlý nákup rozšíření';
        
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openLoader();
        };

        header.appendChild(btn);
    },

    async openLoader() {
        const buildingId = window.location.pathname.split('/').pop();
        this.showLoadingModal();

        try {
            let extensions = this.scanCurrentPage();

            if (extensions.length === 0) {
                extensions = await this.fetchExtensionsBackground(buildingId);
            }

            this.openModal(extensions, buildingId);

        } catch (error) {
            console.error(error);
            alert('Chyba načítání dat. Zkuste obnovit stránku.');
            if(document.getElementById('osmgr-modal')) document.getElementById('osmgr-modal').remove();
        }
    },

    scanCurrentPage(doc = document) {
        const list = [];
        const boldTags = doc.querySelectorAll('b, strong');

        boldTags.forEach(bold => {
            let name = bold.textContent.trim().replace(/:$/, '');
            if (!name || name.includes('Mince') || name.includes('Kredity')) return;

            const row = bold.closest('tr') || bold.closest('.panel') || bold.closest('.row');

            if (row) {
                let id = null;
                let status = 'unknown'; // available, owned
                let link = null;

                // 1. NÁKUP (Credits)
                const buyBtn = row.querySelector('a[href*="/extension/credits/"]');
                if (buyBtn) {
                    id = parseInt(buyBtn.getAttribute('href').split('/credits/').pop());
                    status = 'available';
                    link = buyBtn.getAttribute('href');
                }

                // 2. DETEKCE VLASTNICTVÍ (Ready, Disable, Enable)
                if (!id) {
                    // Hledáme i variantu s podtržítkem "extension_ready"
                    const ownedBtn = row.querySelector('a[href*="/extension/disable/"], a[href*="/extension/enable/"], a[href*="/extension/ready/"], a[href*="extension_ready"]');
                    
                    if (ownedBtn) {
                        const href = ownedBtn.getAttribute('href');
                        
                        // FIX: Detekce ID z URL typu ".../extension_ready/3/1516175"
                        // Hledáme číslo, které následuje po extension_ready/ nebo extension/ready/
                        // Použijeme Regex pro přesné vytažení ID
                        const matchReady = href.match(/extension_ready\/(\d+)/);
                        const matchSlash = href.match(/extension\/ready\/(\d+)/);
                        const matchDisable = href.match(/extension\/disable\/(\d+)/);
                        const matchEnable = href.match(/extension\/enable\/(\d+)/);

                        if (matchReady) id = parseInt(matchReady[1]);
                        else if (matchSlash) id = parseInt(matchSlash[1]);
                        else if (matchDisable) id = parseInt(matchDisable[1]);
                        else if (matchEnable) id = parseInt(matchEnable[1]);
                        else {
                            // Fallback (poslední číslo)
                            id = parseInt(href.split('/').pop());
                        }

                        status = 'owned';
                    }
                }

                // 3. ODPOČET (Staví se)
                if (!id) {
                    const countdown = row.querySelector('span[id^="extension_countdown"]');
                    if (countdown) {
                        const parts = countdown.id.split('_');
                        id = parseInt(parts.pop());
                        status = 'owned';
                    }
                }

                // 4. ZÁCHRANNÁ SÍŤ (Podle Názvu + Štítku)
                if (!id && this.extensionsDB[name] !== undefined) {
                    const label = row.querySelector('.label');
                    if (label) {
                        const txt = label.textContent.toLowerCase();
                        if (txt.includes('připraven') || txt.includes('hotovo') || txt.includes('staví')) {
                            id = this.extensionsDB[name];
                            status = 'owned';
                        }
                    }
                }

                if (id !== null && !isNaN(id)) {
                    const existingIndex = list.findIndex(x => x.id === id);
                    if (existingIndex === -1) {
                        list.push({ id, name, owned: (status === 'owned'), link });
                    } else if (status === 'owned') {
                        list[existingIndex].owned = true;
                        list[existingIndex].link = null;
                    }
                }
            }
        });

        return list.sort((a, b) => a.id - b.id);
    },

    async fetchExtensionsBackground(buildingId) {
        const response = await fetch(`/buildings/${buildingId}/extension`);
        const text = await response.text();
        const parser = new DOMParser();
        return this.scanCurrentPage(parser.parseFromString(text, 'text/html'));
    },

    // --- UI ---

    showLoadingModal() {
        if (document.getElementById('osmgr-modal')) document.getElementById('osmgr-modal').remove();
        const modal = document.createElement('div');
        modal.id = 'osmgr-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center; color: white;';
        modal.innerHTML = `<div><h3><span class="glyphicon glyphicon-refresh" style="animation: spin 1s infinite linear;"></span> Načítám data...</h3></div>
                           <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>`;
        document.body.appendChild(modal);
    },

    openModal(extensions, buildingId) {
        if (document.getElementById('osmgr-modal')) document.getElementById('osmgr-modal').remove();

        const typeKey = 'osmgr_pattern_' + extensions.map(e => e.id).sort().join('_');
        const savedSelection = this.loadSelection(typeKey);

        let htmlRows = '';
        extensions.forEach(ext => {
            const isChecked = savedSelection.includes(ext.id);
            let statusLabel = '<span class="label label-default">K dispozici</span>';
            let rowColor = '#1f2937'; 
            let opacity = '1';
            let textColor = '#fff';

            if (ext.owned) {
                statusLabel = '<span class="label label-success">Zakoupeno</span>';
                rowColor = '#14532d'; 
                opacity = '0.7'; 
                textColor = '#d1d5db';
            }

            htmlRows += `
                <tr style="background-color: ${rowColor}; color: ${textColor}; opacity: ${opacity}; border-bottom: 1px solid #374151;">
                    <td style="text-align: center; vertical-align: middle; width: 50px;">
                        <input type="checkbox" 
                               class="osmgr-ext-checkbox" 
                               value="${ext.id}" 
                               data-owned="${ext.owned}"
                               ${isChecked ? 'checked' : ''} 
                               style="transform: scale(1.3); cursor: pointer;">
                    </td>
                    <td style="vertical-align: middle; font-size: 1.1em; font-weight: 500;">
                        ${ext.name}
                    </td>
                    <td style="text-align: right; vertical-align: middle;">${statusLabel}</td>
                </tr>
            `;
        });

        const modal = document.createElement('div');
        modal.id = 'osmgr-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; justify-content: center; align-items: center; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;';
        
        modal.innerHTML = `
            <div style="background: #111827; width: 650px; max-height: 85vh; display: flex; flex-direction: column; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); border: 1px solid #374151; color: white;">
                
                <div style="padding: 20px; border-bottom: 1px solid #374151; background: #1f2937; border-radius: 12px 12px 0 0;">
                    <h4 style="margin: 0; font-weight: bold; color: #ffffff; font-size: 1.25em;">Rychlý nákup rozšíření</h4>
                    <div style="margin-top: 5px; font-size: 0.9em; color: #9ca3af;">
                        Vyberte konfiguraci pro tento typ budovy.
                    </div>
                </div>
                
                <div style="overflow-y: auto; padding: 0; scrollbar-width: thin; scrollbar-color: #4b5563 #111827;">
                    <table class="table" style="margin-bottom: 0;">
                        <tbody id="osmgr-table-body">${htmlRows}</tbody>
                    </table>
                </div>

                <div id="osmgr-progress-container" style="display: none; padding: 20px; background: #111827; border-top: 1px solid #374151;">
                    <div class="progress" style="margin-bottom: 10px; background-color: #374151; height: 24px; border-radius: 12px;">
                        <div id="osmgr-progress-bar" class="progress-bar progress-bar-success progress-bar-striped active" style="width: 0%; line-height: 24px; font-weight: bold; border-radius: 12px;">0%</div>
                    </div>
                    <div style="text-align: center; color: #d1d5db; font-weight: 500;">
                        <span id="osmgr-progress-text">Připravuji...</span> 
                    </div>
                </div>

                <div id="osmgr-buttons" style="padding: 15px; border-top: 1px solid #374151; text-align: right; background: #1f2937; border-radius: 0 0 12px 12px;">
                    <button class="btn btn-default" id="osmgr-close-btn" style="background: #374151; color: white; border: 1px solid #4b5563; margin-right: 10px;">Zavřít</button>
                    <button class="btn btn-success" id="osmgr-buy-btn" style="font-weight: bold; color: white;">Koupit vybrané</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const checkboxes = modal.querySelectorAll('.osmgr-ext-checkbox');

        const updateUI = () => {
            const selectedIds = [];
            let toBuyCount = 0;

            checkboxes.forEach(cb => {
                if (cb.checked) {
                    selectedIds.push(parseInt(cb.value));
                    if (cb.dataset.owned !== "true") {
                        toBuyCount++;
                    }
                }
            });

            this.saveSelection(typeKey, selectedIds);
            
            const btn = document.getElementById('osmgr-buy-btn');
            if (toBuyCount > 0) {
                btn.innerHTML = `Koupit vybrané (${toBuyCount})`;
                btn.classList.remove('disabled');
            } else {
                btn.innerHTML = `Vše je již zakoupeno / Nic nevybráno`;
            }
        };

        checkboxes.forEach(cb => cb.addEventListener('change', updateUI));
        document.getElementById('osmgr-close-btn').addEventListener('click', () => modal.remove());

        document.getElementById('osmgr-buy-btn').addEventListener('click', () => {
            const toBuy = [];
            checkboxes.forEach(cb => {
                if (cb.checked && cb.dataset.owned !== "true") {
                    const ext = extensions.find(e => e.id === parseInt(cb.value));
                    if (ext && ext.link) toBuy.push(ext);
                }
            });
            
            if (toBuy.length === 0) {
                modal.remove();
                window.location.reload(); 
            } else {
                this.processPurchase(toBuy);
            }
        });

        updateUI(); 
    },

    async processPurchase(items) {
        const btnContainer = document.getElementById('osmgr-buttons');
        const pContainer = document.getElementById('osmgr-progress-container');
        const pBar = document.getElementById('osmgr-progress-bar');
        const pText = document.getElementById('osmgr-progress-text');

        btnContainer.style.display = 'none';
        pContainer.style.display = 'block';

        const total = items.length;
        
        for (let i = 0; i < total; i++) {
            const item = items[i];
            const current = i + 1;
            
            const percent = Math.round((current / total) * 100);
            pBar.style.width = percent + '%';
            pBar.textContent = percent + '%';
            pText.innerHTML = `Kupuji: <span style="color:white; font-weight:bold;">${item.name}</span> (${current}/${total})`;

            try {
                await this.buyExtension(item.link);
            } catch (e) {
                console.error(e);
                pText.innerHTML = `<span style="color:#ef4444">${e.message || "Chyba"}</span>`;
            }

            if (i < total - 1) {
                const delay = Math.floor(Math.random() * 500) + 700;
                await new Promise(r => setTimeout(r, delay));
            }
        }

        pBar.className = 'progress-bar progress-bar-success';
        pText.innerHTML = '<span style="color: #10b981; font-weight:bold;">Hotovo! Obnovuji stránku...</span>';
        setTimeout(() => window.location.reload(), 1000);
    },

    async buyExtension(link) {
        if (!link || !link.includes('/credits/')) {
            throw new Error("BLOCK: Pokus o nákup bez kreditů!");
        }

        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        await fetch(link, {
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken, 'X-Requested-With': 'XMLHttpRequest' }
        });
    },

    loadSelection(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    saveSelection(key, ids) {
        localStorage.setItem(key, JSON.stringify(ids));
    }
});