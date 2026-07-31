package com.dbtraining.reconx.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * ============================================================================
 * TICKET-ADV082 — Caffeine CacheManager with per-cache TTLs and recordStats()
 *
 * WHAT:    Declares two named Caffeine caches with different eviction policies:
 *           - instruments: 500 entries max, 5-minute TTL
 *           - counterparties: 200 entries max, 1-minute TTL
 * HOW:     Programmatic CacheManager using SimpleCacheManager + CaffeineCache
 *          wrappers instead of the single global caffeine.spec YAML key.
 *          recordStats() is required for Micrometer to expose
 *          cache_gets_total{result="hit|miss"} in /actuator/prometheus.
 * WHY:     Instrument data (reference data, stable) can tolerate a longer TTL.
 *          Counterparty data changes more often (credit events, name changes)
 *          so we evict it faster. Mixing them in one cache forces a compromise.
 * OBSERVE: /actuator/caches lists both "instruments" and "counterparties".
 *          After a warm read, /actuator/prometheus exposes:
 *            cache_gets_total{cache="instruments",result="hit"}
 * ============================================================================
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        // TICKET-ADV081/ADV082 — instruments cache: 5-minute TTL, max 500 entries
        CaffeineCache instruments = new CaffeineCache("instruments",
                Caffeine.newBuilder()
                        .maximumSize(500)
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .recordStats()   // exposes cache_gets_total to Micrometer
                        .build());

        // TICKET-ADV082 — counterparties cache: 1-minute TTL, max 200 entries
        CaffeineCache counterparties = new CaffeineCache("counterparties",
                Caffeine.newBuilder()
                        .maximumSize(200)
                        .expireAfterWrite(1, TimeUnit.MINUTES)
                        .recordStats()
                        .build());

        SimpleCacheManager mgr = new SimpleCacheManager();
        mgr.setCaches(List.of(instruments, counterparties));
        return mgr;
    }
}
