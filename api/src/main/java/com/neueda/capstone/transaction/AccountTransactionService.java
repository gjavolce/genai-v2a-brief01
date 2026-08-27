package com.neueda.capstone.transaction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.neueda.capstone.account.Account;
import com.neueda.capstone.account.AccountRepository;
import com.neueda.capstone.common.NotFoundException;
import com.neueda.capstone.common.ValidationException;

@Service
public class AccountTransactionService {

    private static final Sort NEWEST_FIRST = Sort.by(
            Sort.Order.desc("bookedAt"), Sort.Order.desc("id"));

    private final AccountRepository accountRepository;
    private final AccountTransactionRepository transactionRepository;
    private final AccountTransactionMapper transactionMapper;

    public AccountTransactionService(AccountRepository accountRepository,
                                     AccountTransactionRepository transactionRepository,
                                     AccountTransactionMapper transactionMapper) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.transactionMapper = transactionMapper;
    }

    @Transactional(readOnly = true)
    public TransactionPageDto findForCustomerAccount(Long customerId, Long accountId, int page, int size) {
        validateRequest(customerId, accountId, page, size);

        Account account = accountRepository.findByIdAndCustomerId(accountId, customerId)
                .orElseThrow(() -> new NotFoundException("Account not found."));
        Page<AccountTransaction> transactions = transactionRepository.findByAccountId(
                accountId, PageRequest.of(page, size, NEWEST_FIRST));

        return new TransactionPageDto(
                transactions.getContent().stream()
                        .map(transaction -> transactionMapper.toDto(transaction, account.getCurrency()))
                        .toList(),
                transactions.getNumber(),
                transactions.getSize(),
                transactions.getTotalElements(),
                transactions.getTotalPages());
    }

    private void validateRequest(Long customerId, Long accountId, int page, int size) {
        if (customerId == null || customerId <= 0 || accountId == null || accountId <= 0
                || page < 0 || size < 1 || size > 100) {
            throw new ValidationException("The request is invalid.");
        }
    }
}
