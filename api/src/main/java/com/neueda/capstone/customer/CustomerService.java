package com.neueda.capstone.customer;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.neueda.capstone.common.AuditService;
import com.neueda.capstone.common.NotFoundException;
import com.neueda.capstone.common.ValidationException;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerMapper customerMapper;
    private final AuditService auditService;
    private final Clock clock;

    public CustomerService(CustomerRepository customerRepository, CustomerMapper customerMapper,
                           AuditService auditService, Clock clock) {
        this.customerRepository = customerRepository;
        this.customerMapper = customerMapper;
        this.auditService = auditService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<CustomerDto> findAll() {
        return customerRepository.findAll().stream()
                .map(customerMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerDto findById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("No customer with id " + id));

        return customerMapper.toDto(customer);
    }

    @Transactional
    public CustomerDto create(CreateCustomerRequest request, String actor) {
        if (customerRepository.existsByEmail(request.email())) {
            throw new ValidationException("A customer with that email already exists.");
        }

        Customer saved = customerRepository.save(new Customer(
                nextReference(),
                request.firstName(),
                request.lastName(),
                request.email(),
                request.phone(),
                request.dateOfBirth(),
                request.addressLine(),
                request.city(),
                request.postcode(),
                CustomerStatus.ACTIVE,
                Instant.now(clock)));

        auditService.record("CUSTOMER_CREATED", "Customer", saved.getId(), actor);

        return customerMapper.toDto(saved);
    }

    private String nextReference() {
        return "CUS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
