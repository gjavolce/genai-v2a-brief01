export interface TransactionItem {
  bookedAt: string
  description: string
  amount: string
  runningBalance: string
  currency: string
}

export interface TransactionPage {
  items: TransactionItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export async function fetchTransactionHistory(
  customerId: number,
  accountId: number,
  page: number,
  size = 20,
): Promise<TransactionPage> {
  const parameters = new URLSearchParams({ page: String(page), size: String(size) })
  const response = await fetch(
    `/api/customers/${customerId}/accounts/${accountId}/transactions?${parameters}`,
  )

  if (!response.ok) {
    throw new Error(`The API returned ${response.status}`)
  }

  return response.json()
}
