// ==UserScript==
// @name         Stormsend 语种 Tab 右侧悬浮
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  将 Stormsend 后台的语种切换 Tab 固定在页面右侧，可上下拖动调整位置
// @author       You
// @match        https://stormsend.djiits.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'stormsendLangTabTopPos';
    const SELECTOR = '.form-lang-group';
    let isDragging = false;
    let offsetY;
    let hasInitialized = false;

    // 1. 注入 CSS
    const addStyles = () => {
        if (document.getElementById('stormsend-tab-style')) return;
        const style = document.createElement('style');
        style.id = 'stormsend-tab-style';
        style.textContent = `
            /* 固定在屏幕右侧边缘 */
            ul.form-lang-group.stormsend-fixed-tab {
                position: fixed !important;
                right: 0 !important;
                left: auto !important;
                z-index: 2147483647 !important;
                margin: 0 !important;
                box-shadow: -4px 4px 16px rgba(0,0,0,0.2) !important;
                background-color: #ffffff !important;
                /* 只有左侧有圆角，右侧贴边 */
                border-radius: 8px 0 0 8px !important;
                border: 1px solid #e2e8f0 !important;
                border-right: none !important;
                transform: none !important;
                transition: box-shadow 0.2s ease;
                overflow: hidden !important;
                padding-top: 0 !important;
                /* flex 列布局，支持把手 order */
                display: flex !important;
                flex-direction: column !important;
            }

            ul.form-lang-group.stormsend-fixed-tab:hover {
                box-shadow: -6px 6px 20px rgba(0,0,0,0.28) !important;
            }

            /* 上下拖动把手 */
            .stormsend-drag-handle {
                width: 100%;
                height: 22px;
                background-color: #f1f5f9;
                cursor: ns-resize; /* 上下双向箭头，暗示只能上下拖 */
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
                border-bottom: 1px solid #cbd5e1;
                order: -1;
                flex-shrink: 0;
            }

            .stormsend-drag-handle:hover {
                background-color: #e8edf2;
            }

            .stormsend-drag-handle:active {
                cursor: ns-resize;
                background-color: #dde3ea;
            }

            /* 把手图标：上下箭头 */
            .stormsend-drag-handle::after {
                content: "⠿";
                color: #94a3b8;
                font-size: 14px;
                line-height: 1;
                letter-spacing: 2px;
            }
        `;
        document.head.appendChild(style);
    };

    // 2. 初始化逻辑
    const initFixed = (element) => {
        if (hasInitialized || element.classList.contains('stormsend-fixed-tab')) return;

        console.log('[Stormsend Tab] 找到目标元素，初始化右侧固定...');

        // 插入把手
        const handle = document.createElement('div');
        handle.className = 'stormsend-drag-handle';
        handle.title = '上下拖动调整位置';
        element.insertBefore(handle, element.firstChild);

        element.classList.add('stormsend-fixed-tab');
        hasInitialized = true;

        // 读取保存的垂直位置，默认垂直居中
        const savedTop = GM_getValue(STORAGE_KEY, null);
        if (savedTop !== null) {
            element.style.top = savedTop + 'px';
        } else {
            // 默认垂直居中
            const defaultTop = Math.max(0, Math.round((window.innerHeight - element.offsetHeight) / 2));
            element.style.top = defaultTop + 'px';
        }

        // 仅上下拖拽事件
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = element.getBoundingClientRect();
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            let newTop = e.clientY - offsetY;

            // 限制在屏幕上下范围内
            const maxTop = window.innerHeight - element.offsetHeight;
            newTop = Math.max(0, Math.min(newTop, maxTop));

            element.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                // 保存垂直位置
                const top = parseInt(element.style.top, 10);
                if (!isNaN(top)) {
                    GM_setValue(STORAGE_KEY, top);
                    console.log('[Stormsend Tab] 垂直位置已保存:', top);
                }
            }
        });
    };

    // 3. 元素检测（三重策略）
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
                // 找到后不 disconnect，以防 SPA 路由跳转后重新渲染
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
