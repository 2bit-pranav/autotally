package com.autotally.server.service;

import java.util.*;

import com.autotally.server.exception.AIProcessingException;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class GeminiClient implements LLMInterface {

    private final ChatModel chatModel;

    @Value("${app.gemini.invoice-prompt}")
    private String prompt;

    public GeminiClient(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @Override
    public String analyzeInvoices(List<MultipartFile> invoiceFiles) {
        try {
            if (invoiceFiles == null || invoiceFiles.isEmpty()) throw new IllegalArgumentException("Invoice text list cannot be empty.");

            // 1. prepare a list of Media objects
            List<Media> mediaList = new ArrayList<>();
            for (MultipartFile file : invoiceFiles) {
                String contentType = file.getContentType();
                if (contentType == null || contentType.isEmpty()) {
                    contentType = MimeTypeUtils.IMAGE_JPEG_VALUE;
                }
                mediaList.add(new Media(
                        MimeTypeUtils.parseMimeType(contentType),
                        new ByteArrayResource(file.getBytes())
                ));
            }

            // 2. create thread-safe list to hold results
            List<String> batchResults = Collections.synchronizedList(new ArrayList<>());
            List<Thread> activeThreads = new ArrayList<>();

            // 3. create batches of 5
            for (int i=0; i<mediaList.size(); i+=5) {
                int end = Math.min(i+5, mediaList.size());
                List<Media> batch = mediaList.subList(i, end);

                // start vthread
                Thread worker = Thread.ofVirtual().start(() -> {
                    try {
                        String result = processBatch(batch);
                        batchResults.add(result);
                    } catch (Exception e) {
                        System.err.println("Batch failed to process: " + e.getMessage());
                    }
                });

                activeThreads.add(worker);
            }

            // 4. wait for workers
            for (Thread worker : activeThreads) worker.join();

            // 5. combine results
            StringBuilder finalResult = new StringBuilder("[");
            for (String result: batchResults) {
                String cleanedResult = result.replaceAll("^\\[|\\]$", "").trim();
                if (!cleanedResult.isEmpty()) {
                    if (finalResult.length() > 1) finalResult.append(",");
                    finalResult.append(cleanedResult);
                }
            }
            finalResult.append("]");
            return finalResult.toString();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AIProcessingException("Invoice processing was interrupted: " + e.getMessage());
        } catch (Exception e) {
            throw new AIProcessingException("Gemini API error: " + e.getMessage());
        }
    }

    private String processBatch(List<Media> batch) {
        String finalPrompt = prompt + "\n\nI have attached " + batch.size() + " invoice file(s).";
        UserMessage usermsg = UserMessage.builder()
                .text(finalPrompt)
                .media(batch)
                .build();

        ChatResponse response = chatModel.call(new Prompt(usermsg));
        if (response == null || response.getResult() == null) {
            throw new AIProcessingException("Gemini API returned null response for a batch.");
        }

        return response.getResult().getOutput().getText()
                .replace("```json", "")
                .replace("```", "")
                .trim();
    }
}
