package com.dbtraining.reconx.controller;

import com.dbtraining.reconx.dto.PagedResponse;
import com.dbtraining.reconx.dto.TradeMapper;
import com.dbtraining.reconx.dto.TradeRequest;
import com.dbtraining.reconx.dto.TradeResponse;
import com.dbtraining.reconx.repository.entity.Trade;
import com.dbtraining.reconx.service.TradeService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArrayList;

import java.net.URI;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * ============================================================================
 * TICKET-ADV063-ADV067 — TradeController (full CRUD + filterable list)
 * TICKET-ADV080 — API versioning: every endpoint under /v1/
 *
 * Combined with the /api context-path from application.yml, full URLs are
 * /api/v1/trades, /api/v1/trades/{id} etc.
 * ============================================================================
 */
@RestController
@RequestMapping("/v1/trades")
@Tag(name = "trades", description = "Trade CRUD and search")
@SecurityRequirement(name = "bearerAuth")
public class TradeController {

    private final TradeService service;
    private final TradeMapper mapper;
    private final List<SseEmitter> emitters;

    public TradeController(TradeService service, TradeMapper mapper) {
        this.service = service;
        this.mapper = mapper;
        this.emitters = new CopyOnWriteArrayList<>();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(ex -> emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                .name("connected")
                .data("Trade stream connected"));
        } catch(IOException e) {
            emitters.remove(emitter);
        }

        return emitter;
    }

    private void broadcastTrade(TradeResponse trade) {
        List<SseEmitter> deadEmitters = new ArrayList<>();
        
        for(SseEmitter emitter : emitters) {
            try {
                emitter.send(
                    SseEmitter.event()
                    .name("trade")
                    .data(trade)
                );
            } catch(Exception ex) {
                deadEmitters.add(emitter);
            }
        }

        emitters.removeAll(deadEmitters);
    }

    @GetMapping
    @Operation(summary = "List trades — paginated, filterable, sortable")
    public PagedResponse<TradeResponse> list(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long counterpartyId,
            @PageableDefault(size = 20, sort = "tradeDate", direction = Sort.Direction.DESC) Pageable pageable) {
        // TODO(TICKET-ADV063): delegate to service.list(from, to, status, counterpartyId, pageable)
        //   and wrap the resulting Page<Trade> via PagedResponse.from(page, mapper::toResponse).
        //   For Day 1 return an empty PagedResponse so the React grid renders
        //   "no trades match" while the JPA + Specifications work is still pending.

        Page<Trade> page = service.list(from, to, status, counterpartyId, pageable);
        return PagedResponse.from(page, mapper::toResponse);

        // return new PagedResponse<>(List.of(), 0, 20, 0, 0);
    }

    @PostMapping
    @Operation(summary = "Create a trade")
    public ResponseEntity<TradeResponse> create(@Valid @RequestBody TradeRequest req,
                                                @AuthenticationPrincipal Object principal) {
        // TODO(TICKET-ADV064): call service.create(req, actor), build a Location
        //   header at /api/v1/trades/{id}, and return 201 Created with the
        //   mapped TradeResponse body.

        String actor = String.valueOf(principal);
        Trade saved = service.create(req, actor);

        TradeResponse response = mapper.toResponse(saved);

        broadcastTrade(response);

        return ResponseEntity
                .created(URI.create("/api/v1/trades/" + saved.getId()))
                .body(response);

        // throw new UnsupportedOperationException("TICKET-ADV064");
    }

    @PutMapping("/{id}")
    @Operation(summary = "Full update of a trade")
    public TradeResponse update(@PathVariable Long id, @Valid @RequestBody TradeRequest req,
                                @AuthenticationPrincipal Object principal) {
        // TODO(TICKET-ADV065): delegate to service.update(id, req, actor) and
        //   map the updated entity through mapper.toResponse.

        String actor = String.valueOf(principal);
        Trade saved = service.update(id, req, actor);

        return mapper.toResponse(saved);
        // throw new UnsupportedOperationException("TICKET-ADV065");
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update only the status field")
    public TradeResponse updateStatus(@PathVariable Long id,
                                      @RequestBody Map<String, String> body,
                                      @AuthenticationPrincipal Object principal) {
        // TODO(TICKET-ADV066): read body.get("status") and call
        //   service.updateStatus(id, status, actor). Return mapper.toResponse(saved).

        String actor = String.valueOf(principal);
        String status = body.get("status");

        Trade saved = service.updateStatus(id, status, actor);

        return mapper.toResponse(saved);
        // throw new UnsupportedOperationException("TICKET-ADV066");
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Soft delete (sets deleted_at)")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal Object principal) {
        // TODO(TICKET-ADV067): service.softDelete(id, actor); return 204 No Content.

        String actor = String.valueOf(principal);

        service.softDelete(id, actor);

        return ResponseEntity.noContent().build();
        // throw new UnsupportedOperationException("TICKET-ADV067");
    }
}
