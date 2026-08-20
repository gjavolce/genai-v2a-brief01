package com.neueda.capstone.account;

public record AccountDto(
        String accountName,
        String accountNumber,
        String currency,
        String balance) {
}
