package com.autotally.server.service;

import java.util.HashMap;
import java.util.List;
import com.autotally.server.dto.Invoice;
import com.autotally.server.exception.TallyBadRequest;
import com.autotally.server.exception.TallyConnectivityException;
import com.autotally.server.templates.TallyTemplates;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

// https://noumaanahamed.github.io/tally-prime-api-docs/
// https://blog.ghanshyamdigital.com/how-to-use-xml-requests-for-exporting-data-from-tally-prime
@Service
public class TallyConnector {

    private final RestClient restClient;

    public TallyConnector() {
        this.restClient = RestClient.builder()
                .baseUrl("http://localhost:9000")
                .build();
    }

    private String postToTally(String xmlRequest) {
        try {
            String response = restClient.post()
                    .contentType(MediaType.TEXT_XML)
                    .body(xmlRequest)
                    .retrieve()
                    .body(String.class);

            if (response == null || response.trim().isEmpty()) {
                throw new TallyBadRequest("Received empty response from Tally");
            }
            return response;

        } catch (ResourceAccessException e) {
            throw new TallyConnectivityException("Failed to connect to Tally. Check if Tally is running on PORT 9000");
        }
    }

    private HashMap<String, String> parseLedgers(String xmlResponse) {
        HashMap<String, String> ledgers = new HashMap<>();

        String[] ledgerBlocks = xmlResponse.split("<LEDGER>");
        for (int i = 1; i < ledgerBlocks.length; i++) {
            String block = ledgerBlocks[i];
            String name = extractTagValue(block, "<NAME>", "</NAME>");
            String gstin = extractTagValue(block, "<PARTYGSTIN TYPE=\"String\">", "</PARTYGSTIN>");

            if (gstin == null || gstin.trim().isEmpty()) {
                gstin = extractTagValue(block, "<PARTYGSTIN>", "</PARTYGSTIN>");
            }

            if (name != null) {
                name = name.replace("&amp;", "&").replace("&apos;", "\"");
            }

            if (name != null && gstin != null) {
                ledgers.put(gstin, name);
            }
        }
        return ledgers;
    }

    private String extractTagValue(String content, String start, String end) {
        int startIdx = content.indexOf(start);
        if (startIdx == -1) return null;

        startIdx += start.length();

        int endIdx = content.indexOf(end, startIdx);
        if (endIdx == -1) return null;

        return content.substring(startIdx, endIdx);
    }

    private String buildLedgerEntry(String name, String deemedPos, String amount) {
        return TallyTemplates.LEDGER_ENTRY
                .replace("VAR_LEDGER_NAME", name)
                .replace("VAR_DEEMED_POS", deemedPos)
                .replace("VAR_AMOUNT", amount);
    }

    private double parseAmt(String amountStr) {
        // check for null or empty strings
        if (amountStr == null || amountStr.trim().isEmpty()) {
            return 0.0;
        }

        try {
            // remove commas
            return Double.parseDouble(amountStr.replace(",", ""));
        } catch (NumberFormatException e) {
            System.out.println("Warning: Could not parse amount: " + amountStr);
            return 0.0;
        }
    }

    // PUBLIC METHODS

    public String pingTally() {
        return postToTally(TallyTemplates.GET_COMPANY);
    }

    public boolean validateCompany(String company) {
        String xmlResponse = pingTally();

        if (!xmlResponse.contains("CURRENTCOMPANY")) return false;

        String companyName = company.replace("&amp;", "&");
        String targetString = "<CURRENTCOMPANY TYPE=\"String\">"+companyName+"</CURRENTCOMPANY>";
        return xmlResponse.contains(targetString);
    }

    public HashMap<String, String> getLedgers() {
        String xmlResponse = postToTally(TallyTemplates.GET_LEDGERS);

        if (!xmlResponse.contains("<DATA>")) {
            throw new TallyBadRequest("Could not retrieve ledgers. DATA tag not found");
        }

        return parseLedgers(xmlResponse);
    }

