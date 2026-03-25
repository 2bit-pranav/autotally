package com.autotally.server.exception;

import com.autotally.server.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // handle tally connectivity failure
    @ExceptionHandler(TallyConnectivityException.class)
    public ResponseEntity<ApiResponse<Void>> handleTallyConnectivityException(TallyConnectivityException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Tally was not running", e.getMessage()));
    }

    // handle tally logic failure
    @ExceptionHandler(TallyBadRequest.class)
    public ResponseEntity<ApiResponse<Void>> handleTallyBadRequest(TallyBadRequest e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Tally integration failed", e.getMessage()));
    }

    // handle LLM processing failure
    @ExceptionHandler(AIProcessingException.class)
    public ResponseEntity<ApiResponse<Void>> handleAIProcessingException(AIProcessingException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ApiResponse.error("AI processing failed", e.getMessage()));
    }

    // handle validation
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidInput(IllegalAccessException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Invalid input", e.getMessage()));
    }

    // handle any other error
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGlobalError(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("Internal server error", e.getMessage()));
    }
}
