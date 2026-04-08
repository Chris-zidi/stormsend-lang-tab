// ==UserScript==
// @name         Stormsend 语种 Tab 右侧固定
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  将 Stormsend 后台的语种切换 Tab 固定在屏幕右侧。修复了位置乱跑、样式丢失和无法点击的问题。
// @author       You
// @match        https://stormsend.djiits.com/*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const SELECTOR = '.form-lang-group';
    
    let targetElement = null;
    let animationFrameId = null;
    let lastLeft = null;
    let lastTop = null;

    // 1. 注入 CSS
    const addStyles = () => {
        if (document.getElementById('stormsend-tab-style')) return;
        const style = document.createElement('style');
        style.id = 'stormsend-tab-style';
        style.textContent = `
            /* 使用绝对定位，通过JS动态计算位置来模拟 fixed，解决 transform 导致的 fixed 失效问题 */
            ul.form-lang-group.stormsend-fixed-tab {
                position: absolute !important;
                z-index: 2147483647 !important;
                margin: 0 !important;
                box-shadow: -4px 0 16px rgba(0,0,0,0.15) !important;
                background-color: #ffffff !important;
                /* 左侧圆角，右侧贴边无圆角 */
                border-radius: 8px 0 0 8px !important;
                border: 1px solid #e2e8f0 !important;
                border-right: none !important;
                padding: 4px 0 !important;
                /* 超出屏幕高度时内部可滚动 */
                max-height: 80vh !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                /* 取消 left/top 的过渡动画，确保随滚动时没有延迟感 */
                transition: box-shadow 0.2s ease !important;
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

    // 2. JS 动态计算位置以模拟 fixed 定位
    const updatePosition = () => {
        // 如果元素丢失或被从DOM中移除，停止更新
        if (!targetElement || !document.contains(targetElement)) {
            targetElement = null;
            return;
        }

        // 如果元素处于隐藏状态（例如 display: none），暂不更新
        if (targetElement.offsetWidth === 0 || targetElement.offsetHeight === 0) {
            animationFrameId = requestAnimationFrame(updatePosition);
            return;
        }

        const offsetParent = targetElement.offsetParent || document.documentElement;
        const parentRect = offsetParent.getBoundingClientRect();
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const elWidth = targetElement.offsetWidth;
        const elHeight = targetElement.offsetHeight;
        
        // 计算目标元素相对于其 offsetParent 的 left 和 top
        // 让元素的右边缘贴紧视口右边缘
        const desiredLeft = viewportWidth - parentRect.left - elWidth;
        // 让元素垂直居中于视口
        const desiredTop = (viewportHeight / 2) - parentRect.top - (elHeight / 2);
        
        // 使用 Math.round 避免出现小数点导致的像素抖动
        const roundLeft = Math.round(desiredLeft);
        const roundTop = Math.round(desiredTop);

        // 只有位置发生变化时才修改 DOM，提升性能
        if (lastLeft !== roundLeft) {
            targetElement.style.left = \`\${roundLeft}px\`;
            targetElement.style.right = 'auto'; // 覆盖原有 right
            lastLeft = roundLeft;
        }
        
        if (lastTop !== roundTop) {
            targetElement.style.top = \`\${roundTop}px\`;
            targetElement.style.bottom = 'auto'; // 覆盖原有 bottom
            lastTop = roundTop;
        }

        // 持续下一帧更新
        animationFrameId = requestAnimationFrame(updatePosition);
    };

    // 3. 初始化并接管目标元素
    const initFixed = (element) => {
        if (element.classList.contains('stormsend-fixed-tab')) return;
        
        console.log('[Stormsend Tab] 找到目标元素，使用原生位置 + JS 动态定位');
        
        // 重置旧的动画帧和状态
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        targetElement = element;
        lastLeft = null;
        lastTop = null;
        
        element.classList.add('stormsend-fixed-tab');
        
        // 开启渲染循环
        updatePosition();
    };

    // 4. 监听元素出现
    addStyles();

    const checkForElement = () => {
        // 由于是 SPA，随时可能重新渲染新的 DOM
        const target = document.querySelector(SELECTOR);
        // 如果找到了目标元素，并且它不是当前正在追踪的元素
        if (target && target !== targetElement) {
            initFixed(target);
            return true;
        }
        return false;
    };

    // 立即检查一次
    checkForElement();

    // 持续监听 DOM 变化 (防 SPA 路由切换)
    const observer = new MutationObserver(() => {
        checkForElement();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

})();
