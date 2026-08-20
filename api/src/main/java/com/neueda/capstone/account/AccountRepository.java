package com.neueda.capstone.account;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findByCustomerIdOrderById(Long customerId);
}
