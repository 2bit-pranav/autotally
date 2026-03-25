package com.autotally.server.dto;

import java.util.List;
import java.util.Map;

public record CacheResponse (
        Map<String, Invoice> hits,
        List<String> misses
) {}
