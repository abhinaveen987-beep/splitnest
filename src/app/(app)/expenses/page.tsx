import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { Receipt, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

async function deleteExpense(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  if (!id) return;

  await supabase.from('expenses').delete().eq('id', id);
  revalidatePath('/expenses');
  revalidatePath('/balances');
  revalidatePath('/dashboard');
}

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

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session) return null;

  const currentUserId = session.user.id;

  // Fetch all expenses ordered by date descending, including linked settlements
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, users!payer_id(name), expense_splits(user_id, amount, users(name)), settlements(amount, payer_id)')
    .order('date', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Expense History</h1>
        <p className="text-gray-400 text-sm">All recorded group expenses and split tracking.</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {(!expenses || expenses.length === 0) ? (
          <div className="p-8 text-center text-gray-500">
            No expenses found.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {expenses.map((expense) => {
              const isPayer = expense.payer_id === currentUserId;
              const mySplit = expense.expense_splits.find((s: any) => s.user_id === currentUserId);
              
              return (
                <div key={expense.id} className="p-4 md:p-6 hover:bg-white/5 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mt-1 md:mt-0 shrink-0">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-100 text-lg flex items-center gap-2">
                          {expense.title}
                          <span className="text-[10px] uppercase bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-medium">
                            {expense.category}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          Paid by <span className="text-gray-200 font-medium">{expense.users.name}</span>
                        </div>
                        {expense.notes && (
                          <div className="text-sm text-gray-500 italic mt-1">"{expense.notes}"</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-border/50 pt-4 md:pt-0 shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-gray-100 text-xl">₹{parseFloat(expense.amount).toFixed(2)}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {isPayer ? 'You paid' : (mySplit ? `Your share: ₹${parseFloat(mySplit.amount).toFixed(2)}` : 'Not involved')}
                        </div>
                      </div>
                      
                      <form action={deleteExpense} className="md:mt-2">
                        <input type="hidden" name="id" value={expense.id} />
                        <button 
                          type="submit"
                          className="text-gray-500 hover:text-danger transition-colors p-2 rounded-lg hover:bg-danger/10 flex items-center gap-1 text-sm"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="md:hidden">Delete</span>
                        </button>
                      </form>
                    </div>

                  </div>
                  
                  {/* Splits Breakdown */}
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="text-xs text-gray-500 mb-2 uppercase font-medium tracking-wider">Split Tracking</div>
                    <div className="flex flex-col gap-2">
                      {expense.expense_splits.map((split: any) => {
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
                              <span className="text-gray-300 font-medium">{split.users.name}</span>
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