    // xmlRequest <- allVouchers <- singleVoucher <- ledgerEntries
    public String createVoucher(List<Invoice> rawInvoices, String company, String invoiceType,

                                String cgstLedger, String sgstLedger, String igstLedger) {

        StringBuilder allVouchersBuilder = new StringBuilder();
        boolean isSales = invoiceType.equalsIgnoreCase("Sales");

        for (Invoice inv : rawInvoices) {

            String partyDeemedPos = isSales ? "Yes" : "No";
            String baseDeemedPos  = isSales ? "No" : "Yes";
            String taxDeemedPos   = isSales ? "No" : "Yes";
            String baseLedgerName = isSales ? "Sales Account" : "Purchase Account";

            StringBuilder ledgerEntriesBuilder = new StringBuilder();

            String partyAmt = isSales ? "-" + inv.totalAmount() : inv.totalAmount();
            ledgerEntriesBuilder.append(buildLedgerEntry(inv.partyName(), partyDeemedPos, partyAmt));

            String baseAmt = isSales ? inv.baseAmount() : "-" + inv.baseAmount();
            ledgerEntriesBuilder.append(buildLedgerEntry(baseLedgerName, baseDeemedPos, baseAmt));

            double igst = parseAmt(inv.igst());
            double cgst = parseAmt(inv.cgst());
            double sgst = parseAmt(inv.sgst());

            if (igst > 0) {
                String igstAmtStr = isSales ? inv.igst() : "-" + inv.igst();
                ledgerEntriesBuilder.append(buildLedgerEntry(igstLedger, taxDeemedPos, igstAmtStr));
            } else {
                if (cgst > 0) {
                    String cgstAmtStr = isSales ? inv.cgst() : "-" + inv.cgst();
                    ledgerEntriesBuilder.append(buildLedgerEntry(cgstLedger, taxDeemedPos, cgstAmtStr));
                }
                if (sgst > 0) {
                    String sgstAmtStr = isSales ? inv.sgst() : "-" + inv.sgst();
                    ledgerEntriesBuilder.append(buildLedgerEntry(sgstLedger, taxDeemedPos, sgstAmtStr));
                }
            }

            String singleVoucher = TallyTemplates.CREATE_VOUCHER_INNER
                    .replace("VAR_INVOICE_TYPE", invoiceType)
                    .replace("VAR_DATE", inv.invoiceDate().replace("-", ""))
                    .replace("VAR_INV_NUM", inv.invoiceNumber())
                    .replace("VAR_PARTY_NAME", inv.partyName())
                    .replace("VAR_LEDGER_ENTRIES", ledgerEntriesBuilder.toString());

            allVouchersBuilder.append(singleVoucher);
        }

        String xmlRequest = TallyTemplates.CREATE_VOUCHER_OUTER
                .replace("VAR_COMPANY_NAME", company)
                .replace("VAR_BODY", allVouchersBuilder.toString());

        String xmlResponse = postToTally(xmlRequest);

        // check LINEERROR existence, confirm 0 in ERRORS and EXCEPTIONS, and confirm CREATED tag
        if (xmlResponse.contains("<LINEERROR>")) {
            String errorMsg = extractTagValue(xmlResponse, "<LINEERROR>", "</LINEERROR>");
            throw new TallyBadRequest("Tally rejected voucher: " + errorMsg);
        }
        if (!xmlResponse.contains("<ERRORS>0</ERRORS>") || !xmlResponse.contains("<EXCEPTIONS>0</EXCEPTIONS>")) {
            throw new TallyBadRequest("Tally processed the request but reported errors/exceptions");
        }
        if (!xmlResponse.contains("<CREATED>")) {
            throw new TallyBadRequest("Tally response missing CREATED tag. Response: " + xmlResponse);
        }

        String createdCount = extractTagValue(xmlResponse, "<CREATED>", "</CREATED>");
        if (Integer.parseInt(createdCount) == 0) {
            throw new TallyBadRequest("Request was successful, but 0 vouchers were created");
        }

        return createdCount;
    }

//    public boolean createLedgers(List<LedgerCreation> ledgerData) {
//        StringBuilder ledgerBuilder = new StringBuilder();
//
//        for (LedgerCreation ledger : ledgerData) {
//            // step 1: handle and parse DTO values
//            String parsedName = ledger.name();
//            String parsedParent = ledger.parent();
//            String parsedAddress = (ledger.address() != null && !ledger.address().isEmpty()) ? ledger.address() : "";
//            String parsedState = (ledger.state() != null && !ledger.state().isEmpty()) ? ledger.state() : "";
//            String parsedGST = (ledger.gstin() != null && ledger.gstin().length() == 15) ? ledger.gstin() : "";
//            String parsedRegType = (!parsedGST.isEmpty()) ? "Regular" : "Unregistered";
//            String country = ledger.country();
//
//            // step 2: replace and append
//            String temp = TallyTemplates.CREATE_LEDGER_INNER
//                    .replace("VAR_NAME", parsedName)
//                    .replace("VAR_PARENT", parsedParent)
//                    .replace("VAR_ADDRESS", parsedAddress)
//                    .replace("VAR_STATE", parsedState)
//                    .replace("VAR_REG_TYPE", parsedRegType)
//                    .replace("VAR_GSTIN", parsedGST)
//                    .replace("VAR_COUNTRY", country);
//
//            // step 3: append to the full ledgerString
//            ledgerBuilder.append(temp);
//        }
//
//        // construct final request String
//        String xmlRequest = TallyTemplates.CREATE_LEDGER_OUTER.replace("VAR_NAME", ledgerBuilder);
//        String response = restClient.post()
//                .contentType(MediaType.TEXT_XML)
//                .body(xmlRequest)
//                .retrieve()
//                .body(String.class);
//
//        return response != null && response.contains("<ERRORS>0</ERRORS>");
//    }
}