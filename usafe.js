// ==UserScript==
// @name         USAFE
// @description  USAFE (без ошибок, как online_mod)
// @version      9.0
// @author       Ты + Grok
// ==/UserScript==

(function () {
    'use strict';

    // === Инициализация через Listener (как в online_mod) ===
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
            if (Lampa.Storage.field('online_mod_use')) return; // Конфликт

            var plugin = new USAFE();
            Lampa.Plugin.register(plugin);
            Lampa.Listener.send('online', { type: 'start', online: plugin });
        }
    });

    function USAFE() {
        this.name = 'usafe';
        this.type = 'online';

        // === Убрано this.activity.loader (ошибка) ===

        this.render = function (card, item) {
            return new Promise(function (resolve) {
                if (!item || !item.title) {
                    resolve();
                    return;
                }

                var title = item.title_ru || item.title;
                var year = item.year || '';
                var season = item.season || 1;
                var episode = item.episode || 1;

                // === Поиск через Lampa.Api (как в online_mod) ===
                Lampa.Api.search({
                    query: title + ' ' + year,
                    year: year
                }).then(function (data) {
                    if (!data.movie || !data.movie.results.length) {
                        resolve();
                        return;
                    }

                    var results = data.movie.results.slice(0, 3);
                    var promises = results.map(function (result) {
                        return fetch(getBalancer() + '/alloha?title=' + encodeURIComponent(result.title) + '&year=' + result.year, {
                            headers: { 'User-Agent': UA }
                        })
                        .then(r => r.ok ? r.json() : null)
                        .then(d => {
                            if (d && d.data && d.data[0] && d.data[0].iframe_url) {
                                return {
                                    url: d.data[0].iframe_url,
                                    quality: d.data[0].quality || '1080p'
                                };
                            }
                            return null;
                        })
                        .catch(() => null);
                    });

                    Promise.all(promises).then(function (sources) {
                        sources = sources.filter(Boolean);
                        sources.forEach(function (source) {
                            card.addSource({
                                title: 'USAFE • ' + source.quality,
                                quality: source.quality,
                                timeline: true,
                                onplay: function () {
                                    Lampa.PlayerVideo.play({
                                        url: source.url,
                                        type: 'iframe',
                                        headers: { 'Referer': 'https://google.com', 'User-Agent': UA }
                                    });
                                }
                            });
                        });
                        resolve();
                    }).catch(() => resolve());
                }).catch(() => resolve());
            });
        };
    }

    // === Балансер ===
    var getBalancer = function () {
        return ['https://lampa-balancer.deno.dev', 'https://lampa-proxy.vercel.app'][Math.floor(Math.random() * 2)];
    };
    var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
})();
