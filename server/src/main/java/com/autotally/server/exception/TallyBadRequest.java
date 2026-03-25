package com.autotally.server.exception;

public class TallyBadRequest extends RuntimeException {
    public TallyBadRequest(String message) {
        super(message);
    }
}
