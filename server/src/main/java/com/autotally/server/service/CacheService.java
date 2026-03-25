package com.autotally.server.service;

import com.autotally.server.dto.CacheResponse;
import com.autotally.server.dto.Invoice;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    private static final String CACHE_PREFIX = "invoice_hash:";

    public CacheService(RedisTemplate<String, Object> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public CacheResponse checkCache(List<String> hashes) {
        Map<String, Invoice> hits = new HashMap<>();
        List<String> misses = new ArrayList<>();

        for (String hash: hashes) {
            String redisKey = CACHE_PREFIX + hash;
            Object cachedData = redisTemplate.opsForValue().get(redisKey);

            if (cachedData != null) {
                try {
                    Invoice invoice = objectMapper.convertValue(cachedData, Invoice.class);
                    hits.put(hash, invoice);
                } catch (Exception e) {
                    // if it fails consider it cache miss
                    misses.add(hash);
                }
            } else {
                misses.add(hash);
            }
        }
        return new CacheResponse(hits, misses);
    }

    public void saveToCache(String hash, Invoice invoice) {
        String redisKey = CACHE_PREFIX + hash;
        redisTemplate.opsForValue().set(redisKey, invoice, Duration.ofDays(30));
    }
}
