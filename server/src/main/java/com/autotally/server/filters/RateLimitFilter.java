package com.autotally.server.filters;

import com.autotally.server.dto.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();

    private Bucket createGeneralBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(20)
                .refillGreedy(20, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createAnalyzeBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(10)
                .refillGreedy(10, Duration.ofDays(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        return path.startsWith("/api/v1/check-health") ||
                path.startsWith("/api/v1/ping-tally");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String ipaddress = request.getRemoteAddr();
        String path = request.getRequestURI();

        Bucket bucket;
        String limitMessage;

        if (path.contains("/analyze")) {
            bucket = cache.computeIfAbsent(ipaddress + "_analyze", k -> createAnalyzeBucket());
            limitMessage = "LLM daily analyze request limit exceeded. Maximum 20 requests per day";
        } else {
            bucket = cache.computeIfAbsent(ipaddress + "_general", k -> createGeneralBucket());
            limitMessage = "Too many requests. Rate limit exceeded";
        }

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");

            ApiResponse<Void> errorResponse = ApiResponse.error("Rate Limit Exceeded", limitMessage);
            response.getWriter().write(mapper.writeValueAsString(errorResponse));
        }
    }
}
