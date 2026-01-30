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
    OSM.settings.enabled = OSM.settings.enabled || {};
    OSM.settings.enabled[mod.id] = e.target.checked;
    OSM.saveSettings();
    document.getElementById('mod-enabled-text').textContent = e.target.checked ? 'Aktivní' : 'Neaktivní';
    
    // Refresh pouze menu pro aktualizaci barev teček
    OSM.renderTabsAndContent(); 
  };

  // Pokud má modul vlastní vykreslování nastavení (např. výběr aut ve FastSend)
  if (typeof mod.renderSettings === 'function') {
    mod.renderSettings(document.getElementById('osmgr-module-custom-settings'));
  }
};