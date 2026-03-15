// ==UserScript==
// @name         AliExpress.RU to .COM/.US switcher
// @namespace    https://github.com/Puvox
// @version      2.0.1
// @description  Redirects aliexpress.ru to aliexpress.com and sets preferred region/currency via an on-page panel ( https://github.com/Puvox/aliexpress-ru-switcher-com-us )
// @author       svtcore
// @license      GPL-3.0
// @match        https://aliexpress.ru/*
// @match        https://www.aliexpress.ru/*
// @match        https://aliexpress.com/*
// @match        https://www.aliexpress.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @connect      login.aliexpress.com
// @connect      login.aliexpress.ru
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ─── USER DEFAULTS (used on first run) ───────────────────────────────────────
    const DEFAULT_CURRENCY    = 'USD';
    const DEFAULT_REGION      = 'US';
    const DEFAULT_GLOBAL_MODE = true;
    // ─────────────────────────────────────────────────────────────────────────────

    let currency   = GM_getValue('currency',   DEFAULT_CURRENCY);
    let region     = GM_getValue('region',     DEFAULT_REGION);
    let globalMode = GM_getValue('globalMode', DEFAULT_GLOBAL_MODE);

    const href  = window.location.href;
    const isRu  = href.includes('aliexpress.ru');
    const isCom = href.includes('aliexpress.com');

    // ─── REDIRECT: .ru → .com (runs before DOM, no UI needed) ───────────────────
    if (globalMode && isRu) {
        applySettings(currency, region);
        window.location.replace(href.replace('aliexpress.ru', 'aliexpress.com'));
        return;
    }

    // ─── APPLY SETTINGS ON .com ──────────────────────────────────────────────────
    if (isCom) {
        applySettings(currency, region);
    }

    // ─── INJECT UI AFTER DOM IS READY ────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectUI);
    } else {
        injectUI();
    }

    // ─── TAMPERMONKEY MENU COMMANDS ──────────────────────────────────────────────
    GM_registerMenuCommand('🌐 Global Mode: ' + (globalMode ? 'ON — click to disable' : 'OFF — click to enable'), () => {
        GM_setValue('globalMode', !globalMode);
        location.reload();
    });

    GM_registerMenuCommand('💱 Currency: ' + currency + ' — click to change', () => {
        const val = prompt('Enter 3-letter currency code (e.g. USD, EUR, GBP):', currency);
        if (val && val.trim().length >= 3) saveAndReload('currency', val.trim().toUpperCase());
    });

    GM_registerMenuCommand('🌍 Region: ' + region.toUpperCase() + ' — click to change', () => {
        const val = prompt('Enter 2-letter ISO country code (e.g. US, DE, GB):', region.toUpperCase());
        if (val && val.trim().length >= 2) saveAndReload('region', val.trim().toLowerCase());
    });

    // ─────────────────────────────────────────────────────────────────────────────

    function applySettings(cur, reg) {
        const params = 'fromApp=false&currency=' + encodeURIComponent(cur) +
                       '&region=' + encodeURIComponent(reg.toUpperCase()) +
                       '&bLocale=en_US&site=glo&province=&city=';
        ['https://login.aliexpress.com/setCommonCookie.htm',
         'https://login.aliexpress.ru/setCommonCookie.htm'].forEach(function (base) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: base + '?' + params,
                withCredentials: true,
                onload:  function () { console.log('[AliSwitcher] Applied via ' + base); },
                onerror: function () { console.warn('[AliSwitcher] Could not reach ' + base); }
            });
        });
    }

    function saveAndReload(key, val) {
        GM_setValue(key, val);
        applySettings(
            key === 'currency'   ? val : GM_getValue('currency',   DEFAULT_CURRENCY),
            key === 'region'     ? val : GM_getValue('region',     DEFAULT_REGION)
        );
        setTimeout(function () { location.reload(); }, 400);
    }

    function injectUI() {
        GM_addStyle(`
            #ali-switcher-fab {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 2147483647;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #e62e04;
                color: #fff;
                font-size: 22px;
                line-height: 48px;
                text-align: center;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(0,0,0,.35);
                user-select: none;
                transition: background .2s;
            }
            #ali-switcher-fab:hover { background: #c02703; }

            #ali-switcher-panel {
                display: none;
                position: fixed;
                bottom: 82px;
                right: 24px;
                z-index: 2147483647;
                width: 260px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 8px 28px rgba(0,0,0,.22);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 13px;
                color: #1a1a1a;
                overflow: hidden;
            }
            #ali-switcher-panel.open { display: block; }

            .ali-panel-header {
                background: #e62e04;
                color: #fff;
                padding: 10px 14px;
                font-weight: 700;
                font-size: 13px;
                letter-spacing: .3px;
            }
            .ali-panel-body { padding: 12px 14px; }

            .ali-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }
            .ali-row:last-child { margin-bottom: 0; }
            .ali-label { font-weight: 600; color: #333; }
            .ali-sub   { font-size: 11px; color: #888; margin-top: 1px; }

            /* Toggle switch */
            .ali-toggle {
                position: relative;
                width: 40px;
                height: 22px;
                flex-shrink: 0;
            }
            .ali-toggle input { opacity: 0; width: 0; height: 0; }
            .ali-slider {
                position: absolute;
                inset: 0;
                background: #ccc;
                border-radius: 22px;
                cursor: pointer;
                transition: background .2s;
            }
            .ali-slider:before {
                content: '';
                position: absolute;
                width: 16px; height: 16px;
                left: 3px; top: 3px;
                background: #fff;
                border-radius: 50%;
                transition: transform .2s;
            }
            .ali-toggle input:checked + .ali-slider { background: #e62e04; }
            .ali-toggle input:checked + .ali-slider:before { transform: translateX(18px); }

            /* Editable value badges */
            .ali-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: #f4f4f4;
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 3px 8px;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                transition: background .15s;
            }
            .ali-badge:hover { background: #ffe0d9; border-color: #e62e04; color: #e62e04; }
            .ali-badge-icon { font-size: 10px; opacity: .7; }

            .ali-footer {
                border-top: 1px solid #eee;
                padding: 8px 14px;
                font-size: 11px;
                color: #aaa;
                text-align: center;
            }
        `);

        // FAB button
        const fab = document.createElement('div');
        fab.id = 'ali-switcher-fab';
        fab.title = 'AliExpress Global Switcher';
        fab.textContent = '🌐';
        document.body.appendChild(fab);

        // Panel
        const panel = document.createElement('div');
        panel.id = 'ali-switcher-panel';
        panel.innerHTML = `
            <div class="ali-panel-header">🌐 AliExpress Global Switcher</div>
            <div class="ali-panel-body">

                <div class="ali-row">
                    <div>
                        <div class="ali-label">Global mode</div>
                        <div class="ali-sub">Auto-redirect .ru → .com</div>
                    </div>
                    <label class="ali-toggle">
                        <input type="checkbox" id="ali-toggle-global" ${globalMode ? 'checked' : ''}>
                        <span class="ali-slider"></span>
                    </label>
                </div>

                <div class="ali-row">
                    <div>
                        <div class="ali-label">Currency</div>
                        <div class="ali-sub">3-letter code (e.g. USD)</div>
                    </div>
                    <span class="ali-badge" id="ali-badge-currency">
                        <span id="ali-val-currency">${currency}</span>
                        <span class="ali-badge-icon">✏️</span>
                    </span>
                </div>

                <div class="ali-row">
                    <div>
                        <div class="ali-label">Region</div>
                        <div class="ali-sub">2-letter ISO code (e.g. US)</div>
                    </div>
                    <span class="ali-badge" id="ali-badge-region">
                        <span id="ali-val-region">${region.toUpperCase()}</span>
                        <span class="ali-badge-icon">✏️</span>
                    </span>
                </div>

            </div>
            <div class="ali-footer">Changes apply on next page load</div>
        `;
        document.body.appendChild(panel);

        // Toggle FAB open/close
        fab.addEventListener('click', function (e) {
            e.stopPropagation();
            panel.classList.toggle('open');
        });
        document.addEventListener('click', function (e) {
            if (!panel.contains(e.target) && e.target !== fab) {
                panel.classList.remove('open');
            }
        });

        // Global mode toggle
        document.getElementById('ali-toggle-global').addEventListener('change', function () {
            globalMode = this.checked;
            GM_setValue('globalMode', globalMode);
        });

        // Currency badge click → inline prompt
        document.getElementById('ali-badge-currency').addEventListener('click', function () {
            var val = prompt('Enter 3-letter currency code (e.g. USD, EUR, GBP):', currency);
            if (val && val.trim().length >= 3) {
                currency = val.trim().toUpperCase();
                document.getElementById('ali-val-currency').textContent = currency;
                saveAndReload('currency', currency);
            }
        });

        // Region badge click → inline prompt
        document.getElementById('ali-badge-region').addEventListener('click', function () {
            var val = prompt('Enter 2-letter ISO country code (e.g. US, DE, GB, FR):', region.toUpperCase());
            if (val && val.trim().length >= 2) {
                region = val.trim().toLowerCase();
                document.getElementById('ali-val-region').textContent = region.toUpperCase();
                saveAndReload('region', region);
            }
        });
    }

})();
