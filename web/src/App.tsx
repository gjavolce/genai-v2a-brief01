import { useEffect, useState } from 'react'
import { fetchAccounts, type Account } from './api/accounts'
import { fetchTransactionHistory, type TransactionPage } from './api/transactions'
import { fetchCustomer, fetchCustomers, type Customer } from './api/customers'

interface HistorySelection {
  customerId: number
  accountId: number
}

function readHistorySelection(): HistorySelection | null {
  const parameters = new URLSearchParams(window.location.search)
  const customerId = parameters.get('customerId')
  const accountId = parameters.get('accountId')

  if (!customerId || !accountId || !/^\d+$/.test(customerId) || !/^\d+$/.test(accountId)) {
    return null
  }

  const parsedCustomerId = Number(customerId)
  const parsedAccountId = Number(accountId)
  if (!Number.isSafeInteger(parsedCustomerId) || !Number.isSafeInteger(parsedAccountId)
      || parsedCustomerId < 1 || parsedAccountId < 1) {
    return null
  }

  return { customerId: parsedCustomerId, accountId: parsedAccountId }
}

function writeHistorySelection(selection: HistorySelection | null) {
  const url = new URL(window.location.href)
  if (selection) {
    url.searchParams.set('customerId', String(selection.customerId))
    url.searchParams.set('accountId', String(selection.accountId))
  } else {
    url.searchParams.delete('customerId')
    url.searchParams.delete('accountId')
  }
  window.history.pushState({}, '', url)
}

export function formatBookedAt(bookedAt: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(bookedAt))
}

