package com.neueda.capstone.customer;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

public record CreateCustomerRequest(

        @NotBlank(message = "first name is required")
        @Size(max = 100)
        String firstName,

        @NotBlank(message = "last name is required")
        @Size(max = 100)
        String lastName,

        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid address")
        @Size(max = 255)
        String email,

        @NotBlank(message = "phone is required")
        @Size(max = 30)
        String phone,

        @NotNull(message = "date of birth is required")
        @Past(message = "date of birth must be in the past")
        LocalDate dateOfBirth,

        @NotBlank(message = "address line is required")
        @Size(max = 255)
        String addressLine,

        @NotBlank(message = "city is required")
        @Size(max = 100)
        String city,

        @NotBlank(message = "postcode is required")
        @Size(max = 16)
        String postcode) {
}
