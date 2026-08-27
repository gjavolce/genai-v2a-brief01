package com.neueda.capstone.transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.neueda.capstone.account.Account;
import com.neueda.capstone.account.AccountRepository;
import com.neueda.capstone.common.NotFoundException;
import com.neueda.capstone.common.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountTransactionServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountTransactionRepository transactionRepository;

    @Mock
    private AccountTransactionMapper transactionMapper;

    private AccountTransactionService transactionService;

    @BeforeEach
    void setUp() {
        transactionService = new AccountTransactionService(
                accountRepository, transactionRepository, transactionMapper);
    }

    @Test
    void shouldReturnOwnedTransactionsWithNewestFirstPaging() {
        Account account = new Account(1L, "Everyday Current", "GB00MERIDIAN00000001", "GBP",
                new BigDecimal("1234.50000000"));
        AccountTransaction transaction = new AccountTransaction(1L, Instant.parse("2026-08-25T14:30:00Z"),
                "Final balance adjustment", new BigDecimal("-448.49543211"), new BigDecimal("1234.50000000"));
        TransactionItemDto item = new TransactionItemDto(transaction.getBookedAt(), transaction.getDescription(),
                "-448.49543211", "1234.50000000", "GBP");
        when(accountRepository.findByIdAndCustomerId(1L, 1L)).thenReturn(Optional.of(account));
        when(transactionRepository.findByAccountId(org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(java.util.List.of(transaction),
                        org.springframework.data.domain.PageRequest.of(0, 20), 24));
        when(transactionMapper.toDto(transaction, "GBP")).thenReturn(item);

        TransactionPageDto page = transactionService.findForCustomerAccount(1L, 1L, 0, 20);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(transactionRepository).findByAccountId(org.mockito.ArgumentMatchers.eq(1L), pageable.capture());
        assertThat(page.items()).containsExactly(item);
        assertThat(page.page()).isZero();
        assertThat(page.size()).isEqualTo(20);
        assertThat(page.totalElements()).isEqualTo(24);
        assertThat(page.totalPages()).isEqualTo(2);
        assertThat(pageable.getValue().getSort().toString()).isEqualTo("bookedAt: DESC,id: DESC");
    }

    @Test
    void shouldRejectInvalidIdentifiersAndPagingBeforeRepositoryAccess() {
        assertThatThrownBy(() -> transactionService.findForCustomerAccount(1L, 0L, 0, 20))
                .isInstanceOf(ValidationException.class)
                .hasMessage("The request is invalid.");
        assertThatThrownBy(() -> transactionService.findForCustomerAccount(1L, 1L, -1, 20))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> transactionService.findForCustomerAccount(1L, 1L, 0, 101))
                .isInstanceOf(ValidationException.class);

        verifyNoInteractions(accountRepository, transactionRepository, transactionMapper);
    }

    @Test
    void shouldReturnGenericNotFoundBeforeTransactionQueryWhenAccountIsNotOwned() {
        when(accountRepository.findByIdAndCustomerId(3L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.findForCustomerAccount(1L, 3L, 0, 20))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Account not found.");

        verify(accountRepository).findByIdAndCustomerId(3L, 1L);
        verifyNoInteractions(transactionRepository, transactionMapper);
    }
}
