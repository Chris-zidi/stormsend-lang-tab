// ==UserScript==
// @name         Stormsend 语种Tab浮动切换
// @namespace    https://stormsend.djiits.com/
// @version      1.0
// @description  将配置后台的语种切换Tab固定浮动在屏幕右侧，随时可点击切换语种
// @match        https://stormsend.djiits.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ========== 样式注入 ==========
  GM_addStyle(`
    #ss-float-lang-panel {
      position: fixed;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 999999;
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(6px);
      border-radius: 8px 0 0 8px;
      box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15);
      padding: 6px 0;
      opacity: 0.45;
      transition: opacity 0.2s ease, box-shadow 0.2s ease;
      user-select: none;
      max-height: 80vh;
      overflow-y: auto;
    }

    #ss-float-lang-panel:hover {
      opacity: 1;
      box-shadow: -3px 0 18px rgba(0, 0, 0, 0.25);
    }

    #ss-float-lang-panel .ss-lang-btn {
      display: block;
      width: 100%;
      padding: 5px 14px 5px 10px;
      border: none;
      background: transparent;
      color: #555;
      font-size: 12px;
      text-align: center;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
      line-height: 1.4;
    }

    #ss-float-lang-panel .ss-lang-btn:hover {
      background: rgba(66, 139, 202, 0.12);
      color: #337ab7;
    }

    #ss-float-lang-panel .ss-lang-btn.ss-active {
      background: #428bca;
      color: #fff;
      font-weight: bold;
      border-radius: 4px 0 0 4px;
    }

    /* 自定义滚动条 */
    #ss-float-lang-panel::-webkit-scrollbar {
      width: 3px;
    }
    #ss-float-lang-panel::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,0.2);
      border-radius: 2px;
    }
  `);

  // ========== 核心逻辑 ==========

  let floatPanel = null;
  let observer = null;

  /**
   * 找到页面中的原始语种Tab列表
   * 选择器: ul.form-lang-group > li.form-lang[data-locale]
   */
  function findOriginalTabs() {
    return document.querySelectorAll('ul.form-lang-group > li.form-lang[data-locale]');
  }

  /**
   * 检测当前哪个语种是选中状态
   * 策略：检查 li 的 class 中是否有 active/selected/current，
   * 或者检查计算样式（背景色是否为蓝色）
   */
  function detectActiveLocale(tabs) {
    for (const tab of tabs) {
      // 策略1：检查class
      if (tab.classList.contains('active') ||
          tab.classList.contains('selected') ||
          tab.classList.contains('current')) {
        return tab.dataset.locale;
      }

      // 策略2：检查计算样式（蓝色背景 = 选中）
      const bg = window.getComputedStyle(tab).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        // 有非透明背景色，可能是选中态
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          // 蓝色系判断 (b > r && b > g)
          if (b > r && b > g && b > 150) {
            return tab.dataset.locale;
          }
        }
      }
    }
    // 默认返回第一个
    return tabs[0]?.dataset.locale || 'en';
  }

  /**
   * 创建浮动面板
   */
  function createFloatPanel(tabs) {
    if (floatPanel) {
      floatPanel.remove();
    }

    floatPanel = document.createElement('div');
    floatPanel.id = 'ss-float-lang-panel';

    const activeLocale = detectActiveLocale(tabs);

    tabs.forEach(tab => {
      const locale = tab.dataset.locale;
      const text = tab.textContent.trim();

      const btn = document.createElement('button');
      btn.className = 'ss-lang-btn';
      btn.textContent = text;
      btn.dataset.locale = locale;

      if (locale === activeLocale) {
        btn.classList.add('ss-active');
      }

      btn.addEventListener('click', () => {
        // 1. 点击原始Tab
        const originalTab = document.querySelector(
          `ul.form-lang-group > li.form-lang[data-locale="${locale}"]`
        );
        if (originalTab) {
          originalTab.click();
        }

        // 2. 更新浮动面板高亮
        floatPanel.querySelectorAll('.ss-lang-btn').forEach(b => {
          b.classList.remove('ss-active');
        });
        btn.classList.add('ss-active');
      });

      floatPanel.appendChild(btn);
    });

    document.body.appendChild(floatPanel);
  }

  /**
   * 同步浮动面板的高亮状态（监听原始Tab变化）
   */
  function syncActiveState() {
    if (!floatPanel) return;

    const tabs = findOriginalTabs();
    const activeLocale = detectActiveLocale(tabs);

    floatPanel.querySelectorAll('.ss-lang-btn').forEach(btn => {
      if (btn.dataset.locale === activeLocale) {
        btn.classList.add('ss-active');
      } else {
        btn.classList.remove('ss-active');
      }
    });
  }

  /**
   * 监听原始Tab区域的DOM变化，同步高亮
   */
  function observeOriginalTabs() {
    const tabContainer = document.querySelector('ul.form-lang-group');
    if (!tabContainer || observer) return;

    observer = new MutationObserver(() => {
      syncActiveState();
    });

    observer.observe(tabContainer, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: true
    });

    // 同时给每个原始tab加点击监听，确保同步
    tabContainer.querySelectorAll('li.form-lang').forEach(li => {
      li.addEventListener('click', () => {
        setTimeout(syncActiveState, 50);
      });
    });
  }

  /**
   * 初始化：等待DOM中出现语种Tab后创建浮动面板
   */
  function init() {
    const tabs = findOriginalTabs();

    if (tabs.length > 0) {
      createFloatPanel(tabs);
      observeOriginalTabs();
      return;
    }

    // Tab还没出现，等待DOM变化
    const bodyObserver = new MutationObserver(() => {
      const tabs = findOriginalTabs();
      if (tabs.length > 0) {
        bodyObserver.disconnect();
        createFloatPanel(tabs);
        observeOriginalTabs();
      }
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 安全超时：30秒后停止等待
    setTimeout(() => {
      bodyObserver.disconnect();
    }, 30000);
  }

  // 启动
  init();
})();
