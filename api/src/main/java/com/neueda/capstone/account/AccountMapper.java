package com.neueda.capstone.account;

import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

    private static final int BALANCE_SCALE = 8;

    public AccountDto toDto(Account account) {
        return new AccountDto(
                account.getId(),
                account.getAccountName(),
                mask(account.getAccountNumber()),
                account.getCurrency(),
                account.getBalance().setScale(BALANCE_SCALE).toPlainString());
    }

    private String mask(String accountNumber) {
        if (accountNumber.length() <= 4) {
            return "*".repeat(Math.max(1, accountNumber.length()));
        }
        return "*".repeat(accountNumber.length() - 4) + accountNumber.substring(accountNumber.length() - 4);
    }
}
