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