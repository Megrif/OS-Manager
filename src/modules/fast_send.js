// fast_send.js - Jádro v3.2 (FINAL + MASTER CHECKBOX)
window.OSM = window.OSM || {};

OSM.registerModule({
    id: 'nearest_unit_send_next',
    name: 'Rychlé odesílání',
    description: 'Tento modul za vás vybere jednu nejbližší jednotku, odešle ji a přejde na další misi.<br>Lze spustit automatický režim stiskem Shift a nastavené klavesy.<br>Jakmile dojde automat na poslední misi kde nemáte jednotku, po jejím odeslání se sám vypne.',
    defaultEnabled: true,
    frequency: 'NONE',

    onInit(url, pageType) {
        if (!window._osmgr_fs_keys_bound) {
            this.setupKeybinds();
            window._osmgr_fs_keys_bound = true;
        }

        if (pageType !== 'MISSION') return;

        if (this.isAutoOn()) {
            if (document.querySelector('.glyphicon-user')) {
                this.setAuto(false);
            } else {
                setTimeout(() => this.triggerSend(), 600);
            }
        }
        
        setTimeout(() => this.renderAutoPill(), 200);
    },

    parseTimeToSeconds(text) {
        const t = String(text || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        let seconds = 0;
        const h = t.match(/(\d+)\s*h\b/);
        const min = t.match(/(\d+)\s*min\b/);
        const sec = t.match(/(\d+)\s*s\b/);
        if (h) seconds += parseInt(h[1], 10) * 3600;
        if (min) seconds += parseInt(min[1], 10) * 60;
        if (sec) seconds += parseInt(sec[1], 10);
        return seconds > 0 ? seconds : null;
    },

    parseKm(text) {
        const t = String(text || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        const m = t.match(/([\d.,]+)\s*km\b/);
        if (!m) return null;
        const num = parseFloat(m[1].replace(',', '.'));
        return Number.isFinite(num) ? num : null;
    },

    isAutoOn() { return sessionStorage.getItem('osmgr_fastsend_auto') === '1'; },
    setAuto(on) {
        if (on) sessionStorage.setItem('osmgr_fastsend_auto', '1');
        else sessionStorage.removeItem('osmgr_fastsend_auto');
        this.renderAutoPill();
    },

    setupKeybinds() {
        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            if (!document.getElementById('missionH1')) return;

            const savedKey = (OSM.getModuleSetting('nearest_unit_send_next', 'hotkey', 'n') || 'n').toLowerCase();
            if (e.key.toLowerCase() === savedKey) {
                if (e.shiftKey) {
                    const newState = !this.isAutoOn();
                    this.setAuto(newState);
                    if (newState) this.triggerSend();
                } else {
                    this.triggerSend();
                }
            }
        });
    },

    triggerSend() {
        const allowedTypes = new Set(OSM.getModuleSetting('nearest_unit_send_next', 'allowedTypeIds', [1, 8, 9]));
        const checkboxes = Array.from(document.querySelectorAll('input.vehicle_checkbox:not(:disabled):not(:checked)'));

        if (checkboxes.length === 0) {
            this.handleNoUnitsFound();
            return;
        }

        let timeCandidates = [];
        let kmCandidates = [];

        checkboxes.forEach(cb => {
            const row = cb.closest('tr');
            if (!row) return;

            const typeId = parseInt(cb.getAttribute('vehicle_type_id') || 
                                    row.getAttribute('vehicle_type_id') || 
                                    row.querySelector('[vehicle_type_id]')?.getAttribute('vehicle_type_id'));
            
            if (isNaN(typeId) || !allowedTypes.has(typeId)) return;

            const timeAttr = row.querySelector('[timevalue]')?.getAttribute('timevalue');
            let seconds = (timeAttr && timeAttr !== "0") ? parseInt(timeAttr) : this.parseTimeToSeconds(row.innerText);

            if (seconds) {
                timeCandidates.push({ cb, seconds });
            } else {
                const km = this.parseKm(row.innerText);
                const btn = row.querySelector('.calculateTime') || 
                            Array.from(row.querySelectorAll('a,button')).find(el => el.textContent.toLowerCase().includes('počítat'));
                
                if (km !== null) {
                    kmCandidates.push({ cb, km, btn });
                }
            }
        });

        if (timeCandidates.length > 0) {
            timeCandidates.sort((a, b) => a.seconds - b.seconds);
            this.executeSend(timeCandidates[0].cb);
            return;
        }

        const loadBtn = document.querySelector('.missing_vehicles_load');
        if (loadBtn && !this.hasLoadedExtra) {
            this.hasLoadedExtra = true;
            loadBtn.click();
            setTimeout(() => this.triggerSend(), 2500);
            return;
        }

        if (kmCandidates.length > 0) {
            kmCandidates.sort((a, b) => a.km - b.km);
            const bestKm = kmCandidates[0];
            if (bestKm.btn) {
                bestKm.btn.click();
                setTimeout(() => this.triggerSend(), 1200);
            } else {
                this.executeSend(bestKm.cb);
            }
            return;
        }

        this.handleNoUnitsFound();
    },

    handleNoUnitsFound() {
        const loadBtn = document.querySelector('.missing_vehicles_load');
        if (loadBtn && !this.hasLoadedExtra) {
            this.hasLoadedExtra = true;
            loadBtn.click();
            setTimeout(() => this.triggerSend(), 2500);
            return;
        }
        
        if (this.isAutoOn()) {
            this.setAuto(false);
            alert("Automatika: Žádné vhodné jednotky v dosahu.");
        }
    },

    executeSend(checkbox) {
        checkbox.click();
        setTimeout(() => {
            const sendBtn = document.getElementById('alert_next_btn') || 
                            document.getElementById('mission_alarm_btn') || 
                            document.querySelector('.glyphicon-arrow-right')?.closest('a') ||
                            document.querySelector('input[name="commit"]');
            if (sendBtn) sendBtn.click();
        }, 100);
    },

    renderAutoPill() {
        const h1 = document.getElementById('missionH1');
        if (!h1) return;
        let stack = document.getElementById('osmgr-header-pill-stack') || (()=>{
            const s = document.createElement('span'); s.id = 'osmgr-header-pill-stack';
            h1.appendChild(s); return s;
        })();
        let pill = document.getElementById('osmgr-fastsend-auto-pill') || (()=>{
            const p = document.createElement('span'); p.id = 'osmgr-fastsend-auto-pill';
            p.className = 'osmgr-pill'; p.style.color = "#ffffff"; p.style.fontWeight = "bold";
            p.style.marginLeft = "10px"; stack.appendChild(p); return p;
        })();
        const on = this.isAutoOn();
        const dotColor = on ? "#2ecc71" : "#e74c3c";
        pill.innerHTML = `<span class="dot" style="background: ${dotColor}; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span><span class="txt" style="vertical-align: middle;">AUTO</span>`;
    },

    destroy() { document.getElementById('osmgr-fastsend-auto-pill')?.remove(); },

    renderSettings(container) {
        const MOD_ID = 'nearest_unit_send_next';
        const currentKey = (OSM.getModuleSetting(MOD_ID, 'hotkey', 'n') || 'n').toUpperCase();
        
        const settingsHtml = `
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; border: 1px solid #444;">
                <div style="font-weight:bold; font-size: 12px; color: #fff;">KLÁVESA:</div>
                <input type="text" id="osmgr-fs-hotkey" value="${currentKey}" readonly
                       style="width: 45px; text-align: center; margin: 5px 0; cursor: pointer; font-weight: bold; background: #fff; color: #000;">
                <div id="osmgr-fs-help-text" style="font-size: 11px; color: #bbb; margin-top: 5px;">
                    Pro výběr a odeslání jednotky stiskni <strong>${currentKey}</strong>, pro spuštění automatického režimu stiskni <strong>Shift+${currentKey}</strong>
                </div>
            </div>
            <div style="font-weight:bold; margin-bottom:10px;">Zde nastavíte které typy jednotek lze odeslat:</div>
        `;
        container.insertAdjacentHTML('beforeend', settingsHtml);
        
        const input = container.querySelector('#osmgr-fs-hotkey');
        const helpText = container.querySelector('#osmgr-fs-help-text');

        input.onkeydown = (e) => {
            e.preventDefault();
            const key = e.key.toLowerCase();
            if (key.length === 1) {
                const kUpper = key.toUpperCase();
                input.value = kUpper;
                OSM.setModuleSetting(MOD_ID, 'hotkey', key);
                helpText.innerHTML = `Pro výběr a odeslání jednotky stiskni <strong>${kUpper}</strong>, pro spuštění stiskni <strong>Shift+${kUpper}</strong>`;
                input.blur();
            }
        };

        // --- DEFINICE SEZNAMU VOZIDEL ---
        const VEHICLE_TYPES = [
            { id: 0, name: 'CAS 20' }, { id: 1, name: 'CAS 30' }, { id: 2, name: 'AZ' }, { id: 3, name: 'VEA' },
            { id: 4, name: 'TA' }, { id: 5, name: 'RZP' }, { id: 6, name: 'KHA' }, { id: 7, name: 'TACH' },
            { id: 8, name: 'Policejní automobil' }, { id: 9, name: 'Vrtulník LZS' }, { id: 10, name: 'AP' },
            { id: 11, name: 'Policejní vrtulník' }, { id: 12, name: 'Obrněné vozidlo URNA' },
            { id: 13, name: 'Vozidlo kynologů PČR' }, { id: 14, name: 'Policejní motocykl' }, { id: 15, name: 'URNA SUV' },
            { id: 16, name: 'PPLA' }, { id: 17, name: 'MOS' }, { id: 18, name: 'Vozidlo vyšetřovatelů DN' },
            { id: 19, name: 'Vozidlo pyrotechnika PČR' }, { id: 20, name: 'Přívěs se člunem' },
            { id: 21, name: 'Přívěs se člunem VZS ČČK' }, { id: 22, name: 'Potápěčský automobil' },
            { id: 23, name: 'SUV VZS ČČK' }, { id: 24, name: 'Dodávka VZS ČČK' }, { id: 25, name: 'RV' },
            { id: 26, name: 'IP' }, { id: 27, name: 'RLP' }, { id: 28, name: 'VYA' }, { id: 29, name: 'AJ' },
            { id: 30, name: 'DA' }, { id: 31, name: 'RZA' }, { id: 32, name: 'Dodávka pořádkové jednotky' },
            { id: 33, name: 'Policejní anton' }, { id: 34, name: 'Vodní dělo pořádkové policie' },
            { id: 35, name: 'Vozidlo velitele PČR' }, { id: 36, name: 'Monitorovací vozidlo' },
            { id: 37, name: 'Technické vozidlo s LRAD' }, { id: 38, name: 'Malý přepravník koní' },
            { id: 39, name: 'Nákladní přepravník koní' }, { id: 40, name: 'Letištní speciál' },
            { id: 41, name: 'Záchranné evakuační schody' }, { id: 42, name: 'Přívěs s motorovým čerpadlem' },
            { id: 43, name: 'ANK' }, { id: 44, name: 'Sorbentový kontejner' }, { id: 45, name: 'Chemický kontejner' },
            { id: 46, name: 'Plynový hasící kontejner' }, { id: 47, name: 'Pěnidlový kontejner' },
            { id: 48, name: 'Hadicový kontejner' }, { id: 49, name: 'Technický kontejner' }, { id: 50, name: 'Týlový kontejner' },
            { id: 51, name: 'Kontejnerová elektrocentrála' }, { id: 52, name: 'Kontejner pro nouzové zastřešení' },
            { id: 53, name: 'Lodní kontejner' }, { id: 54, name: 'Přeprava ambulancí' },
            { id: 55, name: 'Ambulance pro urgentní přepravu' }, { id: 56, name: 'CAS 20 drážních hasičů' },
            { id: 57, name: 'CAS 30 drážních hasičů' }, { id: 58, name: 'Vozidlo s nakolejovacím zařízením' },
            { id: 59, name: 'Dvoucestný automobil' }, { id: 60, name: 'Vozidlo drážního vyšetřovatele' },
            { id: 61, name: 'Vyprošťovací tank' }, { id: 62, name: 'Sněžný skútr' }, { id: 63, name: 'Sněhový přívěs' },
            { id: 64, name: 'Horská čtyřkolka' }, { id: 65, name: 'Přívěs na horskou čtyřkolku' },
            { id: 66, name: 'Salašnický pes' }, { id: 67, name: 'Horská záchranná dodávka' }
        ];

        const saved = OSM.getModuleSetting(MOD_ID, 'allowedTypeIds', [1, 8, 9]);
        const allowedSet = new Set(saved);

        // --- MASTER CHECKBOX ---
        const masterContainer = document.createElement('div');
        masterContainer.style.cssText = 'padding: 5px; margin-bottom: 5px; border-bottom: 1px solid #444;';
        
        const masterLabel = document.createElement('label');
        masterLabel.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; margin: 0; font-weight: bold; color: #fff;';
        
        const masterChk = document.createElement('input');
        masterChk.type = 'checkbox';
        masterChk.checked = VEHICLE_TYPES.every(vt => allowedSet.has(vt.id));
        
        masterLabel.append(masterChk, document.createTextNode('Vybrat vše / Zrušit vše'));
        masterContainer.append(masterLabel);
        container.append(masterContainer);

        // --- SEZNAM ---
        const list = document.createElement('div');
        list.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:14px; max-height: 300px; overflow-y: auto; padding: 5px;';
        
        VEHICLE_TYPES.forEach(vt => {
            const item = document.createElement('label');
            item.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; margin: 0; padding: 2px 0;';
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.checked = allowedSet.has(vt.id);
            chk.onchange = () => {
                if (chk.checked) allowedSet.add(vt.id); else allowedSet.delete(vt.id);
                OSM.setModuleSetting(MOD_ID, 'allowedTypeIds', Array.from(allowedSet));
                masterChk.checked = VEHICLE_TYPES.every(t => allowedSet.has(t.id));
            };
            item.append(chk, document.createTextNode(vt.name));
            list.append(item);
        });
        container.append(list);

        // --- OBSLUHA MASTER CHECKBOXU ---
        masterChk.onchange = () => {
            const isChecked = masterChk.checked;
            const allInputs = list.querySelectorAll('input[type="checkbox"]');
            allInputs.forEach(inp => inp.checked = isChecked);

            if (isChecked) {
                VEHICLE_TYPES.forEach(vt => allowedSet.add(vt.id));
            } else {
                allowedSet.clear();
            }
            OSM.setModuleSetting(MOD_ID, 'allowedTypeIds', Array.from(allowedSet));
        };
    }
});