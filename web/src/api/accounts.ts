export interface Account {
  accountName: string
  accountNumber: string
  currency: string
  balance: string
}

export async function fetchAccounts(customerId: number): Promise<Account[]> {
  const response = await fetch(`/api/customers/${customerId}/accounts`)

  if (!response.ok) {
    throw new Error(`The API returned ${response.status}`)
  }

  return response.json()
}
