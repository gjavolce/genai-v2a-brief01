package com.neueda.capstone.customer;

import java.time.LocalDate;

public record CustomerDto(
        Long id,
        String reference,
        String firstName,
        String lastName,
        String email,
        String phone,
        LocalDate dateOfBirth,
        String addressLine,
        String city,
        String postcode,
        CustomerStatus status) {
}
