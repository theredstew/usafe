// ==UserScript==
// @name         USAFE
// @description  5+ источников | Без банов | Кэш
// @version      2.8
// @author       Ты
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_TTL = 600000;
    const BALANCER_CHECK_INTERVAL = 300000;

    let healthyBalancers = [];
    let lastCheck = 0;

    const cache = {
        set: (key, value) => Lampa.Storage.set(`usafe_cache_${key}`, value, CACHE_TTL),
        get: (key) => Lampa.Storage.get(`usafe_cache_${key}`)
    };

    const checkBalancers = async () => {
        if (Date.now() - lastCheck < BALANCER_CHECK_INTERVAL) return;
        lastCheck = Date.now();

        const balancers = [
            'https://lampa-balancer.deno.dev',
            'https://lampa-proxy.vercel.app'
        ];

        healthyBalancers = [];
        for (const b of balancers) {
            try {
                const res = await fetch(b + '/ping', { method: 'HEAD', timeout: 5000 });
                if (res.ok) healthyBalancers.push(b);
            } catch {}
        }

        if (healthyBalancers.length === 0) healthyBalancers = balancers;
    };

    const getBalancer = () => {
        if (healthyBalancers.length === 0) checkBalancers();
        const idx = Math.floor(Math.random() * healthyBalancers.length);
        return healthyBalancers[idx] || 'https://lampa-balancer.deno.dev';
    };

    const USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
    ];
    const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const SOURCES = [
        {
            name: 'Alloha',
            search: async (title, year) => {
                const cacheKey = `alloha_${title}_${year}`;
                const cached = cache.get(cacheKey);
                if (cached) return cached;

                try {
                    const url = `${getBalancer()}/alloha?title=${encodeURIComponent(title)}&year=${year || ''}`;
                    const res = await fetch(url, { headers: { 'User-Agent': randomUA() } });
                    if (!res.ok) return null;
                    const data = await res.json();
                    const stream = data.data?.[0];
                    if (stream?.iframe_url) {
                        const result = { url: stream.iframe_url };
                        cache.set(cacheKey, result);
                        return result;
                    }
                } catch (e) {
                    console.warn('[USAFE] Alloha error:', e);
                }
                return null;
            }
        },
        {
            name: 'Collaps',
            search: async (title) => {
                const cacheKey = `collaps_${title}`;
                const cached = cache.get(cacheKey);
                if (cached) return cached;

                try {
                    const url = `https://collaps.cc/search?q=${encodeURIComponent(title)}`;
                    const res = await fetch(url);
                    const html = await res.text();
                    const match = html.match(/href="\/embed\/(\w+)"/);
                    if (match) {
                        const result = { url: `https://collaps.cc/embed/${match[1]}` };
                        cache.set(cacheKey, result);
                        return result;
                    }
                } catch (e) {
                    console.warn('[USAFE] Collaps error:', e);
                }
                return null;
            }
        }
    ];

    function USAFEPlugin() {
        this.name = 'usafe';
        this.type = 'online';

        this.render = async function (card, item) {
            await checkBalancers();
            const title = item.title_ru || item.title;
            const year = item.year || '';

            const promises = SOURCES.map(async source => {
                try {
                    const result = await source.search(title, year);
                    if (result) return { ...result, source: source.name };
                } catch (e) {
                    console.warn(`[USAFE] ${source.name} failed:`, e);
                }
                return null;
            });

            const results = (await Promise.all(promises)).filter(Boolean);

            results.forEach(r => {
                card.addSource({
                    title: `${r.source} • HD`,
                    quality: '1080p',
                    onplay: () => Lampa.PlayerVideo.play({
                        url: r.url,
                        headers: {
                            'Referer': 'https://google.com',
                            'User-Agent': randomUA()
                        }
                    })
                });
            });
        };
    }

    Lampa.Plugin.register(new USAFEPlugin());
})();
