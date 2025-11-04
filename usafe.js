// ==UserScript==
// @name         USAFE (5+ источников | Без банов | Кэш)
// @description  Alloha + Collaps + VoidBoost + Kinopub + Filmix
// @version      2.6
// @author       Ты
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_TTL = 600000;
    const BALANCER_CHECK_INTERVAL = 300000;
    const IP_API = 'https://api.ipify.org?format=json';

    let healthyBalancers = [];
    let lastCheck = 0;
    let userCountry = 'unknown';

    const cache = {
        set: (key, value) => Lampa.Storage.set(`usafe_cache_${key}`, value, CACHE_TTL),
        get: (key) => Lampa.Storage.get(`usafe_cache_${key}`)
    };

    const checkBalancers = async () => {
        if (Date.now() - lastCheck < BALANCER_CHECK_INTERVAL) return;
        lastCheck = Date.now();

        const balancers = [
            'https://lampa-balancer.deno.dev',
            '
