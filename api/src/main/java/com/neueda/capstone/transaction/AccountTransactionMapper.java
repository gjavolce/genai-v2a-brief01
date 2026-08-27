package com.neueda.capstone.transaction;

import org.springframework.stereotype.Component;

@Component
public class AccountTransactionMapper {

    public TransactionItemDto toDto(AccountTransaction transaction, String currency) {
        return new TransactionItemDto(
                transaction.getBookedAt(),
                transaction.getDescription(),
                transaction.getAmount().toPlainString(),
                transaction.getRunningBalance().toPlainString(),
                currency);
    }
}
