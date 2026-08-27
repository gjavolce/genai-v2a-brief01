package com.neueda.capstone.transaction;

import java.math.BigDecimal;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccountTransactionMapperTest {

    private final AccountTransactionMapper mapper = new AccountTransactionMapper();

    @Test
    void shouldPreserveExactDecimalStringsWhenMappingTransaction() {
        AccountTransaction transaction = new AccountTransaction(
                1L,
                Instant.parse("2026-08-25T14:30:00Z"),
                "Precision payment",
                new BigDecimal("-84.23999999"),
                new BigDecimal("1234.50000000"));

        TransactionItemDto dto = mapper.toDto(transaction, "GBP");

        assertThat(dto.bookedAt()).isEqualTo(Instant.parse("2026-08-25T14:30:00Z"));
        assertThat(dto.description()).isEqualTo("Precision payment");
        assertThat(dto.amount()).isEqualTo("-84.23999999");
        assertThat(dto.runningBalance()).isEqualTo("1234.50000000");
        assertThat(dto.currency()).isEqualTo("GBP");
    }
}