export function formatMoney(currency: string, value: string, includePlusSign = false): string {
  const negative = value.startsWith('-')
  const unsignedValue = value.replace(/^[+-]/, '')
  const [whole, recordedFraction = ''] = unsignedValue.split('.')
  let fraction = recordedFraction

  while (fraction.length > 2 && fraction.endsWith('0')) {
    fraction = fraction.slice(0, -1)
  }
  fraction = fraction.padEnd(2, '0')

  const sign = negative ? '-' : includePlusSign ? '+' : ''
  return `${currency} ${sign}${whole}.${fraction}`
}

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selected, setSelected] = useState<Customer | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [historySelection, setHistorySelection] = useState<HistorySelection | null>(readHistorySelection)
  const [historyPage, setHistoryPage] = useState(0)
  const [history, setHistory] = useState<TransactionPage | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const selection = readHistorySelection()
    if (selection) {
      selectCustomer(selection.customerId)
    }
  }, [])

  useEffect(() => {
    if (!historySelection) {
      return
    }

    let active = true
    setHistoryLoading(true)
    setHistoryError(null)
    setHistory(null)

    fetchTransactionHistory(historySelection.customerId, historySelection.accountId, historyPage)
      .then((page) => {
        if (active) {
          setHistory(page)
        }
      })
      .catch((cause: Error) => {
        if (active) {
          setHistory(null)
          setHistoryError(cause.message)
        }
      })
      .finally(() => {
        if (active) {
          setHistoryLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [historySelection, historyPage])

  function selectCustomer(id: number) {
    setAccountsLoading(true)
    setAccountsError(null)
    setAccounts([])

    fetchCustomer(id)
      .then(setSelected)
      .catch((cause: Error) => setError(cause.message))

    fetchAccounts(id)
      .then(setAccounts)
      .catch((cause: Error) => setAccountsError(cause.message))
      .finally(() => setAccountsLoading(false))
  }

  function selectCustomerFromList(id: number) {
    writeHistorySelection(null)
    setHistorySelection(null)
    setHistory(null)
    setHistoryError(null)
    setHistoryPage(0)
    selectCustomer(id)
  }

  function viewHistory(accountId: number) {
    const selection = selected ? { customerId: selected.id, accountId } : null
    if (!selection) {
      return
    }

    writeHistorySelection(selection)
    setHistory(null)
    setHistoryError(null)
    setHistoryPage(0)
    setHistorySelection(selection)
  }

  function closeCustomer() {
    writeHistorySelection(null)
    setHistorySelection(null)
    setHistory(null)
    setHistoryError(null)
    setHistoryPage(0)
    setSelected(null)
  }

  const selectedHistoryAccount = historySelection
    ? accounts.find((account) => account.id === historySelection.accountId)
    : null

  return (
    <main>
      <h1>Customers</h1>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">Could not load customers: {error}</p>}

      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Name</th>
              <th>Email</th>
              <th>City</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} onClick={() => selectCustomerFromList(customer.id)}>
                <td>{customer.reference}</td>
                <td>
                  {customer.firstName} {customer.lastName}
                </td>
                <td>{customer.email}</td>
                <td>{customer.city}</td>
                <td>{customer.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <section>
          <h2>
            {selected.firstName} {selected.lastName}
          </h2>
          <dl>
            <dt>Reference</dt>
            <dd>{selected.reference}</dd>
            <dt>Email</dt>
            <dd>{selected.email}</dd>
            <dt>Phone</dt>
            <dd>{selected.phone}</dd>
            <dt>Date of birth</dt>
            <dd>{selected.dateOfBirth}</dd>
            <dt>Address</dt>
            <dd>
              {selected.addressLine}, {selected.city} {selected.postcode}
            </dd>
            <dt>Status</dt>
            <dd>{selected.status}</dd>
          </dl>
          <button onClick={closeCustomer}>Close</button>

          <h3>Accounts</h3>
          {accountsLoading && <p>Loading accounts...</p>}
          {accountsError && <p role="alert">Could not load accounts: {accountsError}</p>}
          {!accountsLoading && !accountsError && accounts.length === 0 && (
            <p>No accounts held.</p>
          )}
          {!accountsLoading && !accountsError && accounts.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Account number</th>
                  <th>Currency</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.accountName}</td>
                    <td>{account.accountNumber}</td>
                    <td>{account.currency}</td>
                    <td>{account.balance}</td>
                    <td>
                      <button onClick={() => viewHistory(account.id)}>View history</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {historySelection && (
            <section aria-labelledby="transaction-history-heading">
              <h3 id="transaction-history-heading">
                Transaction history{selectedHistoryAccount ? `: ${selectedHistoryAccount.accountName}` : ''}
              </h3>
              {historyLoading && <p>Loading transaction history...</p>}
              {historyError && (
                <p role="alert">Could not load transaction history: {historyError}</p>
              )}
              {!historyLoading && !historyError && history && history.totalElements === 0 && (
                <p>No transactions recorded.</p>
              )}
              {!historyLoading && !historyError && history && history.totalElements > 0 && (
                <>
                  <p>{history.totalElements} transactions</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Date and time</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Running balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.items.map((transaction) => {
                        const debit = transaction.amount.startsWith('-')
                        return (
                          <tr key={`${transaction.bookedAt}-${transaction.description}`}>
                            <td>{formatBookedAt(transaction.bookedAt)}</td>
                            <td className="transaction-description">{transaction.description}</td>
                            <td>{debit ? 'Debit' : 'Credit'}</td>
                            <td>{formatMoney(transaction.currency, transaction.amount, true)}</td>
                            <td>{formatMoney(transaction.currency, transaction.runningBalance)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {history.totalPages > 1 && (
                    <nav aria-label="Transaction history pages">
                      <button
                        disabled={historyLoading || history.page === 0}
                        onClick={() => setHistoryPage(history.page - 1)}
                      >
                        Previous
                      </button>
                      <span>Page {history.page + 1} of {history.totalPages}</span>
                      <button
                        disabled={historyLoading || history.page >= history.totalPages - 1}
                        onClick={() => setHistoryPage(history.page + 1)}
                      >
                        Next
                      </button>
                    </nav>
                  )}
                </>
              )}
            </section>
          )}
        </section>
      )}
    </main>
  )
}
