package com.autotally.server.service;

import java.util.List;

public interface LLMInterface {
    String analyzeInvoices(List<String> rawInvoiceTexts);
}
