package com.autotally.server.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Invoice(
    // map json -> java
    @JsonProperty("PARTY_NAME") String partyName,
    @JsonProperty("PARTY_GSTIN") String partyGST,
    @JsonProperty("TAX_INVOICE_NO") String invoiceNumber,
    @JsonProperty("INVOICE_DATE") String invoiceDate,
    @JsonProperty("TAXABLE_VALUE") String baseAmount,
    @JsonProperty("CGST") String cgst,
    @JsonProperty("SGST") String sgst,
    @JsonProperty("IGST") String igst,
    @JsonProperty("INVOICE_VALUE") String totalAmount
) {}
