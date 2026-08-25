package com.neueda.capstone.account;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class AccountDatabaseIntegrationTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("capstone")
            .withUsername("capstone")
            .withPassword("capstone");

    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void resetFixture() {
        jdbcTemplate.update(
                "UPDATE account SET customer_id = 1, balance = ? WHERE account_number = ?",
                new BigDecimal("1234.50000000"),
                "GB00MERIDIAN00000001");
    }

    @Test
    void shouldRunFlywayAndPreserveBalancePrecision() {
        jdbcTemplate.update(
                "UPDATE account SET balance = ? WHERE account_number = ?",
                new BigDecimal("1234.50000001"),
                "GB00MERIDIAN00000001");

        List<Account> accounts = accountRepository.findByCustomerIdOrderById(1L);

        assertThat(accounts).extracting(Account::getBalance)
                .contains(new BigDecimal("1234.50000001"));
    }

    @Test
    void shouldReflectOwnershipFixtureChanges() {
        Account account = accountRepository.findByCustomerIdOrderById(1L).getFirst();

        jdbcTemplate.update("UPDATE account SET customer_id = ? WHERE id = ?", 2L, account.getId());

        assertThat(accountRepository.findByCustomerIdOrderById(1L))
                .noneMatch(candidate -> candidate.getAccountNumber().equals(account.getAccountNumber()));
        assertThat(accountRepository.findByCustomerIdOrderById(2L))
                .anyMatch(candidate -> candidate.getAccountNumber().equals(account.getAccountNumber()));
    }
}
