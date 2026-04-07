// ==UserScript==
// @name         Stormsend 语种 Tab 右侧悬浮
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  将 Stormsend 后台的语种切换 Tab 固定在页面右侧中心，随页面滚动。
// @author       You
// @match        https://stormsend.djiits.com/*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const SELECTOR = '.form-lang-group';
    let hasInitialized = false;

    // 1. 注入悬浮 CSS
    const addStyles = () => {
        if (document.getElementById('stormsend-tab-style-fixed')) return;
        const style = document.createElement('style');
        style.id = 'stormsend-tab-style-fixed';
        style.textContent = `
            /* 强制覆盖原有定位，使其固定在右侧中间 */
            ul.form-lang-group.stormsend-fixed-tab {
                position: fixed !important;
                top: 50% !important; /* 垂直居中 */
                right: 20px !important; /* 距离右边距 20px */
                transform: translateY(-50%) !important; /* 调整 Y 轴偏移实现真正的垂直居中 */
                z-index: 2147483647 !important; /* 极致的顶层 */
                margin: 0 !important;
                box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
                background-color: #ffffff !important;
                border-radius: 6px !important;
                border: 1px solid #e2e8f0 !important;
                transition: box-shadow 0.2s ease, right 0.2s ease;
                /* 确保内部元素不超出 */
                overflow: hidden !important;
            }
            
            ul.form-lang-group.stormsend-fixed-tab:hover {
                 box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important;
                 right: 25px !important; /* 鼠标悬停时稍微左移一点点，增加互动感 */
            }
        `;
        document.head.appendChild(style);
    };

    // 2. 初始化固定逻辑
    const initFixed = (element) => {
        if (hasInitialized || element.classList.contains('stormsend-fixed-tab')) return;
        
        console.log('[Stormsend Tab] 找到目标元素，应用右侧固定样式...');
        element.classList.add('stormsend-fixed-tab');
        hasInitialized = true;
    };

    // 3. 寻找元素的策略 (轮询 + Observer)
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
                // 找到后可以停止观察，节省性能
                observer.disconnect(); 
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // 应对可能的异步延迟
        let attempts = 0;
        const intervalId = setInterval(() => {
            attempts++;
            if (checkForElement() || attempts > 10) {
                clearInterval(intervalId);
            }
        }, 1000);
    }
})();