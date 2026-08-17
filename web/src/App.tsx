import { useEffect, useState } from 'react'
import { fetchCustomer, fetchCustomers, type Customer } from './api/customers'

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selected, setSelected] = useState<Customer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false))
  }, [])

  function select(id: number) {
    fetchCustomer(id)
      .then(setSelected)
      .catch((cause: Error) => setError(cause.message))
  }

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
              <tr key={customer.id} onClick={() => select(customer.id)}>
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
          <button onClick={() => setSelected(null)}>Close</button>
        </section>
      )}
    </main>
  )
}
