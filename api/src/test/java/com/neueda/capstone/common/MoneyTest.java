package com.neueda.capstone.common;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyTest {

    @Test
    void shouldNormaliseEveryAmountToScaleTwo() {
        Money amount = Money.of("10.1");

        assertThat(amount.amount().scale()).isEqualTo(2);
        assertThat(amount.amount()).isEqualByComparingTo("10.10");
    }

    @Test
    void shouldRoundHalfUpBeyondTwoDecimalPlaces() {
        Money amount = Money.of("10.005");

        assertThat(amount.amount()).isEqualByComparingTo("10.01");
    }

    @Test
    void shouldAddWithoutLosingPennies() {
        Money total = Money.of("0.10").add(Money.of("0.20"));

        assertThat(total).isEqualTo(Money.of("0.30"));
    }

    @Test
    void shouldSubtractWithoutLosingPennies() {
        Money remaining = Money.of("1000.00").subtract(Money.of("333.33"));

        assertThat(remaining).isEqualTo(Money.of("666.67"));
    }

    @Test
    void shouldDivideNonTerminatingDecimalsRatherThanThrowing() {
        Money share = Money.of("1000").divide(BigDecimal.valueOf(3));

        assertThat(share).isEqualTo(Money.of("333.33"));
    }

    @Test
    void shouldDeriveGrossMonthlyIncomeFromAnAnnualFigure() {
        Money monthly = Money.of("31000").divide(BigDecimal.valueOf(12));

        assertThat(monthly).isEqualTo(Money.of("2583.33"));
    }

    @Test
    void shouldTreatTheSameValueAtDifferentScalesAsEqual() {
        assertThat(Money.of("10")).isEqualTo(Money.of("10.00"));
    }

    @Test
    void shouldCompareAgainstABusinessThreshold() {
        Money amount = Money.of("50000.01");

        assertThat(amount.isGreaterThan(Money.of("50000"))).isTrue();
        assertThat(amount.isLessThan(Money.of("50000"))).isFalse();
    }

    @Test
    void shouldRejectANullAmount() {
        assertThatThrownBy(() -> Money.of((BigDecimal) null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
