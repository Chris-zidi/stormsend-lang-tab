// ==UserScript==
// @name         Stormsend 语种Tab浮动切换
// @namespace    https://stormsend.djiits.com/
// @version      1.1
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
      background: #fff;
      border-radius: 8px 0 0 8px;
      box-shadow: -2px 2px 12px rgba(0, 0, 0, 0.2);
      padding: 4px 0;
      user-select: none;
      max-height: 80vh;
      overflow-y: auto;
      border-left: 3px solid #1890ff;
    }

    #ss-float-lang-panel .ss-lang-btn {
      display: block;
      width: 100%;
      padding: 6px 16px 6px 12px;
      border: none;
      background: #fff;
      color: #333;
      font-size: 13px;
      text-align: center;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
      line-height: 1.5;
      font-weight: 500;
    }

    #ss-float-lang-panel .ss-lang-btn:hover {
      background: #e6f7ff;
      color: #1890ff;
    }

    #ss-float-lang-panel .ss-lang-btn.ss-active {
      background: #1890ff;
      color: #fff;
      font-weight: bold;
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
   */
  function findOriginalTabs() {
    return document.querySelectorAll('ul.form-lang-group > li.form-lang[data-locale]');
  }

  /**
   * 切换语种 — 复刻原始 Tab 的 jQuery 事件逻辑：
   *   t = $(e.target);
   *   n = t.parents("form");
   *   n.removeClass(n.data("locale")).addClass(t.data("locale")).data("locale", t.data("locale"))
   *
   * 由于页面可能有多个 form（多个编辑区块），需要对所有相关 form 执行切换。
   */
  function switchLocale(newLocale) {
    // 找到所有包含 form-lang-group 的 form
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      // 只处理包含 locale 数据的 form
      const currentLocale = form.getAttribute('data-locale') ||
                            (typeof jQuery !== 'undefined' ? jQuery(form).data('locale') : null);
      if (!currentLocale) return;

      // 移除旧 locale class，添加新 locale class
      form.classList.remove(currentLocale);
      form.classList.add(newLocale);

      // 更新 data-locale（同时更新 DOM attribute 和 jQuery data）
      form.setAttribute('data-locale', newLocale);
      if (typeof jQuery !== 'undefined') {
        jQuery(form).data('locale', newLocale);
      }
    });

    // 同时更新原始 Tab 的选中态样式（触发原始 li 的 click 来同步原生 UI）
    const originalTab = document.querySelector(
      `ul.form-lang-group > li.form-lang[data-locale="${newLocale}"]`
    );
    if (originalTab) {
      originalTab.click();
    }
  }

  /**
   * 检测当前选中的语种
   * 从 form 的 data-locale / class 中读取
   */
  function detectActiveLocale() {
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      // 优先从 jQuery data 读取
      if (typeof jQuery !== 'undefined') {
        const jqLocale = jQuery(form).data('locale');
        if (jqLocale) return jqLocale;
      }
      // 其次从 attribute 读取
      const attrLocale = form.getAttribute('data-locale');
      if (attrLocale) return attrLocale;
    }
    return 'en';
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

    const activeLocale = detectActiveLocale();

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
        // 1. 执行语种切换（复刻原始逻辑）
        switchLocale(locale);

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
   * 同步浮动面板的高亮状态
   */
  function syncActiveState() {
    if (!floatPanel) return;

    const activeLocale = detectActiveLocale();

    floatPanel.querySelectorAll('.ss-lang-btn').forEach(btn => {
      if (btn.dataset.locale === activeLocale) {
        btn.classList.add('ss-active');
      } else {
        btn.classList.remove('ss-active');
      }
    });
  }

  /**
   * 监听原始Tab和form的变化，同步高亮
   */
  function observeChanges() {
    const tabContainer = document.querySelector('ul.form-lang-group');
    if (!tabContainer || observer) return;

    observer = new MutationObserver(() => {
      syncActiveState();
    });

    // 监听 Tab 容器的 class 变化
    observer.observe(tabContainer, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: true
    });

    // 监听所有 form 的 class 变化（语种切换会改 form 的 class）
    document.querySelectorAll('form').forEach(form => {
      if (form.getAttribute('data-locale') ||
          (typeof jQuery !== 'undefined' && jQuery(form).data('locale'))) {
        observer.observe(form, {
          attributes: true,
          attributeFilter: ['class']
        });
      }
    });

    // 给原始 Tab 加点击监听，确保浮动面板跟着同步
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
      observeChanges();
      return;
    }

    // Tab还没出现，等待DOM变化
    const bodyObserver = new MutationObserver(() => {
      const tabs = findOriginalTabs();
      if (tabs.length > 0) {
        bodyObserver.disconnect();
        createFloatPanel(tabs);
        observeChanges();
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
