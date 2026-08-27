package com.neueda.capstone.account;

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

@WebMvcTest(AccountController.class)
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accountService;

    @Test
    void shouldReturnSelectedCustomerAccounts() throws Exception {
        when(accountService.findForCustomer(1L)).thenReturn(List.of(
                new AccountDto(1L, "Everyday Current", "****************0001", "GBP", "1234.50000001")));

        mockMvc.perform(get("/api/customers/1/accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].accountName").value("Everyday Current"))
                .andExpect(jsonPath("$[0].accountNumber").value("****************0001"))
                .andExpect(jsonPath("$[0].currency").value("GBP"))
                .andExpect(jsonPath("$[0].balance").value("1234.50000001"));
    }

    @Test
    void shouldIgnoreAnotherCustomersAccountIdentifier() throws Exception {
        when(accountService.findForCustomer(1L)).thenReturn(List.of(
                new AccountDto(1L, "Everyday Current", "****************0001", "GBP", "1234.50000001")));

        mockMvc.perform(get("/api/customers/1/accounts").queryParam("accountId", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].accountNumber").value("****************0001"))
                .andExpect(jsonPath("$[0].accountName").value("Everyday Current"));
    }

    @Test
    void shouldReturnEmptyListWhenSelectedCustomerHasNoAccounts() throws Exception {
        when(accountService.findForCustomer(3L)).thenReturn(List.of());

        mockMvc.perform(get("/api/customers/3/accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void shouldReturnNotFoundWhenSelectedCustomerDoesNotExist() throws Exception {
        when(accountService.findForCustomer(99L))
                .thenThrow(new NotFoundException("No selected customer with id 99"));

        mockMvc.perform(get("/api/customers/99/accounts"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Not found"));
    }
}
