package com.autotally.server.dto;

public record LedgerCreation(
  String name,
  String parent,
  String address,
  String state,
  String country,
  String gstin
) {}
