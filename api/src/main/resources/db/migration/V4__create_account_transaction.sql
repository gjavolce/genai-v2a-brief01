CREATE TABLE account_transaction (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    account_id      BIGINT        NOT NULL,
    booked_at       DATETIME(6)   NOT NULL,
    description     VARCHAR(255)  NOT NULL,
    amount          DECIMAL(19,8) NOT NULL,
    running_balance DECIMAL(19,8) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_account_transaction_account
        FOREIGN KEY (account_id) REFERENCES account (id),
    CONSTRAINT chk_account_transaction_description
        CHECK (CHAR_LENGTH(TRIM(description)) > 0),
    KEY idx_account_transaction_account_booked_id (account_id, booked_at DESC, id DESC)
);

INSERT INTO account_transaction
        (account_id, booked_at, description, amount, running_balance)
VALUES
    (1, '2026-08-01 08:00:00.000000', 'Opening balance adjustment', 1000.00000000, 1000.00000000),
    (1, '2026-08-02 09:15:00.000000', 'Salary payment', 1250.00000000, 2250.00000000),
    (1, '2026-08-03 12:30:00.000000', 'Weekly groceries', -84.23999999, 2165.76000001),
    (1, '2026-08-04 07:45:00.000000', 'Travel card top up', -25.00000000, 2140.76000001),
    (1, '2026-08-05 18:20:00.000000', 'Refund from retailer', 12.50000000, 2153.26000001),
    (1, '2026-08-06 11:10:00.000000', 'Utility bill', -111.00000000, 2042.26000001),
    (1, '2026-08-07 16:05:00.000000', 'Coffee shop', -3.45000000, 2038.81000001),
    (1, '2026-08-08 13:25:00.000000', 'Book purchase', -16.99000000, 2021.82000001),
    (1, '2026-08-09 10:40:00.000000', 'Cash withdrawal', -40.00000000, 1981.82000001),
    (1, '2026-08-10 14:50:00.000000', 'Interest payment', 1.12000000, 1982.94000001),
    (1, '2026-08-11 17:35:00.000000', 'Restaurant payment', -48.75000000, 1934.19000001),
    (1, '2026-08-12 08:55:00.000000', 'Mobile phone bill', -22.00000000, 1912.19000001),
    (1, '2026-08-13 19:15:00.000000', 'Card purchase at stationer', -9.99000000, 1902.20000001),
    (1, '2026-08-14 09:05:00.000000', 'Card purchase reversal', 9.99000000, 1912.19000001),
    (1, '2026-08-15 15:40:00.000000', 'Online subscription', -14.99000000, 1897.20000001),
    (1, '2026-08-16 12:10:00.000000', 'Friend repayment', 35.00000000, 1932.20000001),
    (1, '2026-08-17 10:20:00.000000', 'Fuel payment', -52.31000000, 1879.89000001),
    (1, '2026-08-18 18:45:00.000000', 'Cinema tickets', -24.00000000, 1855.89000001),
    (1, '2026-08-19 07:30:00.000000', 'Insurance payment', -66.66000000, 1789.23000001),
    (1, '2026-08-20 16:30:00.000000', 'Marketplace sale', 18.76543210, 1807.99543211),
    (1, '2026-08-21 09:50:00.000000', 'Council tax payment', -120.00000000, 1687.99543211),
    (1, '2026-08-24 10:00:00.000000', 'Equal-time first booking', -10.00000000, 1677.99543211),
    (1, '2026-08-24 10:00:00.000000', 'Equal-time later booking', 5.00000000, 1682.99543211),
    (1, '2026-08-25 14:30:00.000000', 'Final balance adjustment', -448.49543211, 1234.50000000),
    (3, '2026-08-25 14:30:00.000000', 'Unrelated customer transaction', 99.12345678, 1086.77345678);
