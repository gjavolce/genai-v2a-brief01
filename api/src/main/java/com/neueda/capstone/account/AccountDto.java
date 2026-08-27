package com.neueda.capstone.account;

public record AccountDto(
        Long id,
        String accountName,
        String accountNumber,
        String currency,
        String balance) {
}
