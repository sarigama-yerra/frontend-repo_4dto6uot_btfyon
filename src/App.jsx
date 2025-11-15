import { useEffect, useMemo, useState } from 'react'

function numberOrZero(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

export default function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    no_inv: '',
    item_name: '',
    qty: 1,
    harga: 0,
    ppn_percent: 11,
  })
  const [editingKey, setEditingKey] = useState(null) // store original no_inv when editing

  const subtotal = useMemo(() => numberOrZero(form.qty) * numberOrZero(form.harga), [form.qty, form.harga])
  const ppnAmount = useMemo(() => subtotal * (numberOrZero(form.ppn_percent) / 100), [subtotal, form.ppn_percent])
  const total = useMemo(() => subtotal + ppnAmount, [subtotal, ppnAmount])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const loadInvoices = async () => {
    resetMessages()
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/invoices`)
      if (!res.ok) throw new Error(`Gagal memuat data: ${res.status}`)
      const data = await res.json()
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'qty' ? (value === '' ? '' : Number(value)) : value }))
  }

  const handleNumberChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const clearForm = () => {
    setForm({ no_inv: '', item_name: '', qty: 1, harga: 0, ppn_percent: 11 })
    setEditingKey(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    resetMessages()

    const payload = {
      no_inv: String(form.no_inv).trim(),
      item_name: String(form.item_name).trim(),
      qty: Number(form.qty) || 0,
      harga: Number(form.harga) || 0,
      ppn_percent: Number(form.ppn_percent) || 0,
    }

    if (!payload.no_inv || !payload.item_name || payload.qty <= 0) {
      setError('Mohon lengkapi data dan pastikan qty > 0')
      return
    }

    try {
      setLoading(true)
      let res
      if (editingKey) {
        // Update; allow changing no_inv
        res = await fetch(`${baseUrl}/invoices/${encodeURIComponent(editingKey)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            no_inv: payload.no_inv !== editingKey ? payload.no_inv : undefined,
            item_name: payload.item_name,
            qty: payload.qty,
            harga: payload.harga,
            ppn_percent: payload.ppn_percent,
          }),
        })
      } else {
        res = await fetch(`${baseUrl}/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Gagal menyimpan data')

      setSuccess(editingKey ? 'Invoice berhasil diperbarui' : 'Invoice berhasil ditambahkan')
      clearForm()
      await loadInvoices()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const editRow = (row) => {
    resetMessages()
    setEditingKey(row.no_inv)
    setForm({
      no_inv: row.no_inv,
      item_name: row.item_name,
      qty: row.qty,
      harga: row.harga,
      ppn_percent: row.ppn_percent,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteRow = async (row) => {
    resetMessages()
    if (!confirm(`Hapus invoice ${row.no_inv}?`)) return
    try {
      setLoading(true)
      const res = await fetch(`${baseUrl}/invoices/${encodeURIComponent(row.no_inv)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail || 'Gagal menghapus invoice')
      }
      setSuccess('Invoice terhapus')
      await loadInvoices()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Manajemen Invoice</h1>

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">{editingKey ? 'Edit Invoice' : 'Tambah Invoice'}</h2>
          {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700">{error}</div>}
          {success && <div className="mb-4 p-3 rounded bg-emerald-50 text-emerald-700">{success}</div>}

          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Invoice</label>
              <input
                name="no_inv"
                value={form.no_inv}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="INV-001"
              />
              <p className="text-xs text-gray-500 mt-1">Harus unik, dapat diedit saat update.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Item</label>
              <input
                name="item_name"
                value={form.item_name}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nama barang/jasa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
              <input
                type="number"
                min={1}
                name="qty"
                value={form.qty}
                onChange={(e) => handleNumberChange('qty', e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
              <input
                type="number"
                step="0.01"
                min={0}
                name="harga"
                value={form.harga}
                onChange={(e) => handleNumberChange('harga', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PPN (%)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                name="ppn_percent"
                value={form.ppn_percent}
                onChange={(e) => handleNumberChange('ppn_percent', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="11"
              />
            </div>

            <div className="bg-gray-50 rounded p-3 flex flex-col justify-center">
              <div className="text-sm text-gray-600">Subtotal</div>
              <div className="text-lg font-semibold">{subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</div>
              <div className="text-sm text-gray-600 mt-2">PPN</div>
              <div className="text-lg font-semibold">{ppnAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</div>
              <div className="text-sm text-gray-600 mt-2">Total</div>
              <div className="text-xl font-bold text-indigo-700">{total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</div>
            </div>

            <div className="md:col-span-3 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
              >
                {editingKey ? 'Simpan Perubahan' : 'Tambah'}
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Data Invoice</h2>
            <button onClick={loadInvoices} className="px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200">Muat Ulang</button>
          </div>

          {loading && <p className="text-gray-500">Memuat...</p>}

          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-3 py-2 text-left">No Inv</th>
                  <th className="border px-3 py-2 text-left">Nama Item</th>
                  <th className="border px-3 py-2 text-right">Qty</th>
                  <th className="border px-3 py-2 text-right">Harga</th>
                  <th className="border px-3 py-2 text-right">PPN (%)</th>
                  <th className="border px-3 py-2 text-right">Total</th>
                  <th className="border px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-6">Belum ada data</td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.no_inv} className="hover:bg-gray-50">
                      <td className="border px-3 py-2">{row.no_inv}</td>
                      <td className="border px-3 py-2">{row.item_name}</td>
                      <td className="border px-3 py-2 text-right">{row.qty}</td>
                      <td className="border px-3 py-2 text-right">{row.harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                      <td className="border px-3 py-2 text-right">{row.ppn_percent}%</td>
                      <td className="border px-3 py-2 text-right">{row.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                      <td className="border px-3 py-2 text-center space-x-2">
                        <button onClick={() => editRow(row)} className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded hover:bg-amber-200">Edit</button>
                        <button onClick={() => deleteRow(row)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Hapus</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 mt-6">Backend: {baseUrl}</div>
      </div>
    </div>
  )
}
