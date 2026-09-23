// Судовой журнал: кэш файлов приложения, не резервная копия записей.
var CACHE_PREFIX = "pax-log-cache-";
var CACHE_NAME = CACHE_PREFIX + "v3-safety-20260918";
var CORE_ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", function(event){
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache){
    return cache.addAll(CORE_ASSETS);
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(event){
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(key){
      return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME;
    }).map(function(key){ return caches.delete(key); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(event){
  var url = new URL(event.request.url);
  var scope = new URL(self.registration.scope);
  if(event.request.method !== "GET" || url.origin !== scope.origin || url.pathname.indexOf(scope.pathname) !== 0) return;
  // Keep cached releases coherent; refresh only the app's known core files.
  if(!CORE_ASSETS.some(function(asset){ return new URL(asset, scope).href === url.href; })) return;
  var cached = caches.open(CACHE_NAME).then(function(cache){ return cache.match(event.request); });
  var network = fetch(event.request).then(function(response){
    if(!response || response.status !== 200) throw new Error("Network response unavailable");
    var copy = response.clone();
    var update = caches.open(CACHE_NAME).then(function(cache){ return cache.put(event.request, copy); });
    return update.catch(function(){}).then(function(){ return response; });
  });
  event.waitUntil(network.then(function(){}, function(){}));
  event.respondWith(network.catch(function(){
    return cached.then(function(response){ return response || Response.error(); });
  }));
});
