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