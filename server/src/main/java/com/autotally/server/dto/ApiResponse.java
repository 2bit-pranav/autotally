package com.autotally.server.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        String errorDetail,
        LocalDateTime timestamp
) {
    // success response WITH data
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, null, LocalDateTime.now());
    }

    // success response WITHOUT data
    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>(true, message, null, null, LocalDateTime.now());
    }

    // error response :(
    public static <T> ApiResponse<T> error(String message, String errorDetail) {
        return new ApiResponse<>(false, message, null, errorDetail, LocalDateTime.now());
    }
}
