package com.neueda.capstone.customer;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neueda.capstone.common.NotFoundException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CustomerController.class)
class CustomerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CustomerService customerService;

    @Test
    void shouldReturnAllCustomers() throws Exception {
        when(customerService.findAll()).thenReturn(List.of(customerDto()));

        mockMvc.perform(get("/api/customers"))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].reference").value("CUS-00000001"))
                .andExpect(jsonPath("$[0].email").value("aisha.rahman@example.com"));
    }

    @Test
    void shouldReturnCustomerById() throws Exception {
        when(customerService.findById(1L)).thenReturn(customerDto());

        mockMvc.perform(get("/api/customers/1"))

                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Aisha"));
    }

    @Test
    void shouldReturnNotFoundWhenCustomerDoesNotExist() throws Exception {
        when(customerService.findById(99L)).thenThrow(new NotFoundException("No customer with id 99"));

        mockMvc.perform(get("/api/customers/99"))

                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Not found"));
    }

    @Test
    void shouldCreateCustomer() throws Exception {
        when(customerService.create(any(CreateCustomerRequest.class), eq("officer-42"))).thenReturn(customerDto());

        mockMvc.perform(post("/api/customers")
                        .header("X-Actor", "officer-42")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))

                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/customers/1"));
    }

    @Test
    void shouldRejectCustomerWithoutAnEmail() throws Exception {
        CreateCustomerRequest invalid = new CreateCustomerRequest(
                "New", "Customer", "", "+44 7700 900999",
                LocalDate.of(1990, 1, 1), "1 High Street", "London", "EC1A 1BB");

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))

                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());
    }

    private CustomerDto customerDto() {
        return new CustomerDto(
                1L,
                "CUS-00000001",
                "Aisha",
                "Rahman",
                "aisha.rahman@example.com",
                "+44 7700 900101",
                LocalDate.of(1985, 3, 14),
                "12 Kingsway",
                "London",
                "WC2B 6UN",
                CustomerStatus.ACTIVE);
    }

    private CreateCustomerRequest validRequest() {
        return new CreateCustomerRequest(
                "New",
                "Customer",
                "new.customer@example.com",
                "+44 7700 900999",
                LocalDate.of(1990, 1, 1),
                "1 High Street",
                "London",
                "EC1A 1BB");
    }
}
