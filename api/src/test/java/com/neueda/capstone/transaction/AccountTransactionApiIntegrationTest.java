package com.neueda.capstone.transaction;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class AccountTransactionApiIntegrationTest {

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
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldReturnOwnedHistoryWithExactValuesAndDefaultPaging() throws Exception {
        mockMvc.perform(get(historyPath(1, 1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(20))
                .andExpect(jsonPath("$.items[0].bookedAt").value("2026-08-25T14:30:00Z"))
                .andExpect(jsonPath("$.items[0].amount").value("-448.49543211"))
                .andExpect(jsonPath("$.items[0].runningBalance").value("1234.50000000"))
                .andExpect(jsonPath("$.items[0].currency").value("GBP"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(24))
                .andExpect(jsonPath("$.totalPages").value(2));

        mockMvc.perform(get(historyPath(1, 1)).queryParam("page", "1").queryParam("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(4))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(24));

        mockMvc.perform(get(historyPath(1, 1)).queryParam("page", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(24));
    }

    @Test
    void shouldOrderEqualBookingTimesByLaterIdentifier() throws Exception {
        mockMvc.perform(get(historyPath(1, 1)).queryParam("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[1].description").value("Equal-time later booking"))
                .andExpect(jsonPath("$.items[2].description").value("Equal-time first booking"));
    }

    @Test
    void shouldReturnIdenticalGenericFailuresForEveryOwnershipRefusal() throws Exception {
        MvcResult unowned = mockMvc.perform(get(historyPath(1, 3)))
                .andExpect(status().isNotFound())
                .andReturn();
        MvcResult missingAccount = mockMvc.perform(get(historyPath(1, 99999)))
                .andExpect(status().isNotFound())
                .andReturn();
        MvcResult missingCustomer = mockMvc.perform(get(historyPath(99999, 1)))
                .andExpect(status().isNotFound())
                .andReturn();

        String refusal = unowned.getResponse().getContentAsString();
        assertThat(refusal).isEqualTo(missingAccount.getResponse().getContentAsString());
        assertThat(refusal).isEqualTo(missingCustomer.getResponse().getContentAsString());
        assertThat(refusal).contains("\"title\":\"Not found\"");
        assertThat(refusal).contains("\"detail\":\"Account not found.\"");
        assertThat(refusal).doesNotContain("99999", "accountId", "customerId", "items");
    }

    @Test
    void shouldRejectInvalidRequestsAndExposeNoMutationMethod() throws Exception {
        mockMvc.perform(get(historyPath(1, 1)).queryParam("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.detail").value("The request is invalid."))
                .andExpect(jsonPath("$.items").doesNotExist());

        mockMvc.perform(get("/api/customers/1/accounts/not-an-id/transactions"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.detail").value("The request is invalid."));

        mockMvc.perform(post(historyPath(1, 1)).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(put(historyPath(1, 1)).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(delete(historyPath(1, 1)))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void shouldAcceptEverySupportedPageSizeAndReturnAnOwnedEmptyHistory() throws Exception {
        mockMvc.perform(get(historyPath(1, 1)).queryParam("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.totalElements").value(24));

        mockMvc.perform(get(historyPath(1, 1)).queryParam("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(24))
                .andExpect(jsonPath("$.size").value(100))
                .andExpect(jsonPath("$.totalElements").value(24));

        mockMvc.perform(get(historyPath(1, 2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void shouldReturnIdenticalContentOrderAndTotalForARepeatedRequest() throws Exception {
        MvcResult first = mockMvc.perform(get(historyPath(1, 1)))
                .andExpect(status().isOk())
                .andReturn();
        MvcResult second = mockMvc.perform(get(historyPath(1, 1)))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(second.getResponse().getContentAsString())
                .isEqualTo(first.getResponse().getContentAsString());
    }

    @Test
    void shouldReadCurrentDataWithoutChangingTransactionsAccountsOrAuditEvents() throws Exception {
        long transactionCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM account_transaction WHERE account_id = 1", Long.class);
        BigDecimal balance = jdbcTemplate.queryForObject(
                "SELECT balance FROM account WHERE id = 1", BigDecimal.class);
        long auditCount = count("audit_event");

        mockMvc.perform(get(historyPath(1, 1))).andExpect(status().isOk());
        mockMvc.perform(get(historyPath(1, 3))).andExpect(status().isNotFound());

        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM account_transaction WHERE account_id = 1", Long.class))
                .isEqualTo(transactionCount);
        assertThat(jdbcTemplate.queryForObject("SELECT balance FROM account WHERE id = 1", BigDecimal.class))
                .isEqualByComparingTo(balance);
        assertThat(count("audit_event")).isEqualTo(auditCount);

        jdbcTemplate.update("INSERT INTO account_transaction "
                        + "(account_id, booked_at, description, amount, running_balance) VALUES (?, ?, ?, ?, ?)",
                1L, "2026-08-26 09:00:00.000000", "Current-data verification",
                new BigDecimal("1.00000000"), new BigDecimal("1235.50000000"));
        try {
            mockMvc.perform(get(historyPath(1, 1)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.items[0].description").value("Current-data verification"))
                    .andExpect(jsonPath("$.totalElements").value(transactionCount + 1));
        } finally {
            jdbcTemplate.update("DELETE FROM account_transaction WHERE description = ?", "Current-data verification");
        }
    }

    private String historyPath(long customerId, long accountId) {
        return "/api/customers/" + customerId + "/accounts/" + accountId + "/transactions";
    }

    private long count(String table) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
    }
}
