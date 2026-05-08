import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Wallet, TrendingUp, TrendingDown, Users } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';

async function payExpenseShare(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session) return;
  
  const expenseId = formData.get('expenseId') as string;
  const receiverId = formData.get('receiverId') as string;
  const amount = parseFloat(formData.get('amount') as string);
  
  if (!expenseId || !receiverId || isNaN(amount) || amount <= 0) return;
  
  await supabase.from('settlements').insert({
    payer_id: session.user.id,
    receiver_id: receiverId,
    expense_id: expenseId,
    amount: amount,
    status: 'COMPLETED',
    date: new Date().toISOString()
  });
  
  revalidatePath('/expenses');
  revalidatePath('/balances');
  revalidatePath('/dashboard');
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const currentUserId = session.user.id;

  // Fetch all users
  const { data: usersData } = await supabase.from('users').select('id');
  const totalMembers = usersData?.length || 0;

  // Fetch all expenses where user is involved
  const { data: allExpenses } = await supabase
    .from('expenses')
    .select('*, expense_splits(*, users(name)), users!payer_id(name), settlements(amount, payer_id)')
    .order('date', { ascending: false });

  const { data: allSettlements } = await supabase.from('settlements').select('*');

  let totalExpensesPaidByMe = 0;
  let iOwe = 0;
  let iAmOwed = 0;

  const recentExpenses = [];
  const balances: Record<string, Record<string, number>> = {};

  const addDebt = (debtor: string, creditor: string, amount: number) => {
    if (debtor === creditor) return;
    if (!balances[debtor]) balances[debtor] = {};
    balances[debtor][creditor] = (balances[debtor][creditor] || 0) + amount;
  };

  if (allExpenses) {
    for (const expense of allExpenses) {
      const payer = expense.payer_id;
      if (payer === currentUserId) {
        totalExpensesPaidByMe += parseFloat(expense.amount);
      }
      
      let involved = payer === currentUserId;
      for (const split of expense.expense_splits) {
        addDebt(split.user_id, payer, parseFloat(split.amount));
        if (split.user_id === currentUserId) involved = true;
      }

      if (involved && recentExpenses.length < 5) {
        recentExpenses.push(expense);
      }
    }
  }

  // Adjust balances based on settlements
  if (allSettlements) {
    for (const settlement of allSettlements) {
      addDebt(settlement.payer_id, settlement.receiver_id, -parseFloat(settlement.amount));
    }
  }

  // Net the balances pairwise
  const netBalances: Record<string, Record<string, number>> = {};
  Object.keys(balances).forEach(debtor => {
    Object.keys(balances[debtor]).forEach(creditor => {
      const debt = balances[debtor][creditor];
      const credit = balances[creditor]?.[debtor] || 0;
      const net = debt - credit;
      if (net > 0.01) {
        if (!netBalances[debtor]) netBalances[debtor] = {};
        netBalances[debtor][creditor] = net;
      }
    });
  });

  // Calculate my total Owe and Owed from the netted matrix
  if (netBalances[currentUserId]) {
    for (const amount of Object.values(netBalances[currentUserId])) {
      iOwe += amount;
    }
  }

  for (const debts of Object.values(netBalances)) {
    if (debts[currentUserId]) {
      iAmOwed += debts[currentUserId];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 hidden md:block">Dashboard</h1>
          <p className="text-gray-400 text-sm md:mt-1">Here's your expense overview.</p>
        </div>
        <Link 
          href="/expenses/add"
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          Add Expense
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-medium">Total Paid</span>
          </div>
          <div className="text-2xl font-bold text-gray-100">₹{totalExpensesPaidByMe.toFixed(2)}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border-danger/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingDown className="w-12 h-12 text-danger" />
          </div>
          <div className="flex items-center gap-2 text-danger mb-2 relative z-10">
            <TrendingDown className="w-4 h-4" />
            <span className="text-sm font-medium">You Owe</span>
          </div>
          <div className="text-2xl font-bold text-gray-100 relative z-10">₹{iOwe.toFixed(2)}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between border-success/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-12 h-12 text-success" />
          </div>
          <div className="flex items-center gap-2 text-success mb-2 relative z-10">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">You Get</span>
          </div>
          <div className="text-2xl font-bold text-gray-100 relative z-10">₹{iAmOwed.toFixed(2)}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Total Members</span>
          </div>
          <div className="text-2xl font-bold text-gray-100">{totalMembers}</div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Recent Expenses</h2>
        <div className="glass-card rounded-2xl overflow-hidden">
          {recentExpenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No recent expenses found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentExpenses.map((expense: any) => {
                const isPayer = expense.payer_id === currentUserId;
                return (
                <div key={expense.id} className="p-4 flex flex-col hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 font-bold shrink-0">
                        {expense.title.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-200">{expense.title}</div>
                        <div className="text-xs text-gray-500 flex gap-2">
                          <span>{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                          <span>•</span>
                          <span>Paid by {expense.users?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-gray-100">₹{parseFloat(expense.amount).toFixed(2)}</div>
                      <div className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full inline-block mt-1">
                        {expense.category}
                      </div>
                    </div>
                  </div>

                  {/* Splits Breakdown */}
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="text-xs text-gray-500 mb-2 uppercase font-medium tracking-wider">Split Tracking</div>
                    <div className="flex flex-col gap-2">
                      {expense.expense_splits?.map((split: any) => {
                        const splitAmount = parseFloat(split.amount);
                        let paidAmount = 0;
                        
                        if (split.user_id === expense.payer_id) {
                          paidAmount = splitAmount; // Payer inherently absorbed their share
                        } else if (expense.settlements) {
                          for (const set of expense.settlements) {
                            if (set.payer_id === split.user_id) {
                              paidAmount += parseFloat(set.amount);
                            }
                          }
                        }
                        
                        const remaining = Math.max(0, splitAmount - paidAmount);
                        const isFullyPaid = remaining <= 0.01;
                        const isMyOwedSplit = split.user_id === currentUserId && !isPayer;

                        return (
                          <div key={split.user_id} className="bg-black/40 border border-border p-3 rounded-lg text-sm flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-300 font-medium">{split.users?.name || 'Unknown'}</span>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-300 font-mono">₹{splitAmount.toFixed(2)}</span>
                              
                              {isFullyPaid ? (
                                <span className="text-success text-xs bg-success/10 border border-success/20 px-2 py-0.5 rounded ml-auto font-medium tracking-wide">PAID</span>
                              ) : (
                                <span className="text-danger text-xs bg-danger/10 border border-danger/20 px-2 py-0.5 rounded ml-auto font-medium tracking-wide">
                                  PENDING: ₹{remaining.toFixed(2)}
                                </span>
                              )}
                            </div>
                            
                            {/* Payment Actions for the specific user */}
                            {isMyOwedSplit && !isFullyPaid && (
                              <div className="flex flex-wrap items-center gap-2 mt-1 pt-3 border-t border-white/5">
                                <form action={payExpenseShare}>
                                  <input type="hidden" name="expenseId" value={expense.id} />
                                  <input type="hidden" name="receiverId" value={expense.payer_id} />
                                  <input type="hidden" name="amount" value={remaining.toFixed(2)} />
                                  <button type="submit" className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-3 py-1.5 rounded transition-colors shadow shadow-primary/20">
                                    Pay Full (₹{remaining.toFixed(2)})
                                  </button>
                                </form>
                                <form action={payExpenseShare} className="flex gap-2">
                                  <input type="hidden" name="expenseId" value={expense.id} />
                                  <input type="hidden" name="receiverId" value={expense.payer_id} />
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
                                    <input 
                                      type="number" 
                                      name="amount" 
                                      max={remaining.toFixed(2)} 
                                      step="0.01" 
                                      required 
                                      placeholder="Amount" 
                                      className="w-24 pl-5 pr-2 py-1.5 text-xs bg-input border border-border rounded text-foreground focus:outline-none focus:border-primary/50 transition-colors" 
                                    />
                                  </div>
                                  <button type="submit" className="text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-3 py-1.5 rounded transition-colors">
                                    Custom Pay
                                  </button>
                                </form>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
