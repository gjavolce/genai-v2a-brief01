package com.neueda.capstone.transaction;

import java.util.List;

public record TransactionPageDto(
        List<TransactionItemDto> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}
