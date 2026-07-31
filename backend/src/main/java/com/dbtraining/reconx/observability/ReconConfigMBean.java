package com.dbtraining.reconx.observability;

import org.springframework.cache.CacheManager;
import org.springframework.jmx.export.annotation.ManagedAttribute;
import org.springframework.jmx.export.annotation.ManagedOperation;
import org.springframework.jmx.export.annotation.ManagedResource;
import org.springframework.stereotype.Component;

/**
 * ============================================================================
 * TICKET-ADV096 — JMX MBean for runtime-tunable reconciliation config
 *
 * WHAT:    Exposes two attributes (priceTolerance, cachingEnabled) and one
 *          operation (clearCache) via JMX so an operator can:
 *           - tune the recon engine's price-match tolerance live
 *           - evict all Caffeine cache entries without a restart
 * HOW:     @ManagedResource with objectName = "reconx:type=ReconConfig"
 *          registers this Spring bean in the platform MBean server.
 *          @ManagedAttribute on getters AND setters = read-write attribute.
 *          @ManagedOperation on clearCache() = invocable from JConsole.
 *          Fields are volatile because JConsole writes arrive on a different
 *          thread than the recon engine reads.
 * WHY:     Production services sometimes need a pressure valve. Being able to
 *          widen the tolerance during a data-quality incident (without a
 *          redeploy) prevents a page cascade. clearCache() is the "nuclear
 *          button" when stale reference data is suspected.
 * OBSERVE: jconsole → Local Process → MBeans → reconx → ReconConfig
 *          Attributes: PriceTolerance (read/write), CachingEnabled (read/write)
 *          Operations: clearCache()
 *          Editing PriceTolerance to 0.05 changes what the next reconcile run
 *          uses. Invoking clearCache() drops all Caffeine entries.
 * ============================================================================
 *
 * Enable JMX in application.yml:
 *   spring:
 *     jmx:
 *       enabled: true
 * ============================================================================
 */
@Component
@ManagedResource(
    objectName  = "reconx:type=ReconConfig",
    description = "Runtime tuning for the reconciliation engine"
)
public class ReconConfigMBean {

    /** Default tolerance: prices within 1% are considered matched. */
    private volatile double priceTolerance = 0.01;

    /** Toggle for the Caffeine caches (does not evict; use clearCache() for that). */
    private volatile boolean cachingEnabled = true;

    private final CacheManager cacheManager;

    public ReconConfigMBean(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    // -----------------------------------------------------------------------
    // priceTolerance — read/write attribute
    // -----------------------------------------------------------------------

    @ManagedAttribute(description = "Price tolerance for break detection (0.0 – 1.0)")
    public double getPriceTolerance() {
        return priceTolerance;
    }

    @ManagedAttribute
    public void setPriceTolerance(double v) {
        if (v < 0 || v > 1) {
            throw new IllegalArgumentException("priceTolerance must be between 0.0 and 1.0, got: " + v);
        }
        this.priceTolerance = v;
    }

    // -----------------------------------------------------------------------
    // cachingEnabled — read/write attribute
    // -----------------------------------------------------------------------

    @ManagedAttribute(description = "Whether Caffeine caches are active")
    public boolean isCachingEnabled() {
        return cachingEnabled;
    }

    @ManagedAttribute
    public void setCachingEnabled(boolean enabled) {
        this.cachingEnabled = enabled;
    }

    // -----------------------------------------------------------------------
    // clearCache() — invocable operation
    // -----------------------------------------------------------------------

    @ManagedOperation(description = "Evict all entries from every Caffeine cache")
    public void clearCache() {
        cacheManager.getCacheNames().forEach(name -> {
            var cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
            }
        });
    }
}
