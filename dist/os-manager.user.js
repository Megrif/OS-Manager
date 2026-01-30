// ==UserScript==
// @name         OS Manager_dev
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Vylepšení pro hru Operační středisko
// @author       Megrif
// @match        https://www.operacni-stredisko.cz/*
// @match        https://operacni-stredisko.cz/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceURL
// @resource     osmgr_icon https://raw.githubusercontent.com/Megrif/os-manager-assets/main/pngegg.png
// @updateURL    https://raw.githubusercontent.com/Megrif/os-manager/main/dist/os-manager.user.js
// @downloadURL  https://raw.githubusercontent.com/Megrif/os-manager/main/dist/os-manager.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';



// --- SOUBOR: core.js ---
// core.js - Základní nastavení a logika (Finální verze Bod 1 - v2.2)
window.OSM = window.OSM || {};

OSM.CORE = {
    name: 'OS Manager',
    version: '1.0.1',
    storageKey: 'os_manager_settings_v1',
    debug: true,
    modules: [],
    lastUrl: window.location.href
};

const TICK_CONFIG = {
    EXTREME: 2000,
    HIGH: 10000,
    MID: 60000,
    LOW: 300000
};

// Pomocné funkce
OSM.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
OSM.log = (...a) => OSM.CORE.debug && console.log(`[${OSM.CORE.name}]`, ...a);

// Sitemap
OSM.getPageType = function(url) {
    if (url.includes('/buildings/') && url.includes('/vehicles/new')) return 'VEHICLE_SHOP';
    if (url.includes('/buildings/')) return 'BUILDING';
    if (url.includes('/missions/'))  return 'MISSION';
    if (url.includes('/vehicles/') && url.includes('/edit')) return 'VEHICLE_EDIT';
    if (url.includes('/vehicles/'))  return 'VEHICLE';
    if (url.includes('/credits') || url.includes('/coins')) return 'FINANCE';
    if (url.endsWith('.cz/') || url.endsWith('.cz/#')) return 'MAP';
    return 'UNKNOWN';
};

// --- NASTAVENÍ A STORAGE (Opraveno pro funkční menu) ---
OSM.loadSettings = function() {
    const raw = GM_getValue(OSM.CORE.storageKey, null);
    if (!raw) return { debug: true, enabled: {}, moduleSettings: {} };
    try { return JSON.parse(raw); } catch { return { debug: true, enabled: {}, moduleSettings: {} }; }
};
OSM.settings = OSM.loadSettings();
OSM.saveSettings = function() { GM_setValue(OSM.CORE.storageKey, JSON.stringify(OSM.settings)); };
OSM.isEnabled = function(moduleId, defaultEnabled) {
    const v = OSM.settings.enabled?.[moduleId];
    return (v === undefined) ? !!defaultEnabled : !!v;
};

// Doplněné funkce pro nastavení modulů (řeší error ze screenshotu)
OSM.getModuleSetting = function(moduleId, key, fallback) {
    OSM.settings.moduleSettings = OSM.settings.moduleSettings || {};
    OSM.settings.moduleSettings[moduleId] = OSM.settings.moduleSettings[moduleId] || {};
    const v = OSM.settings.moduleSettings[moduleId][key];
    return v === undefined ? fallback : v;
};
OSM.setModuleSetting = function(moduleId, key, value) {
    OSM.settings.moduleSettings = OSM.settings.moduleSettings || {};
    OSM.settings.moduleSettings[moduleId] = OSM.settings.moduleSettings[moduleId] || {};
    OSM.settings.moduleSettings[moduleId][key] = value;
    OSM.saveSettings();
};

// --- SYSTÉM TIKŮ A REGISTRACE ---
OSM.registerModule = function(mod) {
    if (!mod?.id) throw new Error('Module missing id');
    OSM.CORE.modules.push(mod);
    if (OSM.isEnabled(mod.id, mod.defaultEnabled) && mod.onInit) {
        const url = window.location.href;
        mod.onInit(url, OSM.getPageType(url));
    }
};

