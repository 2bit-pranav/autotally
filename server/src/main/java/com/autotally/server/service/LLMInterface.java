package com.autotally.server.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface LLMInterface {
    String analyzeInvoices(List<MultipartFile> invoiceFiles);
}
