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