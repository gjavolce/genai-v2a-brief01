CREATE TABLE account (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    customer_id    BIGINT        NOT NULL,
    account_name   VARCHAR(100)  NOT NULL,
    account_number VARCHAR(34)   NOT NULL,
    currency       VARCHAR(3)    NOT NULL,
    balance        DECIMAL(19,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_account_customer FOREIGN KEY (customer_id) REFERENCES customer (id),
    CONSTRAINT uk_account_number UNIQUE (account_number),
    KEY idx_account_customer (customer_id)
);

INSERT INTO account (customer_id, account_name, account_number, currency, balance) VALUES
(1, 'Everyday Current', 'GB00MERIDIAN00000001', 'GBP', 1234.50),
(1, 'Rainy Day Saver', 'GB00MERIDIAN00000002', 'GBP', 2500.75),
(2, 'Everyday Current', 'GB00MERIDIAN00000003', 'GBP', 987.65),
(3, 'Everyday Current', 'GB00MERIDIAN00000004', 'GBP', 0.00);
