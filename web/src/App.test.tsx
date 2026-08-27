import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App, { formatBookedAt, formatMoney } from './App'

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

function failedResponse(): Promise<Response> {
  return Promise.resolve(new Response('', { status: 500 }))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
})

describe('account view', () => {
  it('shows selected customer accounts with masked numbers and exact balances', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response([customer]))
      .mockReturnValueOnce(response(customer))
      .mockReturnValueOnce(response([{
        id: 1,
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

  it('loads history from the account action and stores the selected ids in the URL', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response([customer]))
      .mockReturnValueOnce(response(customer))
      .mockReturnValueOnce(response([{
        id: 1,
        accountName: 'Everyday Current',
        accountNumber: '****************0001',
        currency: 'GBP',
        balance: '1234.50000000',
      }]))
      .mockReturnValueOnce(response({
        items: [{
          bookedAt: '2026-08-25T13:30:00Z',
          description: 'Precision payment',
          amount: '-84.23999999',
          runningBalance: '1234.50000000',
          currency: 'GBP',
        }],
        page: 0,
        size: 20,
        totalElements: 24,
        totalPages: 2,
      }))

    render(<App />)
    fireEvent.click(await screen.findByText('Aisha Rahman'))
    fireEvent.click(await screen.findByRole('button', { name: 'View history' }))

    expect(await screen.findByText('Precision payment')).toBeTruthy()
    expect(screen.getByText('Debit')).toBeTruthy()
    expect(screen.getByText('GBP -84.23999999')).toBeTruthy()
    expect(screen.getByText('GBP 1234.50')).toBeTruthy()
    expect(screen.getByText('24 transactions')).toBeTruthy()
    expect(screen.getByText('Page 1 of 2')).toBeTruthy()
    expect(window.location.search).toBe('?customerId=1&accountId=1')
    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows an empty transaction state after selecting an account', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response([customer]))
      .mockReturnValueOnce(response(customer))
      .mockReturnValueOnce(response([{
        id: 1,
        accountName: 'Everyday Current',
        accountNumber: '****************0001',
        currency: 'GBP',
        balance: '1234.50000000',
      }]))
      .mockReturnValueOnce(response({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }))

    render(<App />)
    fireEvent.click(await screen.findByText('Aisha Rahman'))
    fireEvent.click(await screen.findByRole('button', { name: 'View history' }))

    expect(await screen.findByText('No transactions recorded.')).toBeTruthy()
  })

  it('clears transaction rows and shows an error when the history request fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response([customer]))
      .mockReturnValueOnce(response(customer))
      .mockReturnValueOnce(response([{
        id: 1,
        accountName: 'Everyday Current',
        accountNumber: '****************0001',
        currency: 'GBP',
        balance: '1234.50000000',
      }]))
      .mockReturnValueOnce(failedResponse())

    render(<App />)
    fireEvent.click(await screen.findByText('Aisha Rahman'))
    fireEvent.click(await screen.findByRole('button', { name: 'View history' }))

    expect((await screen.findByRole('alert')).textContent)
      .toContain('Could not load transaction history: The API returned 500')
    expect(screen.queryByText('No transactions recorded.')).toBeNull()
  })

  it('loads page zero after a browser refresh with selected URL parameters', async () => {
    window.history.replaceState({}, '', '/?customerId=1&accountId=1')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response([customer]))
      .mockReturnValueOnce(response(customer))
      .mockReturnValueOnce(response([{
        id: 1,
        accountName: 'Everyday Current',
        accountNumber: '****************0001',
        currency: 'GBP',
        balance: '1234.50000000',
      }]))
      .mockReturnValueOnce(response({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }))

    render(<App />)

    expect(await screen.findByText('No transactions recorded.')).toBeTruthy()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/customers/1/accounts/1/transactions?page=0&size=20')
  })

  it('shows full descriptions and enables only the available page controls', async () => {
    const description = 'A'.repeat(255)
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response([customer]))
      .mockReturnValueOnce(response(customer))
      .mockReturnValueOnce(response([{
        id: 1,
        accountName: 'Everyday Current',
        accountNumber: '****************0001',
        currency: 'GBP',
        balance: '1234.50000000',
      }]))
      .mockReturnValueOnce(response({
        items: [{
          bookedAt: '2026-08-25T13:30:00Z',
          description,
          amount: '12.50000000',
          runningBalance: '1247.00000000',
          currency: 'GBP',
        }],
        page: 0,
        size: 20,
        totalElements: 21,
        totalPages: 2,
      }))
      .mockReturnValueOnce(response({
        items: [],
        page: 1,
        size: 20,
        totalElements: 21,
        totalPages: 2,
      }))

    render(<App />)
    fireEvent.click(await screen.findByText('Aisha Rahman'))
    fireEvent.click(await screen.findByRole('button', { name: 'View history' }))

    expect(await screen.findByText(description)).toBeTruthy()
    expect(screen.getByText('Credit')).toBeTruthy()
    expect(screen.getByText('GBP +12.50')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/customers/1/accounts/1/transactions?page=1&size=20',
    ))
    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('transaction formatting', () => {
  it('formats London times and exact decimal strings without rounding', () => {
    expect(formatBookedAt('2026-08-25T13:30:00Z')).toBe('25 Aug 2026, 14:30')
    expect(formatBookedAt('2026-01-25T13:30:00Z')).toBe('25 Jan 2026, 13:30')
    expect(formatMoney('GBP', '12.50000000', true)).toBe('GBP +12.50')
    expect(formatMoney('GBP', '-84.23999999', true)).toBe('GBP -84.23999999')
    expect(formatMoney('GBP', '1.23040000')).toBe('GBP 1.2304')
  })
})
