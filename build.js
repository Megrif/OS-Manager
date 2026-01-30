const fs = require('fs');
const path = require('path');

// --- KONFIGURACE ---
const SRC_DIR = 'src';
const DIST_FILE = 'dist/os-manager.user.js';
const SCRIPT_VERSION = '1.0.0'; 
// -------------------

const scriptHeader = `// ==UserScript==
// @name         OS Manager
// @namespace    http://tampermonkey.net/
// @version      ${SCRIPT_VERSION}
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

`;

const scriptFooter = `
})();
`;

function getAllJsFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllJsFiles(fullPath, arrayOfFiles);
        } else if (path.extname(file) === '.js') {
            arrayOfFiles.push(fullPath);
        }
    });

    // KLÍČOVÁ ZMĚNA: Vynucené pořadí
    return arrayOfFiles.sort((a, b) => {
        const nameA = path.basename(a);
        const nameB = path.basename(b);

        // core.js musí být úplně první
        if (nameA === 'core.js') return -1;
        if (nameB === 'core.js') return 1;

        // ui.js musí být hned po core.js
        if (nameA === 'ui.js') return -1;
        if (nameB === 'ui.js') return 1;

        return 0;
    });
}

try {
    const allFiles = getAllJsFiles(SRC_DIR);
    console.log('Sestavuji v tomto pořadí:', allFiles.map(f => path.basename(f)));

    let combinedContent = '';
    allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        combinedContent += `\n\n// --- SOUBOR: ${path.basename(file)} ---\n${content}`;
    });

    const finalScriptContent = scriptHeader + combinedContent + scriptFooter;

    if (!fs.existsSync('dist')) fs.mkdirSync('dist');
    fs.writeFileSync(DIST_FILE, finalScriptContent);
    
    console.log(`\x1b[32m%s\x1b[0m`, `✅ Úspěšně sestaveno verze ${SCRIPT_VERSION}!`);

} catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Chyba při sestavování:', err);
}