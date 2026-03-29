package com.autotally.server.controllers;

import java.util.HashMap;
import java.util.List;
import com.autotally.server.dto.ApiResponse;
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
import org.springframework.web.multipart.MultipartFile;

// controller -> service -> interface
@RestController
@RequestMapping("/api/v1")
public class MainController {

    private final LLMInterface llmService;
    private final TallyConnector tallyConnector;

    public MainController(LLMInterface llmService, TallyConnector tallyConnector) {
        this.llmService = llmService;
        this.tallyConnector = tallyConnector;
    }

    @GetMapping("/ping-tally")
    public ResponseEntity<ApiResponse<String>> pingTally() {
        String result = tallyConnector.pingTally();
        return ResponseEntity.ok(ApiResponse.success("Successfully connected to Tally", result));
    }

    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<String>> analyzeInvoices(
            @RequestParam("invoiceFiles") List<MultipartFile> invoiceFiles
    ) {
        String result = llmService.analyzeInvoices(invoiceFiles);
        return ResponseEntity.ok(ApiResponse.success("Invoices were successfully analyzed", result));
    }

    @PostMapping("/get-ledgers")
    public ResponseEntity<ApiResponse<HashMap<String, HashMap<String, String>>>> getLedgers(
            @RequestParam("targetCompany") String company
    ) {
        boolean correctCompany = tallyConnector.validateCompany(company);
        if (!correctCompany) throw new IllegalArgumentException("Company is invalid");

        HashMap<String, HashMap<String, String>> result = tallyConnector.getLedgers();
        if (!result.isEmpty()) return ResponseEntity.ok(ApiResponse.success("Ledgers were retrieved successfully", result));
        else return ResponseEntity.ok(ApiResponse.success("Empty ledger list was returned"));
    }

    @PostMapping("/generate-voucher-xml")
    public ResponseEntity<ApiResponse<String>> generateXml(
            @RequestParam("targetCompany") String company,
            @RequestParam("invoiceType") String invoiceType,
            @RequestParam("cgstLedger") String cgstLedger,
            @RequestParam("sgstLedger") String sgstLedger,
            @RequestParam("igstLedger") String igstLedger,
            @RequestBody List<Invoice> rawInvoices
    ) {
        String xml = tallyConnector.generateVoucherXml(rawInvoices, company, invoiceType, cgstLedger, sgstLedger, igstLedger);
        return ResponseEntity.ok(ApiResponse.success("XML generated successfully", xml));
    }

    @PostMapping("/push-vouchers")
    public ResponseEntity<ApiResponse<String>> pushToTally(
            @RequestBody String rawXml
    ) {
        String createdCount = tallyConnector.pushVouchers(rawXml);
        return ResponseEntity.ok(ApiResponse.success("Successfully created " + createdCount + " vouchers", createdCount));
    }

    @GetMapping("/check-health")
    public String checkHealth() {
        return "Backend Running";
    }

}
