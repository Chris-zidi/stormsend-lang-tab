// ==UserScript==
// @name         Stormsend 语种 Tab 右侧固定
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  将 Stormsend 后台的语种切换 Tab 固定在屏幕右侧，始终可见，超出屏幕高度时内部可滚动
// @author       You
// @match        https://stormsend.djiits.com/*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const SELECTOR = '.form-lang-group';
    let hasInitialized = false;

    // 1. 注入 CSS
    const addStyles = () => {
        if (document.getElementById('stormsend-tab-style')) return;
        const style = document.createElement('style');
        style.id = 'stormsend-tab-style';
        style.textContent = `
            /* 固定在屏幕右侧，垂直居中 */
            ul.form-lang-group.stormsend-fixed-tab {
                position: fixed !important;
                right: 0 !important;
                left: auto !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                z-index: 2147483647 !important;
                margin: 0 !important;
                box-shadow: -4px 0 16px rgba(0,0,0,0.15) !important;
                background-color: #ffffff !important;
                /* 左侧圆角，右侧贴边无圆角 */
                border-radius: 8px 0 0 8px !important;
                border: 1px solid #e2e8f0 !important;
                border-right: none !important;
                transition: box-shadow 0.2s ease;
                padding: 4px 0 !important;
                /* 超出屏幕高度时内部可滚动 */
                max-height: 80vh !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }

            ul.form-lang-group.stormsend-fixed-tab:hover {
                box-shadow: -6px 0 20px rgba(0,0,0,0.22) !important;
            }

            /* 美化内部滚动条 */
            ul.form-lang-group.stormsend-fixed-tab::-webkit-scrollbar {
                width: 4px;
            }
            ul.form-lang-group.stormsend-fixed-tab::-webkit-scrollbar-track {
                background: transparent;
            }
            ul.form-lang-group.stormsend-fixed-tab::-webkit-scrollbar-thumb {
                background-color: #cbd5e1;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    };

    // 2. 初始化：只需要加 class 即可，CSS 搞定一切
    const initFixed = (element) => {
        if (hasInitialized || element.classList.contains('stormsend-fixed-tab')) return;
        console.log('[Stormsend Tab] 找到目标元素，固定到右侧');
        element.classList.add('stormsend-fixed-tab');
        hasInitialized = true;
    };

    // 3. 元素检测
    addStyles();

    const checkForElement = () => {
        const target = document.querySelector(SELECTOR);
        if (target && !hasInitialized) {
            initFixed(target);
            return true;
        }
        return false;
    };

    if (!checkForElement()) {
        const observer = new MutationObserver(() => {
            if (checkForElement()) {
                // 不 disconnect，防 SPA 路由重渲染
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        let attempts = 0;
        const intervalId = setInterval(() => {
            attempts++;
            if (checkForElement() || attempts > 10) {
                clearInterval(intervalId);
            }
        }, 1000);
    }

})();
