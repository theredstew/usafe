// ==UserScript==
// @name         USAFE
// @description  Alloha + Collaps для встроенного плеера Lampa
// @version      5.0
// @author       Ты
// ==/UserScript==

(function () {
    'use strict';

    // Ждём Lampa
    var init = function() {
        if (!window.Lampa || !Lampa.Plugin || !Lampa.PlayerVideo) {
            setTimeout(init, 100);
            return;
        }
        register();
    };

    var BALANCERS = ['https://lampa-balancer.deno.dev', 'https://lampa-proxy.vercel.app'];
    var getBalancer = function() { return BALANCERS[Math.floor(Math.random() * BALANCERS.length)]; };
    var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    function register() {
        function USAFE() {
            this.name = 'usafe';
            this.type = 'online';

            this.render = function(card, item) {
                return new Promise(function(resolve) {
                    var title = item.title_ru || item.title || '';
                    var year = item.year || '';

                    // Alloha (iframe)
                    fetch(getBalancer() + '/alloha?title=' + encodeURIComponent(title) + '&year=' + year, {
                        headers: { 'User-Agent': UA }
                    })
                    .then(function(r) { return r.ok ? r.json() : null; })
                    .then(function(d) {
                        if (d && d.data && d.data[0] && d.data[0].iframe_url) {
                            card.addSource({
                                title: 'Alloha • HD',
                                quality: '1080p',
                                onplay: function() {
                                    Lampa.PlayerVideo.play({
                                        url: d.data[0].iframe_url,
                                        type: 'iframe'
                                    });
                                }
                            });
                        }
                    })
                    .catch(function() {});

                    // Collaps (iframe)
                    fetch('https://collaps.cc/search?q=' + encodeURIComponent(title))
                    .then(function(r) { return r.text(); })
                    .then(function(h) {
                        var m = h.match(/href="\/embed\/(\w+)"/);
                        if (m) {
                            card.addSource({
                                title: 'Collaps • HD',
                                quality: '1080p',
                                onplay: function() {
                                    Lampa.PlayerVideo.play({
                                        url: 'https://collaps.cc/embed/' + m[1],
                                        type: 'iframe'
                                    });
                                }
                            });
                        }
                    })
                    .catch(function() {});

                    setTimeout(resolve, 300); // Дать время на добавление
                });
            };
        }

        Lampa.Plugin.register(new USAFE());
    }

    init();
})();
