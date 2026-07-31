package com.dbtraining.reconx.observability;

import com.dbtraining.reconx.repository.TradeRepository;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * ============================================================================
 * TICKET-ADV092 — trades_by_status Gauge per status value
 *
 * WHAT:    Registers one polled Gauge per trade status. Each gauge reports
 *          the current live count of trades in that status by querying the DB
 *          on every Prometheus scrape (~15 s).
 * HOW:     Loops over all known status strings and calls
 *          Gauge.builder(...).tag("status", s).register(registry).
 *          The `status` tag is what Grafana's pie-chart query
 *          `sum by (status) (trades_by_status)` splits on.
 * WHY:     trade_created_total (Counter) only fires at creation time. After
 *          status transitions (PENDING→MATCHED, etc.) the counter no longer
 *          reflects current state. A Gauge is the only correct model for
 *          "what is the distribution of trades right now?"
 * OBSERVE: /actuator/prometheus lists 5 series:
 *            trades_by_status{status="PENDING"}    N
 *            trades_by_status{status="MATCHED"}    N
 *            trades_by_status{status="UNMATCHED"}  N
 *            trades_by_status{status="DISPUTED"}   N
 *            trades_by_status{status="CANCELLED"}  N
 *          In Grafana: Pie chart panel, query = sum by (status) (trades_by_status)
 * ============================================================================
 */
@Component
public class TradesByStatusGauge {

    public TradesByStatusGauge(MeterRegistry registry, TradeRepository repo) {
        for (String status : List.of("PENDING", "MATCHED", "UNMATCHED", "DISPUTED", "CANCELLED")) {
            Gauge.builder("trades_by_status", repo, r -> r.countByStatus(status))
                 .tag("status", status)
                 .description("Number of trades currently in a given status")
                 .register(registry);
        }
    }
}
