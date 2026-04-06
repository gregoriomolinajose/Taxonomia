/* ═══════════════════════════════════════════════════════
     JS_Core.html — Motor Logico Completo (Regla UI §14)
     CONTIENE: AuthManager, Sidebar §13, navegacion, dashboard,
               formatters, wizard, toast, theme
     Inyectado via: <?!= include('JS_Core'); ?>
  ═══════════════════════════════════════════════════════ */

  /* ── EventBus (S11.1/S23.3 Pub/Sub con native Auto-Debounce) ────────────────────────── */
  window.AppEventBus = {
    events: {},
    _cancellations: {},
    subscribe: function(event, callback) {
      if (!this.events[event]) this.events[event] = [];
      this.events[event].push(callback);
      return function() { window.AppEventBus.unsubscribe(event, callback); };
    },
    unsubscribe: function(event, callback) {
      if (!this.events[event]) return;
      this.events[event] = this.events[event].filter(function(cb) { return cb !== callback; });
    },
    publish: function(event, data) {
      if (!this.events[event]) return;
      this.events[event].forEach(function(callback) {
        try { callback(data); } catch(e) { console.error('AppEventBus Error [' + event + ']:', e); }
      });
    },
    publishDebounced: function(event, data, delayMs) {
      var parsed = parseInt(delayMs, 10);
      var threshold = (!isNaN(parsed) && parsed >= 0) ? parsed : 300;
      if (this._cancellations[event]) {
        clearTimeout(this._cancellations[event]);
      }
      var self = this;
      this._cancellations[event] = setTimeout(function() {
         self.publish(event, data);
         delete self._cancellations[event];
      }, threshold);
    }
  };

  /* ── Telemetry (S19.3 Telemetría y Límites) ──────────── */
  window.Telemetry = {
    _isTrackingFatal: false, // Prevents infinite recursion on WSOD
    
    /**
     * Registra un evento en el bus asíncrono y en consola local.
     * @param {string} action Nombre/Tag del evento
     * @param {any} [payload={}] Objeto con metadata
     * @param {"INFO"|"WARN"|"ERROR"|"FATAL"|"METRIC"} [level="INFO"] Severidad
     */
    track: function(action, payload, level) {
      if (level === 'FATAL') {
        if (this._isTrackingFatal) return; // Rompe el loop de window.onerror
        this._isTrackingFatal = true;
      }
      
      setTimeout(function() { // Fire and forget para no degradar UI Thread
        var safeLevel = level || 'INFO';
        var safeAction = action || 'UNKNOWN';
        var safePayload = window.Telemetry._sanitize(payload);
        var packet = {
          timestamp: new Date().toISOString(),
          level: safeLevel,
          action: safeAction,
          payload: safePayload || {}
        };
        
        // 1. Integración con consola local de desarrollo (Coloreado)
        if (safeLevel === 'ERROR' || safeLevel === 'FATAL') {
          console.error(`[Telemetry|${safeLevel}] ${safeAction}`, safePayload);
        } else if (safeLevel === 'WARN') {
          console.warn(`[Telemetry|WARN] ${safeAction}`, safePayload);
        } else {
          console.info(`[Telemetry|INFO] ${safeAction}`, safePayload);
        }

        // Liberar flag si era fatal (en caso de recuperación)
        if (safeLevel === 'FATAL') window.Telemetry._isTrackingFatal = false;

        // 2. Puerta de enlace con AppEventBus
        if (window.AppEventBus) {
          window.AppEventBus.publish('TELEMETRY::TRACK', packet);
        }
      }, 0);
    },
    /**
     * Sanitiza objetos truncando strings largos, omitiendo Node Elements, 
     * y rompiendo loops circulares para evitar colapso del EventBus.
     * @param {any} obj Payload original
     * @returns {any} Objeto puro JSON serializable
     */
    _sanitize: function(obj, maxDepth = 3) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Node) return '<DOM Element: ' + obj.tagName + '>';
      if (obj instanceof Error) return { message: obj.message, stack: obj.stack, name: obj.name };
      
      const seen = new WeakSet();
      function prune(value, depth) {
        if (value === null || typeof value !== 'object') return value;
        if (value instanceof Node) return '<DOM Element: ' + value.tagName + '>';
        if (value instanceof Error) return { message: value.message };
        if (depth <= 0) return '[Max Depth Reached]';
        
        if (seen.has(value)) return '[Circular Reference]';
        seen.add(value);
        
        let result = Array.isArray(value) ? [] : {};
        for (let key in value) {
          // Object.prototype.hasOwnProperty protection for safety
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            try {
              result[key] = prune(value[key], depth - 1);
            } catch(e) { result[key] = '[Access Denied]'; }
          }
        }
        return result;
      }
      return prune(obj, maxDepth);
    }
  };

  /* ── Core Utilities (S21.2) ──────────────────────────── */
  /**
   * Global Debounce utility for non-blocking UI interactions.
   * Prevents rapid consecutive executions of heavy operations (like filtering).
   */
  window.debounce = function(func, delay) {
    var timeoutId;
    var threshold = (delay !== undefined) ? delay : 300;
    return function() {
      var context = this;
      var args = arguments;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(function() {
        func.apply(context, args);
      }, threshold);
    };
  };

  /* ── Ionic UI Safe Wrappers (S19.2) ──────────────────── */
  window.PresentSafe = function(ionicElement) {
    if (!ionicElement || typeof ionicElement.present !== 'function') {
      return Promise.resolve();
    }
    return ionicElement.present().catch(function(err) {
      var errDetail = err ? (err.message || String(err)) : 'Unknown Promise Rejection';
      if (window.Telemetry && window.Telemetry.track) {
        window.Telemetry.track('IONIC_ANIMATION_WARN', errDetail, 'WARN');
      } else {
        console.warn('[PresentSafe] Cancelled present:', errDetail);
      }
    });
  };

  /* ── Dinamic Router (Movido a UI_Router.html en S12.2) ── */
  
  /* ── Sidebar Modes (Movido a UI_Router.html en S12.2) ── */

  /* ── Dashboard logic moved to Dashboard_UI.html ── */





  /* ── DOM Factory (S16 Micro-Framework) ── */
  window.DOM = {
    create: function(tag, attrs, children) {
      var el = document.createElement(tag);
      if (attrs) {
        for (var key in attrs) {
          if (key === 'class' || key === 'className') { el.className = attrs[key]; }
          else if (key === 'style') { el.style.cssText = attrs[key]; }
          else if (key.startsWith('on') && typeof attrs[key] === 'function') {
            var eventName = key.substring(2).toLowerCase();
            el.addEventListener(eventName, attrs[key]);
          }
          else { el.setAttribute(key, attrs[key]); }
        }
      }
      if (children) {
        var arr = Array.isArray(children) ? children : [children];
        arr.forEach(function(child) {
          if (child == null) return;
          if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(child));
          } else if (child instanceof Node) {
            el.appendChild(child);
          }
        });
      }
      return el;
    },
    clear: function(node) {
      if (!node) return;
      while(node.firstChild) { node.removeChild(node.firstChild); }
    }
  };

  /* ── DOMContentLoaded Bootstrap ─────────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    if (window.AuthManager) window.AuthManager.init();
    if (window.ThemeManager && window.ThemeManager.initThemeManager) window.ThemeManager.initThemeManager();
    
    // [S24.5] Universal Event Delegator (Migrated from inline window literals)
    document.addEventListener('click', function(e) {
      var actionEl = e.target.closest('[data-action]');
      
      // Auto-dismiss logic based on data-dismiss attribute
      var dismissEl = e.target.closest('[data-dismiss]');
      if (dismissEl) {
        var dismissTarget = dismissEl.getAttribute('data-dismiss');
        if (dismissTarget) {
          var popup = document.querySelector(dismissTarget);
          if (popup && typeof popup.dismiss === 'function') popup.dismiss();
        }
      }

      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');
      
      /**
       * [ARCHITECTURAL RULE - S24.5]
       * Este Switch map es EXCLUSIVO para Comandos Mundanos de la Application Shell
       * (Navegación top-level, Modales Globales y Fallbacks). 
       * PROHIBIDO registrar Módulos de Dominio aquí. Cualquier módulo debe subscribirse 
       * al 'DOM::CLICK_ACTION' vía window.AppEventBus para interceptar sus propios data-actions.
       */
      switch(action) {
        // Core Navigation & Shell
        case 'nav:reload': location.reload(); break;
        case 'nav:toggle-menu': if (typeof window.toggleDesktopMenu === 'function') window.toggleDesktopMenu(); break;
        case 'nav:dashboard': window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); break;
        case 'nav:designkit': window.AppEventBus.publish('NAV::CHANGE', {viewType: 'designkit'}); break;
        case 'nav:governance': window.AppEventBus.publish('NAV::CHANGE', {viewType: 'governance'}); break;
        
        // Theme & Session
        case 'theme:cycle': if (window.ThemeManager) window.ThemeManager.cycleTheme(); break;
        case 'theme:reset': if (typeof window.resetThemeEngine === 'function') window.resetThemeEngine(); break;
        case 'auth:logout': if (window.AuthManager) window.AuthManager.logout(); break;
        
        // Forms & Modals
        case 'form:cancel': if (typeof window.cancelForm === 'function') window.cancelForm(); break;
        case 'form:save': if (typeof window.saveForm === 'function') window.saveForm(); break;
        case 'modal:close': if (typeof window.closeModal === 'function') window.closeModal(); break;
        case 'test:modal': if (typeof window.openTestModal === 'function') window.openTestModal(); break;
        case 'test:modal-close': var el = document.getElementById('enterpriseModalTest'); if(el) el.dismiss(); break;

        // Tooltips & Specific Entities
        case 'profile:wip': window.showToast('Módulo Perfil en construcción'); break;
        
        default: 
          window.AppEventBus.publish('DOM::CLICK_ACTION', { action: action, element: actionEl });
          break;
      }
    });

    // Regla S11.1: EventBus Subscription para Router
    window.AppEventBus.subscribe('NAV::CHANGE', function(payload) {
      if (payload.viewType && window.UI_Router) {
        window.UI_Router.navigateTo(payload.viewType, payload.entityKey);
      }
    });

    window.sidebarState = parseInt(localStorage.getItem('sidebar_state')) || 0;
    window.applySidebarState();
    if (typeof window.renderDashboardCards === 'function') window.renderDashboardCards();
    var container = document.getElementById('app-container');
    if (container) {
        window.OriginalDashboardNode = document.createDocumentFragment();
        Array.from(container.childNodes).forEach(n => {
            window.OriginalDashboardNode.appendChild(n.cloneNode(true));
        });
    }
    setTimeout(function() {
      if (window.UI_Router) {
        window.UI_Router.showHomeSidebar();
      }
      
      if (window.UI_Router && typeof window.UI_Router.navigateTo === 'function') {
        window.UI_Router.navigateTo('dashboard');
      }
      window.AuthManager.init();
      
      if (window.AppEventBus) {
        window.AppEventBus.subscribe('APP::READY', function() {
          // [S22.5] Bottom Tab Bar Mobile Hydration (Zero-XSS)
          try {
            var tabBar = document.getElementById('mobile-tab-bar');
            if (tabBar) {
              var thumbZoneConfig = [
                { icon: 'home-outline', label: 'Inicio', action: function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); } },
                { icon: 'search-outline', label: 'Buscar', action: function() { var o = document.getElementById('global-omnibar'); if(o) o.setFocus(); } },
                { icon: 'apps-outline', label: 'Catálogo', action: function() { var m = document.querySelector('ion-menu'); if(m) m.open(); } },
                { icon: 'person-circle-outline', label: 'Perfil', action: function() { var p = document.getElementById('profile-popover'); if(p) p.present(); } }
              ];
              thumbZoneConfig.forEach(function(item) {
                var btn = window.DOM.create('ion-tab-button', { onclick: item.action }, [
                  window.DOM.create('ion-icon', { name: item.icon }),
                  window.DOM.create('ion-label', null, item.label)
                ]);
                tabBar.appendChild(btn);
              });
            }
          } catch(e) {
            console.warn('[S22.5] Error hydrating Bottom Tab Bar:', e);
          }

          // [S22.1] Profile Avatar & Dropdown Hydration
          try {
            const currentUser = (window.AuthManager && window.AuthManager.currentUser) ? window.AuthManager.currentUser : null;
            const userEmail = currentUser ? currentUser.email : '';
            const userName = (currentUser && currentUser.name) ? currentUser.name : (userEmail ? (typeof window.formatUserName === 'function' ? window.formatUserName(userEmail) : userEmail) : 'Usuario');
            const initChar = userName !== 'Usuario' ? userName.charAt(0).toUpperCase() : '?';
            const avatarBtn = document.getElementById('topbar-avatar');
            const avatarPop = document.getElementById('popover-avatar');
            const namePop = document.getElementById('popover-user-name');
            const rolePop = document.getElementById('popover-user-role');
            
            const picture = currentUser ? currentUser.picture : null;
            
            function bindAvatar(picUrl) {
                if (!picUrl || picUrl === 'pending') return;
                const imgHtm = `<img src="${picUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
                if (avatarBtn) { avatarBtn.innerHTML = imgHtm; avatarBtn.style.background = 'transparent'; }
                if (avatarPop) { avatarPop.innerHTML = imgHtm; avatarPop.style.background = 'transparent'; }
            }

            // Fallback síncrono inicial
            if (avatarBtn) { avatarBtn.innerText = initChar; avatarBtn.style.background = ''; }
            if (avatarPop) { avatarPop.innerText = initChar; avatarPop.style.background = ''; }
            
            if (picture) {
                bindAvatar(picture);
            } else if (userEmail) {
                if (!window.AvatarCache) window.AvatarCache = new Map();
                if (window.AvatarCache.has(userEmail)) {
                    bindAvatar(window.AvatarCache.get(userEmail));
                } else {
                    window.AvatarCache.set(userEmail, 'pending');
                    if (typeof google !== 'undefined' && google.script && google.script.run) {
                        google.script.run
                            .withSuccessHandler(function(url) {
                                window.AvatarCache.set(userEmail, url);
                                bindAvatar(url);
                            })
                            .withFailureHandler(function() {
                                window.AvatarCache.set(userEmail, null);
                            })
                            .getWorkspaceAvatar(userEmail);
                    }
                }
            }
            if (namePop) namePop.innerText = userName;

            if (window.ABAC && window.ABAC.context && rolePop) {
              var ctx = window.ABAC.context;
              var uiConfig = window._UI_CONFIG || (window.APP_SCHEMAS && window.APP_SCHEMAS._UI_CONFIG);
              var bMap = (uiConfig && uiConfig.badgeMap) ? uiConfig.badgeMap : {};

              if (window.ABAC.can('update', 'Sys_Permissions')) {
                 rolePop.innerText = 'Rol: Administrador';
                 var cAdmin = bMap.SYS_ADMIN || '#eb445a';
                 if(avatarBtn) avatarBtn.style.background = cAdmin;
                 if(avatarPop) avatarPop.style.background = cAdmin;
              } else {
                 // Securing Governance Node Visibility 
                 var btnGov = document.getElementById('popover-btn-governance');
                 if (btnGov) btnGov.style.display = 'none';
                 
                 if (ctx.ownerOf && ctx.ownerOf.length > 0) {
                   rolePop.innerText = 'Rol: Propietario';
                   var cOwner = bMap.OWNER || '#2dd36f';
                   if(avatarBtn) avatarBtn.style.background = cOwner;
                   if(avatarPop) avatarPop.style.background = cOwner;
                 } else if (ctx.memberOf && ctx.memberOf.length > 0) {
                   rolePop.innerText = 'Rol: Miembro';
                   var cMem = bMap.MEMBER || '#3880ff';
                   if(avatarBtn) avatarBtn.style.background = cMem;
                   if(avatarPop) avatarPop.style.background = cMem;
                 } else {
                   rolePop.innerText = 'Rol: Lector (Básico)';
                 }
              }
            }
          } catch(e) {
            console.warn && console.warn('[S22.1] Error hydrating Profile Dropdown:', e);
          }
        });
      }
    }); // Close setTimeout

  }); // Close DOMContentLoaded

  /* ── Modulos Transversales y Utils (S6.3) ──────── */