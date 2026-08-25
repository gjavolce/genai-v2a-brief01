package com.neueda.capstone.account;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.neueda.capstone.common.NotFoundException;
import com.neueda.capstone.customer.CustomerRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CustomerRepository customerRepository;

    private AccountService accountService;

    @BeforeEach
    void setUp() {
        accountService = new AccountService(accountRepository, customerRepository, new AccountMapper());
    }

    @Test
    void shouldReturnOnlyAccountsBelongingToSelectedCustomer() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(accountRepository.findByCustomerIdOrderById(1L)).thenReturn(List.of(
                account(1L, "Everyday Current", "GB00MERIDIAN00000001", "1234.5"),
                account(1L, "Rainy Day Saver", "GB00MERIDIAN00000002", "2500.75")));

        List<AccountDto> accounts = accountService.findForCustomer(1L);

        assertThat(accounts).extracting(AccountDto::accountName)
                .containsExactly("Everyday Current", "Rainy Day Saver");
        verify(accountRepository).findByCustomerIdOrderById(1L);
    }

    @Test
    void shouldReturnEveryVisibleFieldForEverySelectedCustomerAccount() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(accountRepository.findByCustomerIdOrderById(1L)).thenReturn(List.of(
                account(1L, "Everyday Current", "GB00MERIDIAN00000001", "1234.5")));

        AccountDto account = accountService.findForCustomer(1L).getFirst();

        assertThat(account.accountName()).isEqualTo("Everyday Current");
        assertThat(account.accountNumber()).isEqualTo("****************0001");
        assertThat(account.currency()).isEqualTo("GBP");
        assertThat(account.balance()).isEqualTo("1234.50000000");
    }

    @Test
    void shouldReturnEmptyListWhenSelectedCustomerHasNoAccounts() {
        when(customerRepository.existsById(3L)).thenReturn(true);
        when(accountRepository.findByCustomerIdOrderById(3L)).thenReturn(List.of());

        List<AccountDto> accounts = accountService.findForCustomer(3L);

        assertThat(accounts).isEmpty();
    }

    @Test
    void shouldRejectUnknownSelectedCustomer() {
        when(customerRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> accountService.findForCustomer(99L))
                .isInstanceOf(NotFoundException.class);

        verifyNoInteractions(accountRepository);
    }

    @Test
    void shouldPreserveSeparateExactScaleBalances() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(accountRepository.findByCustomerIdOrderById(1L)).thenReturn(List.of(
                account(1L, "First", "GB00MERIDIAN00000001", "1234.5"),
                account(1L, "Second", "GB00MERIDIAN00000002", "1234.50000001")));

        List<AccountDto> accounts = accountService.findForCustomer(1L);

        assertThat(accounts).extracting(AccountDto::balance)
            .containsExactly("1234.50000000", "1234.50000001");
    }

    @Test
    void shouldReflectFixtureOwnershipChangesBetweenReads() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(accountRepository.findByCustomerIdOrderById(1L))
                .thenReturn(List.of(account(1L, "Everyday Current", "GB00MERIDIAN00000001", "1234.5")))
                .thenReturn(List.of());

        List<AccountDto> accountsBeforeOwnershipChange = accountService.findForCustomer(1L);
        List<AccountDto> accountsAfterOwnershipChange = accountService.findForCustomer(1L);

        assertThat(accountsBeforeOwnershipChange).hasSize(1);
        assertThat(accountsAfterOwnershipChange).isEmpty();
    }

    @Test
    void shouldUseTheSelectedCustomerIdentifierAsTheOnlyOwnershipScope() {
        when(customerRepository.existsById(2L)).thenReturn(true);
        when(accountRepository.findByCustomerIdOrderById(2L)).thenReturn(List.of(
                account(2L, "Everyday Current", "GB00MERIDIAN00000003", "987.65")));

        List<AccountDto> accounts = accountService.findForCustomer(2L);

        assertThat(accounts).singleElement()
                .extracting(AccountDto::accountNumber)
                .isEqualTo("****************0003");
        verify(accountRepository).findByCustomerIdOrderById(2L);
    }

    private Account account(Long customerId, String name, String number, String balance) {
        return new Account(customerId, name, number, "GBP", new BigDecimal(balance));
    }
}
