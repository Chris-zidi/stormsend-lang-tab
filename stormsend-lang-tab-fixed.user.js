// ==UserScript==
// @name         Stormsend 语种 Tab 悬浮拖拽
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  将 Stormsend 后台的语种切换 Tab 变为可拖拽的悬浮窗
// @author       You
// @match        https://stormsend.djiits.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'stormsendLangTabPos';
    const SELECTOR = '.form-lang-group';
    let isDragging = false;
    let offsetX, offsetY;
    let hasInitialized = false; // 防止重复初始化

    // 1. 注入强力 CSS
    const addStyles = () => {
        if (document.getElementById('stormsend-tab-style')) return;
        const style = document.createElement('style');
        style.id = 'stormsend-tab-style';
        style.textContent = `
            /* 强制覆盖原有定位 */
            ul.form-lang-group.stormsend-draggable-tab {
                position: fixed !important;
                z-index: 2147483647 !important; /* 极致的顶层 */
                margin: 0 !important;
                box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important;
                background-color: #ffffff !important;
                border-radius: 6px !important;
                border: 1px solid #e2e8f0 !important;
                transform: none !important;
                transition: box-shadow 0.2s ease;
                /* 确保内部元素不超出 */
                overflow: hidden !important;
                /* 稍微调整 padding 让它看起来更像一个悬浮面板 */
                padding-top: 0 !important;
            }

            ul.form-lang-group.stormsend-draggable-tab:hover {
                 box-shadow: 0 12px 32px rgba(0,0,0,0.3) !important;
            }

            /* 拖拽把手 - 放在列表的最上方 */
            .stormsend-drag-handle {
                width: 100%;
                height: 24px;
                background-color: #f1f5f9;
                cursor: grab;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
                border-bottom: 1px solid #cbd5e1;
                /* 确保把手在第一位 */
                order: -1;
            }
            /* Flex 布局支持 order 属性 */
            ul.form-lang-group.stormsend-draggable-tab {
                display: flex !important;
                flex-direction: column !important;
            }

            .stormsend-drag-handle:active {
                cursor: grabbing;
                background-color: #e2e8f0;
            }

            /* 拖拽把手上的小图标 (三条线) */
            .stormsend-drag-handle::after {
                content: "≡";
                color: #64748b;
                font-size: 16px;
                font-weight: bold;
                line-height: 1;
            }
        `;
        document.head.appendChild(style);
    };

    // 2. 初始化拖拽逻辑
    const initDraggable = (element) => {
        if (hasInitialized || element.classList.contains('stormsend-draggable-tab')) return;

        console.log('[Stormsend Tab] 找到目标元素，开始初始化拖拽...');

        // 插入拖拽把手
        const handle = document.createElement('div');
        handle.className = 'stormsend-drag-handle';
        handle.title = "按住拖动";
        element.insertBefore(handle, element.firstChild);

        element.classList.add('stormsend-draggable-tab');
        hasInitialized = true;

        // 设置初始位置或读取保存的位置
        const savedPos = GM_getValue(STORAGE_KEY, null);
        if (savedPos && savedPos.left && savedPos.top) {
            element.style.right = 'auto'; // 清除 right，以 left 为准
            element.style.left = savedPos.left + 'px';
            element.style.top = savedPos.top + 'px';
        } else {
            // 默认放在右侧靠中间的位置
            element.style.right = '20px';
            element.style.top = '150px';
            element.style.left = 'auto';
        }

        // 拖拽事件监听
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = element.getBoundingClientRect();
            // 计算鼠标点击点距离元素左上角的偏移量
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault(); // 防止选中文本
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            // 限制在屏幕范围内
            const maxLeft = window.innerWidth - element.offsetWidth;
            const maxTop = window.innerHeight - element.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            element.style.right = 'auto';
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                // 确保有 left 和 top 值再保存
                if (element.style.left && element.style.top) {
                    GM_setValue(STORAGE_KEY, {
                        left: parseInt(element.style.left, 10),
                        top: parseInt(element.style.top, 10)
                    });
                    console.log('[Stormsend Tab] 位置已保存');
                }
            }
        });
    };

    // 3. 寻找元素的策略 (轮询 + Observer 结合，更稳健)
    addStyles();

    const checkForElement = () => {
        const target = document.querySelector(SELECTOR);
        if (target && !hasInitialized) {
            initDraggable(target);
            return true;
        }
        return false;
    };

    // 先尝试直接查找
    if (!checkForElement()) {
        // 如果没找到，开启 MutationObserver 监听 DOM 变化
        const observer = new MutationObserver(() => {
            if (checkForElement()) {
                // 找到并初始化后，可以选择断开观察器以节省性能
                // observer.disconnect();
                // 注：如果不确定页面会不会路由跳转后重新渲染 Tab，可以不 disconnect
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // 补充一个保险策略：前 10 秒内每秒检查一次（应对某些奇怪的异步加载）
        let attempts = 0;
        const intervalId = setInterval(() => {
            attempts++;
            if (checkForElement() || attempts > 10) {
                clearInterval(intervalId);
            }
        }, 1000);
    }

})();