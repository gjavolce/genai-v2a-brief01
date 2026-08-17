package com.neueda.capstone.common;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;

/**
 * Every state change writes an audit event, in the same transaction as the change
 * itself. Audit rows are never updated or deleted.
 */
@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;
    private final Clock clock;

    public AuditService(AuditEventRepository auditEventRepository, Clock clock) {
        this.auditEventRepository = auditEventRepository;
        this.clock = clock;
    }

    public void record(String eventType, String entityType, Long entityId, String actor) {
        auditEventRepository.save(new AuditEvent(eventType, entityType, entityId, actor, Instant.now(clock)));
    }
}
