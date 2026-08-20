package com.neueda.capstone.account;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.neueda.capstone.common.NotFoundException;
import com.neueda.capstone.customer.CustomerRepository;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final AccountMapper accountMapper;

    public AccountService(AccountRepository accountRepository, CustomerRepository customerRepository,
                          AccountMapper accountMapper) {
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.accountMapper = accountMapper;
    }

    @Transactional(readOnly = true)
    public List<AccountDto> findForCustomer(Long customerId) {
        if (customerId == null || !customerRepository.existsById(customerId)) {
            throw new NotFoundException("No selected customer with id " + customerId);
        }

        return accountRepository.findByCustomerIdOrderById(customerId).stream()
                .map(accountMapper::toDto)
                .toList();
    }
}
