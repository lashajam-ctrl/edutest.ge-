(function registerEduTestServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (location.protocol !== "https:" && !local) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(function () {
      // Installation support is progressive enhancement; the website remains fully usable.
    });
  });
})();
