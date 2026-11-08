// Shared helpers for the DEMO partner pages: they react to MƏNƏ UYĞUN preferences (type-B settings
// that a real service would implement itself: longer sessions, confirmations, step-by-step, plain language).
(function () {
  var listeners = [];
  window.Demo = {
    prefs: null,
    onPrefs: function (cb) { listeners.push(cb); if (window.Demo.prefs) cb(window.Demo.prefs); },
    say: function (text) { if (window.Demo.prefs && window.Demo.prefs.tts && window.MeneUygun) window.MeneUygun.speak(text).catch(function () {}); },
    /** Session countdown; extendedTimeouts → 30 minutes and a "continue" button before it ends. */
    session: function (el, seconds) {
      var left = seconds;
      function fmt(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
      setInterval(function () {
        left = Math.max(0, left - 1);
        el.textContent = left > 0 ? "Sessiya " + fmt(left) + " sonra bitəcək" : "Sessiya bitdi — yenidən daxil olun";
      }, 1000);
      window.Demo.onPrefs(function (p) { if (p.extendedTimeouts && left < 1800) left = 1800; });
    },
    /** Confirmation dialog in plain words (confirmActions). Calls done() when the user agrees. */
    confirm: function (text, done) {
      var p = window.Demo.prefs;
      if (!p || !p.confirmActions) return done();
      var box = document.createElement("div");
      box.setAttribute("role", "alertdialog");
      box.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center;z-index:1000";
      box.innerHTML = '<div style="background:#fff;color:#111;max-width:30em;margin:1em;padding:1.4em;border-radius:1em;font:1.1em/1.5 system-ui,sans-serif">' +
        '<b style="display:block;font-size:1.2em;margin-bottom:.5em">Əminsiniz?</b><p></p>' +
        '<div style="display:flex;gap:.6em;margin-top:1em"><button data-yes style="flex:1;min-height:3em;border:0;border-radius:.6em;background:#2e7d32;color:#fff;font:inherit;font-weight:700">Bəli, düzdür</button>' +
        '<button data-no style="flex:1;min-height:3em;border:2px solid #555;border-radius:.6em;background:#fff;font:inherit">Xeyr, geri</button></div></div>';
      box.querySelector("p").textContent = text;
      document.body.appendChild(box);
      window.Demo.say("Əminsiniz? " + text);
      box.querySelector("[data-yes]").onclick = function () { box.remove(); done(); };
      box.querySelector("[data-no]").onclick = function () { box.remove(); };
      box.querySelector("[data-yes]").focus();
    },
    /** Shows a message; visualAlerts → big on-screen banner instead of a sound/alert. */
    notify: function (text) {
      var p = window.Demo.prefs;
      if (p && p.visualAlerts) {
        var t = document.createElement("div");
        t.setAttribute("role", "status");
        t.style.cssText = "position:fixed;top:1em;left:50%;transform:translateX(-50%);background:#1b5e20;color:#fff;padding:1em 1.4em;border-radius:.8em;font:1.2em system-ui,sans-serif;z-index:1001;box-shadow:0 8px 30px rgba(0,0,0,.3)";
        t.textContent = text;
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 4000);
      } else {
        alert(text);
      }
      window.Demo.say(text);
    },
  };
  document.addEventListener("meneuygun:preferences", function (e) {
    window.Demo.prefs = e.detail;
    listeners.forEach(function (cb) { cb(e.detail); });
  });
  document.addEventListener("meneuygun:disconnect", function () { window.Demo.prefs = null; });
})();