OSM.fireTick = function(frequency) {
    const url = window.location.href;
    const type = OSM.getPageType(url);
    OSM.CORE.modules.forEach(mod => {
        if (OSM.isEnabled(mod.id, mod.defaultEnabled) && mod.frequency === frequency && mod.onTick) {
            mod.onTick(url, type);
        }
    });
};

OSM.checkUrlChange = function() {
    const currentUrl = window.location.href;
    if (currentUrl !== OSM.CORE.lastUrl) {
        OSM.CORE.lastUrl = currentUrl;
        const type = OSM.getPageType(currentUrl);
        OSM.log(`Změna URL: ${type}`);
        OSM.CORE.modules.forEach(mod => {
            if (OSM.isEnabled(mod.id, mod.defaultEnabled) && mod.onInit) {
                mod.onInit(currentUrl, type);
            }
        });
    }
};

OSM.init = function() {
    OSM.log("Startování Jádra v2.2...");
    if (typeof OSM.insertNavbarIcon === 'function') OSM.insertNavbarIcon();

    OSM.CORE.modules.forEach(mod => {
        if (OSM.isEnabled(mod.id, mod.defaultEnabled)) {
            if (typeof mod.init === 'function') {
                OSM.log(`Aktivuji starý modul: ${mod.name}`);
                mod.init();
            }
        }
    });

    setInterval(() => OSM.fireTick('EXTREME'), TICK_CONFIG.EXTREME);
    setInterval(() => OSM.fireTick('HIGH'), TICK_CONFIG.HIGH);
    setInterval(() => OSM.fireTick('MID'), TICK_CONFIG.MID);
    setInterval(() => OSM.fireTick('LOW'), TICK_CONFIG.LOW);
    setInterval(() => OSM.checkUrlChange(), 500);
};

window.addEventListener('load', () => {
    setTimeout(() => OSM.init(), 500);
});

// --- SOUBOR: ui.js ---
// ui.js - Kompletní uživatelské rozhraní
window.OSM = window.OSM || {};

// 1. Definice stylů
GM_addStyle(`
  /* navbar icon button */
  #osmgr-navbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 6px;
    margin-left: 12px;
    border: 0;
    background: transparent;
    cursor: pointer;
    transform: translateY(7px);
  }

  #osmgr-navbtn img {
    height: 25px;
    width: auto;
    display: block;
    filter: hue-rotate(350deg) saturate(1.4) brightness(1.1) drop-shadow(0 1px 3px rgba(0,0,0,0.45));
    transition: transform 0.15s ease;
  }

  #osmgr-navbtn:hover img {
    transform: translateY(-1px) scale(1.05);
    filter: hue-rotate(100deg) saturate(1.6) brightness(1.15) drop-shadow(0 2px 6px rgba(0,0,0,0.55));
  }

  #osmgr-navbtn:active img { transform: translateY(0) scale(0.97); }

  #osmgr-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    background: rgba(0,0,0,0.55);
    display: none;
  }

  #osmgr-modal {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 18px;
  }

  #osmgr-window {
    width: 1400px;
    max-width: 95vw;
    max-height: 95vh;
    overflow: hidden;
    border-radius: 14px;
    background: #111;
    color: #fff;
    box-shadow: 0 20px 60px rgba(0,0,0,0.55);
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .osmgr-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 12px 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
  }

  .osmgr-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.2px;
  }

  .osmgr-title img { height: 22px; width: auto; }

  .osmgr-actions { display: flex; align-items: center; gap: 10px; }

  .osmgr-close {
    border: 0;
    background: rgba(255,255,255,0.10);
    color: #fff;
    padding: 6px 10px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 700;
  }
  .osmgr-close:hover { background: rgba(255,255,255,0.16); }

  .osmgr-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255,255,255,0.80);
    user-select: none;
  }

  .osmgr-body {
    display: grid;
    grid-template-columns: 360px 1fr;
    min-height: 0;
  }

  .osmgr-tabs {
    border-right: 1px solid rgba(255,255,255,0.10);
    padding: 10px;
    overflow: auto;
  }

  .osmgr-tab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.04);
    margin-bottom: 8px;
    cursor: default; /* Zakladni polozka neni klikaci */
  }

  .osmgr-tab.active {
    background: rgba(43,124,255,0.20);
    border-color: rgba(43,124,255,0.38);
  }

  .osmgr-tab-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .osmgr-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    flex: 0 0 auto;
    box-shadow: 0 0 0 2px rgba(0,0,0,0.45);
  }
  .osmgr-dot.on { background: #2ecc71; }
  .osmgr-dot.off { background: #e74c3c; }

  .osmgr-tab-name {
    font-weight: 800;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .osmgr-gear {
    border: 0;
    background: rgba(255,255,255,0.08);
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: 0 0 auto;
    transition: background 0.2s;
  }
  .osmgr-gear:hover { background: rgba(255,255,255,0.25); }

  .osmgr-content {
    padding: 14px 14px 16px 14px;
    overflow: auto;
    min-height: 0;
  }

  .osmgr-h2 { margin: 0 0 8px 0; font-size: 16px; font-weight: 900; }

  .osmgr-muted {
    color: rgba(255,255,255,0.72);
    font-size: 12px;
    line-height: 1.4;
    margin: 0 0 12px 0;
    white-space: pre-line;
  }

  .osmgr-card {
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    border-radius: 14px;
    padding: 12px;
    margin-top: 10px;
  }

  .osmgr-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0;
    flex-wrap: wrap;
  }

  .osmgr-btn {
    border: 0;
    background: #2b7cff;
    color: #fff;
    padding: 8px 10px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 800;
    font-size: 12px;
  }

  .osmgr-pill {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    font-weight: 800;
    font-size: 12px;
    line-height: 1;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.15);
    user-select: none;
    white-space: nowrap;
    pointer-events: none;
  }

  .osmgr-pill .dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    box-shadow: 0 0 0 2px rgba(0,0,0,0.35);
    flex: 0 0 auto;
  }

  .osmgr-pill .txt { padding-left: 12px; }

  #osmgr-header-pill-stack {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-left: 10px;
    vertical-align: middle;
  }

  @media (max-width: 720px) {
    .osmgr-body { grid-template-columns: 1fr; }
    .osmgr-tabs { border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.10); }
  }
`);

