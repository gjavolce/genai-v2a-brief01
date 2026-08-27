package com.neueda.capstone.transaction;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/customers/{customerId}/accounts/{accountId}/transactions")
public class AccountTransactionController {

    private final AccountTransactionService transactionService;

    public AccountTransactionController(AccountTransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    TransactionPageDto findForCustomerAccount(
            @PathVariable @Positive Long customerId,
            @PathVariable @Positive Long accountId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return transactionService.findForCustomerAccount(customerId, accountId, page, size);
    }
}
