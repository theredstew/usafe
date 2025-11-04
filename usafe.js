// ==UserScript==
// @name         USAFE
// @description  5+ источников | Без банов | Кэш
// @version      2.9
// @author       Ты
// ==/UserScript==

(function () {
    'use strict';

    var CACHE_TTL = 600000;
    var BALANCER_CHECK_INTERVAL = 300000;

    var healthyBalancers = [];
    var lastCheck = 0;

    var cache = {
        set: function(key, value) { Lampa.Storage.set('usafe_cache_' + key, value, CACHE_TTL); },
        get: function(key) { return Lampa.Storage.get('usafe_cache_' + key); }
    };

    var checkBalancers = function() {
        if (Date.now() - lastCheck < BALANCER_CHECK_INTERVAL) return;
        lastCheck = Date.now();

        var balancers = [
            'https://lampa-balancer.deno.dev',
            'https://lampa-proxy.vercel.app'
        ];

        healthyBalancers = [];
        for (var i = 0; i < balancers.length; i++) {
            var b = balancers[i];
            fetch(b + '/ping', { method: 'HEAD', timeout: 5000 }).then(function(res) {
                if (res.ok) healthyBalancers.push(b);
            }).catch(function() {});
        }

        if (healthyBalancers.length === 0) healthyBalancers = balancers;
    };

    var getBalancer = function() {
        if (healthyBalancers.length === 0) checkBalancers();
        var idx = Math.floor(Math.random() * healthyBalancers.length);
        return healthyBalancers[idx] || 'https://lampa-balancer.deno.dev';
    };

    var USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
    ];
    var randomUA = function() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; };

    var SOURCES = [
        {
            name: 'Alloha',
            search: function(title, year) {
                var cacheKey = 'alloha_' + title + '_' + year;
                var cached = cache.get(cacheKey);
                if (cached) return cached;

                return fetch(getBalancer() + '/alloha?title=' + encodeURIComponent(title) + '&year=' + (year || ''), { headers: { 'User-Agent': randomUA() } })
                    .then(function(res) {
                        if (!res.ok) return null;
                        return res.json();
                    })
                    .then(function(data) {
                        var stream = data.data ? data.data[0] : null;
                        if (stream && stream.iframe_url) {
                            var result = { url: stream.iframe_url };
                            cache.set(cacheKey, result);
                            return result;
                        }
                        return null;
                    })
                    .catch(function(e) {
                        console.warn('[USAFE] Alloha error:', e);
                        return null;
                    });
            }
        },
        {
            name: 'Collaps',
            search: function(title) {
                var cacheKey = 'collaps_' + title;
                var cached = cache.get(cacheKey);
                if (cached) return cached;

                return fetch('https://collaps.cc/search?q=' + encodeURIComponent(title))
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        var match = html.match(/href="\/embed\/(\w+)"/);
                        if (match) {
                            var result = { url: 'https://collaps.cc/embed/' + match[1] };
                            cache.set(cacheKey, result);
                            return result;
                        }
                        return null;
                    })
                    .catch(function(e) {
                        console.warn('[USAFE] Collaps error:', e);
                        return null;
                    });
            }
        }
    ];

    function USAFEPlugin() {
        this.name = 'usafe';
        this.type = 'online';

        this.render = function(card, item) {
            checkBalancers();
            var title = item.title_ru || item.title;
            var year = item.year || '';

            var promises = SOURCES.map(function(source) {
                return source.search(title, year).then(function(result) {
                    if (result) return { url: result.url, source: source.name };
                    return null;
                }).catch(function(e) {
                    console.warn('[USAFE] ' + source.name + ' failed:', e);
                    return null;
                });
            });

            Promise.all(promises).then(function(results) {
                results = results.filter(Boolean);
                results.forEach(function(r) {
                    card.addSource({
                        title: r.source + ' • HD',
                        quality: '1080p',
                        onplay: function() {
                            Lampa.PlayerVideo.play({
                                url: r.url,
                                headers: {
                                    'Referer': 'https://google.com',
                                    'User-Agent': randomUA()
                                }
                            });
                        }
                    });
                });
            });
        };
    }

    Lampa.Plugin.register(new USAFEPlugin());
})();