// 2. Globální proměnná pro stav okna
let OSMGR_SELECTED_MODULE_ID = null;

// 3. Hlavní UI Funkce
OSM.insertNavbarIcon = function() {
  const brandAnchor = document.querySelector('a.navbar-brand.hidden-xs');
  if (!brandAnchor || document.getElementById('osmgr-navbtn')) return;

  const btn = document.createElement('button');
  btn.id = 'osmgr-navbtn';
  btn.type = 'button';
  btn.title = OSM.CORE.name;

  const img = document.createElement('img');
  img.src = GM_getResourceURL('osmgr_icon');
  img.alt = 'OS Manager';
  img.onerror = () => { btn.textContent = '🚨'; };

  btn.append(img);
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    OSM.showModal();
  });

  brandAnchor.insertAdjacentElement('afterend', btn);
};

OSM.ensureModal = function() {
  if (document.getElementById('osmgr-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'osmgr-overlay';

  const modal = document.createElement('div');
  modal.id = 'osmgr-modal';

  const win = document.createElement('div');
  win.id = 'osmgr-window';

  // Header
  const header = document.createElement('div');
  header.className = 'osmgr-header';
  header.innerHTML = `
    <div class="osmgr-title">
      <img src="${GM_getResourceURL('osmgr_icon')}" alt="OSM">
      <div>${OSM.CORE.name} v${OSM.CORE.version}</div>
    </div>
    <div class="osmgr-actions">
      <label class="osmgr-toggle">
        <input type="checkbox" id="osmgr-debug-toggle" ${OSM.settings.debug ? 'checked' : ''}>
        <span>Debug</span>
      </label>
      <button class="osmgr-close" id="osmgr-close-btn">Zavřít</button>
    </div>
  `;

  // Body
  const body = document.createElement('div');
  body.className = 'osmgr-body';
  body.innerHTML = `
    <div class="osmgr-tabs" id="osmgr-tabs"></div>
    <div class="osmgr-content" id="osmgr-content"></div>
  `;

  win.append(header, body);
  modal.append(win);
  document.body.append(overlay, modal);

  // Eventy
  document.getElementById('osmgr-close-btn').onclick = OSM.hideModal;
  overlay.onclick = OSM.hideModal;
  document.getElementById('osmgr-debug-toggle').onchange = (e) => {
    OSM.settings.debug = e.target.checked;
    OSM.CORE.debug = e.target.checked;
    OSM.saveSettings();
  };
};

OSM.showModal = function(selectModuleId = null) {
  OSM.ensureModal();
  OSMGR_SELECTED_MODULE_ID = selectModuleId;
  OSM.renderTabsAndContent();

  document.getElementById('osmgr-overlay').style.display = 'block';
  document.getElementById('osmgr-modal').style.display = 'flex';
};

OSM.hideModal = function() {
  const overlay = document.getElementById('osmgr-overlay');
  const modal = document.getElementById('osmgr-modal');
  if (overlay) overlay.style.display = 'none';
  if (modal) modal.style.display = 'none';
};

OSM.renderTabsAndContent = function() {
  const tabsEl = document.getElementById('osmgr-tabs');
  const contentEl = document.getElementById('osmgr-content');
  if (!tabsEl || !contentEl) return;

  tabsEl.innerHTML = '';

  // Dashboard pokud není vybrán modul
  if (!OSMGR_SELECTED_MODULE_ID) {
    contentEl.innerHTML = `
      <div class="osmgr-h2">Vítejte v OS Manageru</div>
      <div class="osmgr-muted">Vyberte modul vlevo a pomocí ozubeného kolečka otevřete nastavení.<br>Moduly lze podle potřeby zapínat a vypínat.</div>
    `;
  }

  OSM.CORE.modules.forEach(mod => {
    const enabled = OSM.isEnabled(mod.id, mod.defaultEnabled);
    const isActive = mod.id === OSMGR_SELECTED_MODULE_ID;
    
    const tab = document.createElement('div');
    tab.className = 'osmgr-tab' + (isActive ? ' active' : '');
    
    tab.innerHTML = `
      <div class="osmgr-tab-left">
        <div class="osmgr-dot ${enabled ? 'on' : 'off'}"></div>
        <div class="osmgr-tab-name">${mod.name}</div>
      </div>
      <button class="osmgr-gear"><span>⚙️</span></button>
    `;

    // KLIK NA CELÝ TAB (Nedělá nic, jak jsi chtěl)
    tab.onclick = (e) => {
       // Nic se neděje, pouze zabráníme případným jiným akcím
    };

    // KLIK POUZE NA OZUBENÉ KOLEČKO (Otevírá / Zavírá)
    const gear = tab.querySelector('.osmgr-gear');
    gear.onclick = (e) => {
        e.stopPropagation();
        if (OSMGR_SELECTED_MODULE_ID === mod.id) {
            // Pokud je už vybrán, odznačíme ho (zavřeme nastavení)
            OSMGR_SELECTED_MODULE_ID = null;
        } else {
            // Jinak ho vybereme
            OSMGR_SELECTED_MODULE_ID = mod.id;
        }
        OSM.renderTabsAndContent();
    };

    tabsEl.append(tab);
  });

  if (OSMGR_SELECTED_MODULE_ID) {
    OSM.renderModuleContent(OSMGR_SELECTED_MODULE_ID);
  }
};

OSM.renderModuleContent = function(moduleId) {
  const contentEl = document.getElementById('osmgr-content');
  const mod = OSM.CORE.modules.find(m => m.id === moduleId);
  if (!mod) return;

  const enabled = OSM.isEnabled(mod.id, mod.defaultEnabled);

  contentEl.innerHTML = `
    <div class="osmgr-h2">${mod.name}</div>
    <div class="osmgr-muted">${mod.description || ''}</div>
    <div class="osmgr-card">
      <div class="osmgr-row">
        <label class="osmgr-toggle" style="cursor: pointer;">
          <input type="checkbox" id="mod-enabled-check" ${enabled ? 'checked' : ''}>
          <span id="mod-enabled-text" style="font-weight: bold;">${enabled ? 'Aktivní' : 'Neaktivní'}</span>
        </label>
      </div>
      <hr style="border:0; border-top: 1px solid rgba(255,255,255,0.1); margin: 15px 0;">
      <div id="osmgr-module-custom-settings"></div>
    </div>
  `;

  document.getElementById('mod-enabled-check').onchange = (e) => {
    const isNowEnabled = e.target.checked;
    
    OSM.settings.enabled = OSM.settings.enabled || {};
    OSM.settings.enabled[mod.id] = isNowEnabled;
    OSM.saveSettings();
    
    document.getElementById('mod-enabled-text').textContent = isNowEnabled ? 'Aktivní' : 'Neaktivní';
    
    // Refresh pouze menu pro aktualizaci barev teček
    OSM.renderTabsAndContent();

    // SPECIÁLNÍ LOGIKA: Pokud se zapnul Online Status, obnovíme celou stránku
    if (mod.id === 'owner_online_status' && isNowEnabled) {
        // Malá prodleva, aby uživatel viděl, že se tlačítko přeplo, než to blikne
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }
  };

  // Pokud má modul vlastní vykreslování nastavení (např. výběr aut ve FastSend)
  if (typeof mod.renderSettings === 'function') {
    mod.renderSettings(document.getElementById('osmgr-module-custom-settings'));
  }
};

// --- SOUBOR: building_extensions.js ---
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

// --- SOUBOR: fast_send.js ---
// fast_send.js - Jádro v3.2 (FINAL + MASTER CHECKBOX)
window.OSM = window.OSM || {};

OSM.registerModule({
    id: 'nearest_unit_send_next',
    name: 'Rychlé odesílání',
    description: 'Tento modul za vás vybere jednu nejbližší jednotku, odešle ji a přejde na další misi.<br>Lze spustit automatický režim stiskem Shift a nastavené klavesy.<br>Jakmile dojde automat na poslední misi kde nemáte jednotku, po jejím odeslání se sám vypne.',
    defaultEnabled: false,
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

// --- SOUBOR: missioncloseindicator.js ---
// mission_close_indicator.js - Migrováno na Jádro v2 (Bod 2)
window.OSM = window.OSM || {};

OSM.registerModule({
    id: 'mission_close_indicator',
    name: 'Indikátor potřeby uzavření',
    description: 'Barevná tečka podle expirace: Zelená (Nepropadne), Červená (Propadne).',
    defaultEnabled: false,
    frequency: 'NONE', // Nový systém: Spouštěno přes onInit jádra

    // Tato funkce se zavolá při každém načtení stránky nebo změně URL v modálu
    onInit(url, pageType) {
        // 1. KROK: Kontrola, zda jsme v misi
        if (pageType !== 'MISSION') {
            this.destroy(); // Pokud jsme jinde, uklidíme vizuál (např. při zavření okna)
            return;
        }

        OSM.log("[Module] Aktivuji indikátor pro misi.");
        
        // 2. KROK: Spuštění logiky (hned při otevření)
        this.updateIndicator();
        
        // 3. KROK: MutationObserver zůstává pro případ, že se obsah mise překreslí bez změny URL
        if (this.observer) this.observer.disconnect();
        this.observer = new MutationObserver(() => this.updateIndicator());
        this.observer.observe(document.body, { childList: true, subtree: true });

        // 4. KROK: Pojistka pro dlouho otevřená okna (přechod přes 5:30 ráno)
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.checkInterval = setInterval(() => this.updateIndicator(), 30000); // Stačí jednou za 30s
    },

    updateIndicator() {
        const h1 = document.getElementById('missionH1');
        if (!h1) return;

        const infoRow = document.querySelector('.mission_header_info.row');
        if (!infoRow) return;
        
        const col = infoRow.querySelector('.col-md-6[data-generation-time]');
        if (!col || !col.getAttribute('data-generation-time')) return;

        const genTimeStr = col.getAttribute('data-generation-time');
        const genDate = new Date(genTimeStr);
        if (isNaN(genDate.getTime())) return;

        // --- VÝPOČET DEADLINE ---
        const threshold = new Date(genDate);
        threshold.setHours(5, 30, 0, 0);

        let deadlineDate = new Date(genDate);
        if (genDate < threshold) {
            deadlineDate.setDate(genDate.getDate() + 1);
        } else {
            deadlineDate.setDate(genDate.getDate() + 2);
        }
        deadlineDate.setHours(5, 30, 0, 0);

        // --- ROZHODNUTÍ O STAVU ---
        const now = new Date();
        const nextMorning530 = new Date(now);
        if (now.getHours() > 5 || (now.getHours() === 5 && now.getMinutes() >= 30)) {
            nextMorning530.setDate(now.getDate() + 1);
        }
        nextMorning530.setHours(5, 30, 0, 0);

        const isExpiringSoon = deadlineDate.getTime() === nextMorning530.getTime();
        const newText = isExpiringSoon ? "POTŘEBA UZAVŘÍT" : "NETŘEBA ZAVÍRAT";
        const dotColor = isExpiringSoon ? "#e74c3c" : "#2ecc71";

        // --- VYKRESLENÍ ---
        let stack = document.getElementById('osmgr-header-pill-stack');
        if (!stack) {
            stack = document.createElement('span');
            stack.id = 'osmgr-header-pill-stack';
            h1.appendChild(stack);
        }

        let pill = document.getElementById('osmgr-mission-close-indicator');
        if (!pill) {
            pill = document.createElement('span');
            pill.id = 'osmgr-mission-close-indicator';
            pill.className = 'osmgr-pill';
            pill.style.color = "#ffffff";
            pill.style.fontWeight = "bold";
            pill.style.marginLeft = "10px";
            stack.appendChild(pill);
        }

        if (pill.getAttribute('data-last-state') !== newText) {
            pill.innerHTML = `<span class="dot" style="background: ${dotColor}; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px;"></span><span class="txt">${newText}</span>`;
            pill.setAttribute('data-last-state', newText);
        }
    },

    destroy() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        if (this.observer) this.observer.disconnect();
        document.getElementById('osmgr-mission-close-indicator')?.remove();
    }
});

// --- SOUBOR: owner_online_status.js ---
// owner_online_status.js - LIVE TOGGLE VERSION
window.OSM = window.OSM || {};

OSM.registerModule({
    id: 'owner_online_status',
    name: 'Ukazatel online stavu majitele mise',
    description: 'V seznamu misí zobrazuje jméno majitele a barevnou tečku (Zelená = Online).',
    defaultEnabled: false,
    frequency: 'NONE',

    allianceData: null,
    isHooked: false,
    lastEnabledState: true, // Pamatuje si poslední stav pro detekci změny

    // Přístup k proměnným hry
    getGameVar(name) {
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow[name]) return unsafeWindow[name];
        if (window[name]) return window[name];
        return null;
    },

    async onInit(url, pageType) {
        if (pageType !== 'MAP' && pageType !== 'UNKNOWN') return;

        // Nastavíme výchozí stav podle toho, jak to je teď
        this.lastEnabledState = OSM.isEnabled(this.id);

        // 1. Spustíme hlídače nastavení (aby to reagovalo na kliknutí v menu)
        this.startSettingsWatcher();

        // Pokud je modul vypnutý při startu, dál nepokračujeme v načítání dat
        if (!this.lastEnabledState) return;

        // 2. Stáhnout data
        await this.fetchAllianceData();
        if (!this.allianceData) return;

        // 3. Hook (aktivujeme jen jednou)
        if (!this.isHooked) {
            this.setupMissionHook();
            this.isHooked = true;
        }

        // 4. Zpracování existujících misí
        setTimeout(() => this.processExistingMissions(), 1000);
        setTimeout(() => this.processExistingMissions(), 3000);
    },

    // --- NOVINKA: Hlídač změn v nastavení ---
    startSettingsWatcher() {
        setInterval(() => {
            const currentlyEnabled = OSM.isEnabled(this.id);

            // Pokud se stav nezměnil, nic neděláme
            if (currentlyEnabled === this.lastEnabledState) return;

            // ZMĚNA DETEKOVÁNA!
            this.lastEnabledState = currentlyEnabled;

            if (currentlyEnabled) {
                // Uživatel to právě ZAPNUL
                console.log('[OSM Status] Modul zapnut - obnovuji štítky.');
                // Pokud nemáme data (protože při startu bylo vypnuto), stáhneme je teď
                if (!this.allianceData) {
                    this.fetchAllianceData().then(() => {
                         if (!this.isHooked) { this.setupMissionHook(); this.isHooked = true; }
                         this.processExistingMissions();
                    });
                } else {
                    this.processExistingMissions();
                }
            } else {
                // Uživatel to právě VYPNUL
                console.log('[OSM Status] Modul vypnut - uklízím.');
                this.destroy();
            }
        }, 500); // Kontrola každých 500ms
    },

    destroy() {
        // Najde všechny prvky, jejichž ID začíná na "osmgr_owner_label_" a smaže je
        const labels = document.querySelectorAll('[id^="osmgr_owner_label_"]');
        labels.forEach(el => el.remove());
    },

    async fetchAllianceData() {
        const CACHE_KEY = 'osmgr_alliance_cache';
        const MAX_AGE = 5 * 60 * 1000; 

        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if ((new Date().getTime() - parsed.lastUpdate) < MAX_AGE && parsed.userId === this.getMyUserId()) {
                this.allianceData = parsed.value;
                return;
            }
        }

        try {
            const response = await fetch("/api/allianceinfo");
            const data = await response.json();
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                lastUpdate: new Date().getTime(),
                value: data,
                userId: this.getMyUserId()
            }));
            this.allianceData = data;
        } catch (e) { console.error('[OSM Status] Chyba API:', e); }
    },

    getMyUserId() {
        if (typeof user_id !== 'undefined') return user_id;
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.user_id) return unsafeWindow.user_id;
        return window.user_id;
    },

    processExistingMissions() {
        if (!OSM.isEnabled(this.id)) return; // Pojistka

        const markers = this.getGameVar('mission_markers');
        if (!markers || markers.length === 0) return;

        const lists = [
            document.getElementById('mission_list_alliance'),
            document.getElementById('mission_list_sicherheitswache')
        ];

        lists.forEach(list => {
            if (!list) return;
            list.querySelectorAll('.missionSideBarEntry').forEach(entry => {
                const mid = entry.getAttribute('mission_id');
                if (mid && !document.getElementById(`osmgr_owner_label_${mid}`)) {
                    const marker = markers.find(m => m.mission_id == mid);
                    if (marker) this.renderLabel(mid, marker.user_id);
                }
            });
        });
    },

    setupMissionHook() {
        const origFunc = this.getGameVar('missionMarkerAdd') || window.missionMarkerAdd;
        
        const newFunc = (e) => {
            if (typeof origFunc === 'function') origFunc(e);
            
            // Pojistka: Pokud vypnuto, nic nedělej
            if (!OSM.isEnabled(this.id)) return;

            if (e && e.id && e.user_id) {
                this.renderLabel(e.id, e.user_id);
            }
        };

        if (typeof unsafeWindow !== 'undefined') unsafeWindow.missionMarkerAdd = newFunc;
        window.missionMarkerAdd = newFunc;
    },

    renderLabel(missionId, ownerId) {
        if (!this.allianceData) return;
        
        // Pokud chceš skrýt sám sebe, odkomentuj:
        // if (ownerId == this.getMyUserId()) return;

        if (document.getElementById(`osmgr_owner_label_${missionId}`)) return;

        const user = this.allianceData.users.find(u => u.id === ownerId);
        const userName = user ? user.name : "Neznámý";
        const isOnline = user ? user.online : false;
        
        const color = isOnline ? '#2ecc71' : '#e74c3c'; 

        const link = document.createElement("a");
        link.id = `osmgr_owner_label_${missionId}`;
        link.style.cssText = "margin-right: 5px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; padding: 1px 5px; border-radius: 4px; color: white; background: #333; font-size: 11px; font-weight: bold; text-decoration: none;";
        link.href = `/profile/${ownerId}`;
        link.target = "_blank";
        
        link.innerHTML = `
            <span style="height: 7px; width: 7px; background-color: ${color}; border-radius: 50%; display: inline-block;"></span>
            ${userName}
        `;

        const caption = document.getElementById(`mission_caption_${missionId}`);
        if (caption) {
            try {
                caption.before(link);
            } catch(err) { console.error(err); }
        }
    }
});
})();
