package com.neueda.capstone.transaction;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "account_transaction")
public class AccountTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "booked_at", nullable = false)
    private Instant bookedAt;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(nullable = false, precision = 19, scale = 8)
    private BigDecimal amount;

    @Column(name = "running_balance", nullable = false, precision = 19, scale = 8)
    private BigDecimal runningBalance;

    protected AccountTransaction() {
    }

    public AccountTransaction(Long accountId, Instant bookedAt, String description,
                              BigDecimal amount, BigDecimal runningBalance) {
        this.accountId = accountId;
        this.bookedAt = bookedAt;
        this.description = description;
        this.amount = amount;
        this.runningBalance = runningBalance;
    }

    public Long getId() {
        return id;
    }

    public Long getAccountId() {
        return accountId;
    }

    public Instant getBookedAt() {
        return bookedAt;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public BigDecimal getRunningBalance() {
        return runningBalance;
    }
}
