package com.neueda.capstone.customer;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.neueda.capstone.common.AuditService;
import com.neueda.capstone.common.NotFoundException;
import com.neueda.capstone.common.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2024-05-01T09:00:00Z"), ZoneOffset.UTC);

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private AuditService auditService;

    private CustomerService customerService;

    @BeforeEach
    void setUp() {
        customerService = new CustomerService(customerRepository, new CustomerMapper(), auditService, FIXED_CLOCK);
    }

    @Test
    void shouldReturnAllCustomers() {
        when(customerRepository.findAll()).thenReturn(List.of(existingCustomer()));

        List<CustomerDto> customers = customerService.findAll();

        assertThat(customers).hasSize(1);
        assertThat(customers.getFirst().email()).isEqualTo("aisha.rahman@example.com");
    }

    @Test
    void shouldReturnCustomerById() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(existingCustomer()));

        CustomerDto customer = customerService.findById(1L);

        assertThat(customer.firstName()).isEqualTo("Aisha");
        assertThat(customer.status()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    void shouldThrowNotFoundWhenCustomerDoesNotExist() {
        when(customerRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.findById(99L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void shouldCreateCustomerAndWriteAnAuditEvent() {
        when(customerRepository.existsByEmail("new.customer@example.com")).thenReturn(false);
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CustomerDto created = customerService.create(newCustomerRequest(), "officer-42");

        assertThat(created.email()).isEqualTo("new.customer@example.com");
        assertThat(created.status()).isEqualTo(CustomerStatus.ACTIVE);
        verify(auditService).record(eq("CUSTOMER_CREATED"), eq("Customer"), any(), eq("officer-42"));
    }

    @Test
    void shouldRejectDuplicateEmail() {
        when(customerRepository.existsByEmail("new.customer@example.com")).thenReturn(true);

        assertThatThrownBy(() -> customerService.create(newCustomerRequest(), "officer-42"))
                .isInstanceOf(ValidationException.class);

        verify(customerRepository, never()).save(any(Customer.class));
        verify(auditService, never()).record(anyString(), anyString(), any(), anyString());
    }

    @Test
    void shouldGiveEveryNewCustomerAReference() {
        when(customerRepository.existsByEmail(anyString())).thenReturn(false);
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ArgumentCaptor<Customer> saved = ArgumentCaptor.forClass(Customer.class);

        customerService.create(newCustomerRequest(), "officer-42");

        verify(customerRepository).save(saved.capture());
        assertThat(saved.getValue().getReference()).startsWith("CUS-");
        assertThat(saved.getValue().getCreatedAt()).isEqualTo(Instant.parse("2024-05-01T09:00:00Z"));
    }

    private Customer existingCustomer() {
        return new Customer(
                "CUS-00000001",
                "Aisha",
                "Rahman",
                "aisha.rahman@example.com",
                "+44 7700 900101",
                LocalDate.of(1985, 3, 14),
                "12 Kingsway",
                "London",
                "WC2B 6UN",
                CustomerStatus.ACTIVE,
                Instant.parse("2024-01-08T09:12:00Z"));
    }

    private CreateCustomerRequest newCustomerRequest() {
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
