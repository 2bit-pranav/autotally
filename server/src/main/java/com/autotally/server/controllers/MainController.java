package com.autotally.server.controllers;

import java.util.HashMap;
import java.util.List;
import com.autotally.server.dto.ApiResponse;
import com.autotally.server.dto.CacheResponse;
import com.autotally.server.service.CacheService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.autotally.server.dto.Invoice;
import com.autotally.server.service.LLMInterface;
import com.autotally.server.service.TallyConnector;

// controller -> service -> interface
@RestController
@RequestMapping("/api/v1")
public class MainController {

    private final LLMInterface llmService;
    private final TallyConnector tallyConnector;
    private final CacheService cacheService;

    public MainController(LLMInterface llmService, TallyConnector tallyConnector, CacheService cacheService) {
        this.llmService = llmService;
        this.tallyConnector = tallyConnector;
        this.cacheService = cacheService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<String>> analyzeInvoices(
            @RequestBody List<String> rawInvoiceTexts
    ) {
        String result = llmService.analyzeInvoices(rawInvoiceTexts);
        return ResponseEntity.ok(ApiResponse.success("Invoices were successfully analyzed", result));
    }

    @GetMapping("/ping-tally")
    public ResponseEntity<ApiResponse<String>> pingTally() {
        String result = tallyConnector.pingTally();
        return ResponseEntity.ok(ApiResponse.success("Successfully connected to Tally", result));
    }

    @PostMapping("/get-ledgers")
    public ResponseEntity<ApiResponse<HashMap<String, String>>> validateCompany(
            @RequestParam("targetCompany") String company
    ) {
        boolean correctCompany = tallyConnector.validateCompany(company);
        if (!correctCompany) throw new IllegalArgumentException("Company is invalid");

        HashMap<String, String> result = tallyConnector.getLedgers();
        if (!result.isEmpty()) return ResponseEntity.ok(ApiResponse.success("Ledgers were retrieved successfully", result));
        else return ResponseEntity.ok(ApiResponse.success("Empty ledger list was returned"));
    }

    @PostMapping("/create-voucher")
    public ResponseEntity<?> createVoucher(
            @RequestParam("targetCompany") String company,
            @RequestParam("invoiceType") String invoiceType,
            @RequestParam("cgstLedger") String cgstLedger,
            @RequestParam("sgstLedger") String sgstLedger,
            @RequestParam("igstLedger") String igstLedger,
            @RequestBody List<Invoice> rawInvoices
    ) {
        boolean correctCompany = tallyConnector.validateCompany(company);
        if (!correctCompany) throw new IllegalArgumentException("Company is invalid");

        String createdCount = tallyConnector.createVoucher(rawInvoices, company, invoiceType, cgstLedger, sgstLedger, igstLedger);
        return ResponseEntity.ok(ApiResponse.success("Successfully created " + createdCount + " vouchers"));
    }

    @PostMapping("/check-cache")
    public ResponseEntity<ApiResponse<CacheResponse>> checkCache(@RequestBody List<String> hashes) {

        if (hashes == null || hashes.isEmpty()) {
            throw new IllegalArgumentException("Hash list cannot be empty");
        }

        CacheResponse result = cacheService.checkCache(hashes);

        String message = String.format("Found %d hits and %d misses",
                result.hits().size(), result.misses().size());

        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    @GetMapping("/check-health")
    public String checkHealth() {
        return "Backend Running";
    }

}
