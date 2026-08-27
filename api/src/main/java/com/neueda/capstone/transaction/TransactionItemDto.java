package com.neueda.capstone.transaction;

import java.time.Instant;

public record TransactionItemDto(
        Instant bookedAt,
        String description,
        String amount,
        String runningBalance,
        String currency) {
}
