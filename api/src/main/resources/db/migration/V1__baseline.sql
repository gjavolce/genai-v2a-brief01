CREATE TABLE customer (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    reference     VARCHAR(32)  NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    phone         VARCHAR(30)  NOT NULL,
    date_of_birth DATE         NOT NULL,
    address_line  VARCHAR(255) NOT NULL,
    city          VARCHAR(100) NOT NULL,
    postcode      VARCHAR(16)  NOT NULL,
    status        VARCHAR(16)  NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_customer_reference UNIQUE (reference),
    CONSTRAINT uk_customer_email UNIQUE (email)
);

CREATE TABLE audit_event (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    event_type  VARCHAR(64)  NOT NULL,
    entity_type VARCHAR(64)  NOT NULL,
    entity_id   BIGINT       NOT NULL,
    actor       VARCHAR(128) NOT NULL,
    occurred_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    KEY idx_audit_event_entity (entity_type, entity_id)
);

INSERT INTO customer (reference, first_name, last_name, email, phone, date_of_birth, address_line, city, postcode, status, created_at) VALUES
('CUS-00000001', 'Aisha',    'Rahman',    'aisha.rahman@example.com',    '+44 7700 900101', '1985-03-14', '12 Kingsway',          'London',     'WC2B 6UN', 'ACTIVE',   '2024-01-08 09:12:00.000000'),
('CUS-00000002', 'Tomasz',   'Nowak',     'tomasz.nowak@example.com',    '+44 7700 900102', '1978-11-02', '4 Ashfield Road',      'Manchester', 'M14 6TR',  'ACTIVE',   '2024-01-09 10:41:00.000000'),
('CUS-00000003', 'Grace',    'Okonkwo',   'grace.okonkwo@example.com',   '+44 7700 900103', '1992-06-25', '88 Bristol Street',    'Birmingham', 'B5 7AA',   'ACTIVE',   '2024-01-11 14:03:00.000000'),
('CUS-00000004', 'Callum',   'Fraser',    'callum.fraser@example.com',   '+44 7700 900104', '1990-09-30', '17 Leith Walk',        'Edinburgh',  'EH6 8NX',  'ACTIVE',   '2024-01-15 08:55:00.000000'),
('CUS-00000005', 'Priya',    'Iyer',      'priya.iyer@example.com',      '+44 7700 900105', '1983-02-17', '203 Cowley Road',      'Oxford',     'OX4 1XF',  'ACTIVE',   '2024-01-19 16:22:00.000000'),
('CUS-00000006', 'Daniel',   'Osei',      'daniel.osei@example.com',     '+44 7700 900106', '1975-07-08', '9 Queen Square',       'Bristol',    'BS1 4NT',  'INACTIVE', '2024-01-22 11:30:00.000000'),
('CUS-00000007', 'Eleanor',  'Whitfield', 'eleanor.whitfield@example.com','+44 7700 900107','1968-12-01', '31 Micklegate',        'York',       'YO1 6JH',  'ACTIVE',   '2024-02-02 09:47:00.000000'),
('CUS-00000008', 'Mateusz',  'Kowalski',  'mateusz.kowalski@example.com','+44 7700 900108', '1995-04-19', '77 Deansgate',         'Manchester', 'M3 2FW',   'ACTIVE',   '2024-02-06 13:18:00.000000'),
('CUS-00000009', 'Fatima',   'Ali',       'fatima.ali@example.com',      '+44 7700 900109', '1988-08-23', '5 Park Row',           'Leeds',      'LS1 5HD',  'ACTIVE',   '2024-02-11 15:05:00.000000'),
('CUS-00000010', 'Owen',     'Pritchard', 'owen.pritchard@example.com',  '+44 7700 900110', '1981-05-12', '46 St Mary Street',    'Cardiff',    'CF10 1AD', 'ACTIVE',   '2024-02-14 10:09:00.000000'),
('CUS-00000011', 'Sofia',    'Moretti',   'sofia.moretti@example.com',   '+44 7700 900111', '1993-10-04', '120 Union Street',     'Aberdeen',   'AB10 1QR', 'ACTIVE',   '2024-02-20 12:36:00.000000'),
('CUS-00000012', 'Harun',    'Yilmaz',    'harun.yilmaz@example.com',    '+44 7700 900112', '1979-01-27', '14 Green Lanes',       'London',     'N16 9ND',  'INACTIVE', '2024-02-27 17:52:00.000000'),
('CUS-00000013', 'Niamh',    'Doherty',   'niamh.doherty@example.com',   '+44 7700 900113', '1997-03-09', '62 Botanic Avenue',    'Belfast',    'BT7 1JR',  'ACTIVE',   '2024-03-04 08:24:00.000000'),
('CUS-00000014', 'Samuel',   'Adeyemi',   'samuel.adeyemi@example.com',  '+44 7700 900114', '1986-11-15', '8 London Road',        'Leicester',  'LE2 0QB',  'ACTIVE',   '2024-03-08 11:11:00.000000'),
('CUS-00000015', 'Chloe',    'Bennett',   'chloe.bennett@example.com',   '+44 7700 900115', '1991-07-21', '25 The Hayes',         'Cardiff',    'CF10 1AH', 'ACTIVE',   '2024-03-12 14:44:00.000000'),
('CUS-00000016', 'Ravi',     'Chandra',   'ravi.chandra@example.com',    '+44 7700 900116', '1974-09-06', '150 Broad Street',     'Birmingham', 'B15 1DT',  'ACTIVE',   '2024-03-18 09:38:00.000000'),
('CUS-00000017', 'Isabelle', 'Laurent',   'isabelle.laurent@example.com','+44 7700 900117', '1989-12-30', '3 Abbey Road',         'Bath',       'BA1 1LZ',  'ACTIVE',   '2024-03-25 16:07:00.000000'),
('CUS-00000018', 'Jack',     'Sutherland','jack.sutherland@example.com', '+44 7700 900118', '1996-02-11', '41 Sauchiehall Street','Glasgow',    'G2 3DH',   'ACTIVE',   '2024-04-02 10:53:00.000000'),
('CUS-00000019', 'Amara',    'Nwosu',     'amara.nwosu@example.com',     '+44 7700 900119', '1984-06-03', '19 Fargate',           'Sheffield',  'S1 2HD',   'INACTIVE', '2024-04-09 13:29:00.000000'),
('CUS-00000020', 'Lewis',    'Hargreaves','lewis.hargreaves@example.com','+44 7700 900120', '1971-04-28', '7 Bold Street',        'Liverpool',  'L1 4DS',   'ACTIVE',   '2024-04-16 15:16:00.000000');
