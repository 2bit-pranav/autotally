package com.autotally.server.service;

import java.util.*;
import com.autotally.server.exception.AIProcessingException;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GeminiClient implements LLMInterface {

    private final ChatModel chatModel;

    // load the prompt string from .properties
    @Value("${app.gemini.invoice-prompt}")
    private String prompt;

    public GeminiClient(ChatModel chatModel) {
    this.chatModel = chatModel;
  }

    @Override
    public String analyzeInvoices(List<String> rawInvoiceTexts) {
        try {
            if (rawInvoiceTexts == null || rawInvoiceTexts.isEmpty()) {
                throw new IllegalArgumentException("Invoice text list cannot be empty.");
            }

            // combine the prompt template with the raw text data
            StringBuilder combinedPrompt = new StringBuilder(prompt);
            combinedPrompt.append("\n\nHere are the raw texts extracted from the invoices:\n");

            for (int i = 0; i < rawInvoiceTexts.size(); i++) {
                combinedPrompt.append("--- Invoice ").append(i + 1).append(" ---\n");
                combinedPrompt.append(rawInvoiceTexts.get(i)).append("\n\n");
            }

            var userMsg = UserMessage.builder()
                    .text(combinedPrompt.toString())
                    .build();

            ChatResponse response = chatModel.call(new Prompt(userMsg));

            if (response == null || response.getResult() == null) {
                throw new AIProcessingException("Gemini returned empty response.");
            }

            return response.getResult().getOutput().getText();

        } catch (Exception e) {
            throw new AIProcessingException("Gemini API error: " + e.getMessage());
        }
    }
}
