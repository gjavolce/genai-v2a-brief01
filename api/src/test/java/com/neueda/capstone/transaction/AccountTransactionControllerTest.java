package com.neueda.capstone.transaction;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.neueda.capstone.common.NotFoundException;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AccountTransactionController.class)
class AccountTransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountTransactionService transactionService;

    @Test
    void shouldReturnTransactionPageWithDefaultPaging() throws Exception {
        when(transactionService.findForCustomerAccount(1L, 1L, 0, 20)).thenReturn(new TransactionPageDto(
                List.of(new TransactionItemDto(null, "Final balance adjustment", "-448.49543211",
                        "1234.50000000", "GBP")),
                0, 20, 24, 2));

        mockMvc.perform(get("/api/customers/1/accounts/1/transactions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].description").value("Final balance adjustment"))
                .andExpect(jsonPath("$.items[0].amount").value("-448.49543211"))
                .andExpect(jsonPath("$.items[0].runningBalance").value("1234.50000000"))
                .andExpect(jsonPath("$.items[0].currency").value("GBP"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(24))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void shouldReturnFixedValidationFailureForInvalidPaging() throws Exception {
        mockMvc.perform(get("/api/customers/1/accounts/1/transactions").queryParam("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.detail").value("The request is invalid."))
                .andExpect(jsonPath("$.items").doesNotExist());
    }

    @Test
    void shouldReturnFixedValidationFailureForMalformedAccountIdentifier() throws Exception {
        mockMvc.perform(get("/api/customers/1/accounts/not-an-id/transactions"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.detail").value("The request is invalid."))
                .andExpect(jsonPath("$.items").doesNotExist());
    }

    @Test
    void shouldReturnGenericNotFoundForUnownedAccount() throws Exception {
        when(transactionService.findForCustomerAccount(1L, 3L, 0, 20))
                .thenThrow(new NotFoundException("Account not found."));

        mockMvc.perform(get("/api/customers/1/accounts/3/transactions"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Not found"))
                .andExpect(jsonPath("$.detail").value("Account not found."))
                .andExpect(jsonPath("$.items").doesNotExist());
    }
}
