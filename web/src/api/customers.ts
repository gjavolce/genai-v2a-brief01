export type CustomerStatus = 'ACTIVE' | 'INACTIVE'

export interface Customer {
  id: number
  reference: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  addressLine: string
  city: string
  postcode: string
  status: CustomerStatus
}

export async function fetchCustomers(): Promise<Customer[]> {
  const response = await fetch('/api/customers')

  if (!response.ok) {
    throw new Error(`The API returned ${response.status}`)
  }

  return response.json()
}
