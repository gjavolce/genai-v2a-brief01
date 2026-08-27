package com.neueda.capstone.transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class AccountTransactionDatabaseIntegrationTest {

    private static final Sort NEWEST_FIRST = Sort.by(
            Sort.Order.desc("bookedAt"), Sort.Order.desc("id"));

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
    private AccountTransactionRepository transactionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldRunFlywayAndPreserveTransactionPrecision() {
        AccountTransaction transaction = transactionRepository.findByAccountId(
                1L, PageRequest.of(0, 1, NEWEST_FIRST)).getContent().getFirst();

        assertThat(transaction.getAmount()).isEqualByComparingTo("-448.49543211");
        assertThat(transaction.getRunningBalance()).isEqualByComparingTo("1234.50000000");
        assertThat(transaction.getBookedAt()).isEqualTo(Instant.parse("2026-08-25T14:30:00Z"));
    }

    @Test
    void shouldRejectBlankDescriptionsAndUnknownAccounts() {
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO account_transaction "
                        + "(account_id, booked_at, description, amount, running_balance) "
                        + "VALUES (?, ?, ?, ?, ?)",
                1L, "2026-08-26 09:00:00.000000", "   ",
                new BigDecimal("1.00000000"), new BigDecimal("1235.50000000")))
                .isInstanceOf(DataAccessException.class);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO account_transaction "
                        + "(account_id, booked_at, description, amount, running_balance) "
                        + "VALUES (?, ?, ?, ?, ?)",
                99999L, "2026-08-26 09:00:00.000000", "Unknown account",
                new BigDecimal("1.00000000"), new BigDecimal("1.00000000")))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void shouldOrderEqualBookingTimesByLaterTransactionIdAndReturnPageTotals() {
        Page<AccountTransaction> firstPage = transactionRepository.findByAccountId(
                1L, PageRequest.of(0, 20, NEWEST_FIRST));
        Page<AccountTransaction> finalPage = transactionRepository.findByAccountId(
                1L, PageRequest.of(1, 20, NEWEST_FIRST));
        Page<AccountTransaction> beyondFinalPage = transactionRepository.findByAccountId(
                1L, PageRequest.of(2, 20, NEWEST_FIRST));

        List<AccountTransaction> equalTimeTransactions = transactionRepository.findByAccountId(
                1L, PageRequest.of(0, 100, NEWEST_FIRST)).getContent().stream()
                .filter(transaction -> transaction.getBookedAt()
                        .equals(Instant.parse("2026-08-24T10:00:00Z")))
                .toList();

        assertThat(firstPage.getTotalElements()).isEqualTo(24);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
        assertThat(firstPage.getContent()).hasSize(20);
        assertThat(finalPage.getContent()).hasSize(4);
        assertThat(beyondFinalPage.getContent()).isEmpty();
        assertThat(equalTimeTransactions).extracting(AccountTransaction::getDescription)
                .containsExactly("Equal-time later booking", "Equal-time first booking");
        assertThat(equalTimeTransactions).extracting(AccountTransaction::getId)
                .isSortedAccordingTo((first, second) -> Long.compare(second, first));
    }

    @Test
    void shouldKeepOriginalTransactionWhenAReversalIsRecorded() {
        List<AccountTransaction> transactions = transactionRepository.findByAccountId(
                1L, PageRequest.of(0, 100, NEWEST_FIRST)).getContent();

        AccountTransaction original = transactions.stream()
                .filter(transaction -> transaction.getDescription().equals("Card purchase at stationer"))
                .findFirst()
                .orElseThrow();
        AccountTransaction reversal = transactions.stream()
                .filter(transaction -> transaction.getDescription().equals("Card purchase reversal"))
                .findFirst()
                .orElseThrow();

        assertThat(original.getId()).isNotEqualTo(reversal.getId());
        assertThat(original.getAmount()).isEqualByComparingTo("-9.99000000");
        assertThat(reversal.getAmount()).isEqualByComparingTo("9.99000000");
    }
}
