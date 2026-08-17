package com.neueda.capstone.customer;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    List<CustomerDto> findAll() {
        return customerService.findAll();
    }

    @GetMapping("/{id}")
    CustomerDto findById(@PathVariable Long id) {
        return customerService.findById(id);
    }

    @PostMapping
    ResponseEntity<CustomerDto> create(@Valid @RequestBody CreateCustomerRequest request,
                                       @RequestHeader(name = "X-Actor", defaultValue = "system") String actor) {
        CustomerDto created = customerService.create(request, actor);

        return ResponseEntity.created(URI.create("/api/customers/" + created.id())).body(created);
    }
}
