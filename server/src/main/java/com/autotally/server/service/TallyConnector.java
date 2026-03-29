package com.autotally.server.service;

import java.io.StringReader;
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
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.xml.sax.InputSource;

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

//    private HashMap<String, String> parseLedgers(String xmlResponse) {
//        HashMap<String, String> ledgers = new HashMap<>();
//
//        String[] ledgerBlocks = xmlResponse.split("<LEDGER>");
//        for (int i = 1; i < ledgerBlocks.length; i++) {
//            String block = ledgerBlocks[i];
//            String name = extractTagValue(block, "<NAME>", "</NAME>");
//            String gstin = extractTagValue(block, "<PARTYGSTIN TYPE=\"String\">", "</PARTYGSTIN>");
//
//            if (gstin == null || gstin.trim().isEmpty()) {
//                gstin = extractTagValue(block, "<PARTYGSTIN>", "</PARTYGSTIN>");
//            }
//
//            if (name != null) {
//                name = name.replace("&amp;", "&").replace("&apos;", "\"");
//            }
//
//            if (name != null && gstin != null) {
//                ledgers.put(gstin, name);
//            }
//        }
//        return ledgers;
//    }
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

    private double parseAmt(String val) {
        if (val == null || val.trim().isEmpty() || val.equalsIgnoreCase("NIL") || val.equalsIgnoreCase("NA")) {
            return 0.0;
        }
        try {
            // Strip out any commas, spaces, or currency symbols just in case
            String cleanVal = val.replaceAll("[^\\d.]", "");
            return Double.parseDouble(cleanVal);
        } catch (NumberFormatException e) {
            System.err.println("Warning: Could not parse amount: " + val);
            return 0.0;
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
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

    public HashMap<String, HashMap<String, String>> getLedgers() {
        String xmlResponse = postToTally(TallyTemplates.GET_LEDGERS);

        if (!xmlResponse.contains("<DATA>")) {
            throw new TallyBadRequest("Could not retrieve ledgers. DATA tag not found");
        }

        HashMap<String, HashMap<String, String>> categorizedLedgers = new HashMap<>();
        try {
            // sanitize response
            xmlResponse = xmlResponse.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "");
            xmlResponse = xmlResponse.replaceAll("&#([0-8]|1[12]|1[4-9]|2[0-9]|3[0-1]);", "");

            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document document = builder.parse(new InputSource(new StringReader(xmlResponse)));

            NodeList ledgerNodes = document.getElementsByTagName("LEDGER");
            for (int i = 0; i < ledgerNodes.getLength(); i++) {
                Element ledgerElement = (Element) ledgerNodes.item(i);

                // 1. get name
                String ledgerName = ledgerElement.getAttribute("NAME");
                if (ledgerName.isEmpty()) {
                    NodeList nameNodes = ledgerElement.getElementsByTagName("NAME");
                    if (nameNodes.getLength() > 0) {
                        ledgerName = nameNodes.item(0).getTextContent().trim();
                    }
                }

                // 2. get GSTIN
                String gstin = "";
                NodeList gstinNodes = ledgerElement.getElementsByTagName("PARTYGSTIN");
                if (gstinNodes.getLength() > 0) {
                    gstin = gstinNodes.item(0).getTextContent().trim();
                }

                // 3. get category
                String category = "Uncategorized";
                NodeList parentNodes = ledgerElement.getElementsByTagName("PARENT");
                if (parentNodes.getLength() > 0) {
                    category = parentNodes.item(0).getTextContent().trim();
                }

                // 4. update map
                if (!ledgerName.isEmpty()) {
                    categorizedLedgers.putIfAbsent(category, new HashMap<>());
                    categorizedLedgers.get(category).put(ledgerName, gstin);
                }
            }

        } catch (Exception e) {
            System.err.println("Failed to parse Tally Ledgers: " + e.getMessage());
            throw new TallyBadRequest("Failed to parse Tally response for ledgers");
        }
        return categorizedLedgers;
    }

    // xmlRequest <- allVouchers <- singleVoucher <- ledgerEntries
    public String generateVoucherXml(List<Invoice> rawInvoices, String company, String invoiceType,
                                     String cgstLedger, String sgstLedger, String igstLedger) {

        if (rawInvoices == null || rawInvoices.isEmpty()) return "";

        StringBuilder allVouchersBuilder = new StringBuilder();
        boolean isSales = invoiceType.equalsIgnoreCase("Sales");

        for (Invoice inv : rawInvoices) {
            String partyDeemedPos = isSales ? "Yes" : "No";
            String baseDeemedPos  = isSales ? "No" : "Yes";
            String taxDeemedPos   = isSales ? "No" : "Yes";
            String baseLedgerName = isSales ? "Sales Account" : "Purchase Account";

            StringBuilder ledgerEntriesBuilder = new StringBuilder();

            String partyAmt = isSales ? "-" + safe(inv.totalAmount()) : safe(inv.totalAmount());
            ledgerEntriesBuilder.append(buildLedgerEntry(safe(inv.partyName()), partyDeemedPos, partyAmt));

            String baseAmt = isSales ? safe(inv.baseAmount()) : "-" + safe(inv.baseAmount());
            ledgerEntriesBuilder.append(buildLedgerEntry(baseLedgerName, baseDeemedPos, baseAmt));

            double igst = parseAmt(safe(inv.igst()));
            double cgst = parseAmt(safe(inv.cgst()));
            double sgst = parseAmt(safe(inv.sgst()));

            if (igst > 0) {
                String igstAmtStr = isSales ? safe(inv.igst()) : "-" + safe(inv.igst());
                ledgerEntriesBuilder.append(buildLedgerEntry(igstLedger, taxDeemedPos, igstAmtStr));
            } else {
                if (cgst > 0) {
                    String cgstAmtStr = isSales ? safe(inv.cgst()) : "-" + safe(inv.cgst());
                    ledgerEntriesBuilder.append(buildLedgerEntry(cgstLedger, taxDeemedPos, cgstAmtStr));
                }
                if (sgst > 0) {
                    String sgstAmtStr = isSales ? safe(inv.sgst()) : "-" + safe(inv.sgst());
                    ledgerEntriesBuilder.append(buildLedgerEntry(sgstLedger, taxDeemedPos, sgstAmtStr));
                }
            }

            // Using the safe() wrapper to prevent null crashes
            String safeDate = safe(inv.invoiceDate()).replace("-", "");

            String singleVoucher = TallyTemplates.CREATE_VOUCHER_INNER
                    .replace("VAR_INVOICE_TYPE", safe(invoiceType))
                    .replace("VAR_DATE", safeDate)
                    .replace("VAR_INV_NUM", safe(inv.invoiceNumber()))
                    .replace("VAR_PARTY_NAME", safe(inv.partyName()))
                    .replace("VAR_LEDGER_ENTRIES", ledgerEntriesBuilder.toString());

            allVouchersBuilder.append(singleVoucher);
        }

        return TallyTemplates.CREATE_VOUCHER_OUTER
                .replace("VAR_COMPANY_NAME", company)
                .replace("VAR_BODY", allVouchersBuilder.toString());
    }

    public String pushVouchers(String xmlRequest) {
        if (xmlRequest == null || xmlRequest.isEmpty()) return "0";

        String xmlResponse = postToTally(xmlRequest);

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
}