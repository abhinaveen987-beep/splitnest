'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PlusCircle, Receipt, Users, Wallet } from 'lucide-react';

const CATEGORIES = ['Room Rent', 'Electricity Bill', 'WiFi Bill', 'Electronics', 'Groceries', 'Water', 'Others'];

export default function AddExpensePage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [payerId, setPayerId] = useState('');
  const [splitType, setSplitType] = useState('EQUAL'); // EQUAL or CUSTOM
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('id, name');
      if (data) {
        setUsers(data);
        if (data.length > 0) {
          setPayerId(data[0].id);
          setSelectedUsers(data.map(u => u.id));
        }
      }
    };
    fetchUsers();
  }, []);

  const handleUserToggle = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(u => u !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!title || !amount || !payerId) {
      setError('Please fill in all required fields.');
      return;
    }

    if (selectedUsers.length === 0) {
      setError('Please select at least one user to split with.');
      return;
    }

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    const finalCategory = category === 'Others' ? customCategory : category;

    // Calculate Splits
    const splits = [];
    if (splitType === 'EQUAL') {
      const splitAmount = (totalAmount / selectedUsers.length).toFixed(2);
      for (const userId of selectedUsers) {
        splits.push({ user_id: userId, amount: splitAmount });
      }
    } else {
      let customTotal = 0;
      for (const userId of selectedUsers) {
        const amt = parseFloat(customSplits[userId] || '0');
        customTotal += amt;
        splits.push({ user_id: userId, amount: amt.toFixed(2) });
      }
      
      // Allow a small margin of error for float precision (e.g., 0.01)
      if (Math.abs(customTotal - totalAmount) > 0.05) {
        setError(`Custom split total (₹${customTotal.toFixed(2)}) must equal the expense amount (₹${totalAmount.toFixed(2)}).`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category: finalCategory,
          amount: totalAmount,
          payer_id: payerId,
          split_type: splitType,
          date,
          notes,
          splits
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Add Expense</h1>
        <p className="text-gray-400 text-sm">Track a new shared expense.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Details */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-primary" />
            1. Expense Details
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="E.g., May Rent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-lg"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-gray-900 text-white">{cat}</option>
                ))}
              </select>
            </div>
            {category === 'Others' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Custom Category Name</label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="e.g. Netflix"
                />
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Any additional details..."
            />
          </div>
        </div>

        {/* Step 2: Who Paid */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-primary" />
            2. Who Paid?
          </h2>
          <select
            value={payerId}
            onChange={e => setPayerId(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          >
            {users.map(u => (
              <option key={u.id} value={u.id} className="bg-gray-900 text-white">{u.name}</option>
            ))}
          </select>
        </div>

        {/* Step 3: Split Type */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            3. Split Type
          </h2>
          
          <div className="flex bg-black/40 p-1 rounded-lg w-full max-w-xs mb-6 border border-border">
            <button
              type="button"
              onClick={() => setSplitType('EQUAL')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                splitType === 'EQUAL' ? 'bg-primary text-primary-foreground shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Equal Split
            </button>
            <button
              type="button"
              onClick={() => setSplitType('CUSTOM')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                splitType === 'CUSTOM' ? 'bg-primary text-primary-foreground shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Custom Amount
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Select Users involved:</label>
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white/5 hover:bg-white/10 transition-colors">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => handleUserToggle(u.id)}
                    className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary/50 bg-black/50"
                  />
                  <span className="text-gray-200 font-medium">{u.name}</span>
                </label>
                
                {splitType === 'CUSTOM' && selectedUsers.includes(u.id) && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={customSplits[u.id] || ''}
                      onChange={e => setCustomSplits({ ...customSplits, [u.id]: e.target.value })}
                      className="w-24 bg-input border border-border rounded-md px-2 py-1 text-right text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>
                )}
                
                {splitType === 'EQUAL' && selectedUsers.includes(u.id) && amount && (
                  <div className="text-gray-400 font-mono text-sm">
                    ₹{(parseFloat(amount) / selectedUsers.length).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-500 text-primary-foreground font-semibold py-4 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
        >
          {loading ? 'Saving...' : <><PlusCircle className="w-5 h-5" /> Save Expense</>}
        </button>
      </form>
    </div>
  );
}
