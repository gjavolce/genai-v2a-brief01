import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const customer = {
  id: 1,
  reference: 'CUS-00000001',
  firstName: 'Aisha',
  lastName: 'Rahman',
  email: 'aisha.rahman@example.com',
  phone: '+44 7700 900101',
  dateOfBirth: '1985-03-14',
  addressLine: '12 Kingsway',
  city: 'London',
  postcode: 'WC2B 6UN',
  status: 'ACTIVE' as const,
}

function response(body: unknown): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('account view', () => {
  it('shows selected customer accounts with masked numbers and exact balances', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response([customer]))
      .mockReturnValueOnce(response(customer))
      .mockReturnValueOnce(response([{
        accountName: 'Everyday Current',
        accountNumber: '****************0001',
        currency: 'GBP',
        balance: '1234.50000001',
      }]))

    render(<App />)
    fireEvent.click(await screen.findByText('Aisha Rahman'))

    expect(await screen.findByText('Everyday Current')).toBeTruthy()
    expect(screen.getByText('****************0001')).toBeTruthy()
    expect(screen.getByText('1234.50000001')).toBeTruthy()
  })

  it('shows an empty state when the selected customer has no accounts', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response([customer]))
      .mockReturnValueOnce(response(customer))
      .mockReturnValueOnce(response([]))

    render(<App />)
    fireEvent.click(await screen.findByText('Aisha Rahman'))

    await waitFor(() => expect(screen.getByText('No accounts held.')).toBeTruthy())
  })
})
