package com.neueda.capstone.account;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccountMapperTest {

    private final AccountMapper mapper = new AccountMapper();

    @Test
    void shouldMaskNormalAccountNumber() {
        AccountDto dto = mapper.toDto(account("GB00MERIDIAN00000001"));

        assertThat(dto.accountNumber()).isEqualTo("****************0001");
    }

    @Test
    void shouldMaskShortAccountNumberWithoutShowingItInFull() {
        AccountDto dto = mapper.toDto(account("1234"));

        assertThat(dto.accountNumber()).isEqualTo("****");
    }

    @Test
    void shouldMaskEveryAccountNumberWhenMappingMultipleAccounts() {
        AccountDto first = mapper.toDto(account("12345678"));
        AccountDto second = mapper.toDto(account("87654321"));

        assertThat(first.accountNumber()).isEqualTo("****5678");
        assertThat(second.accountNumber()).isEqualTo("****4321");
    }

    private Account account(String number) {
        return new Account(1L, "Everyday Current", number, "GBP", new BigDecimal("1234.50"));
    }
}
