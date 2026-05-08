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

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session) return null;

  const currentUserId = session.user.id;

  // Fetch all expenses ordered by date descending
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, users!payer_id(name), expense_splits(user_id, amount, users(name))')
    .order('date', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Expense History</h1>
        <p className="text-gray-400 text-sm">All recorded group expenses.</p>
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
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mt-1 md:mt-0">
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

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-border/50 pt-4 md:pt-0">
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
                    <div className="text-xs text-gray-500 mb-2 uppercase font-medium tracking-wider">Split Breakdown ({expense.split_type})</div>
                    <div className="flex flex-wrap gap-2">
                      {expense.expense_splits.map((split: any) => (
                        <div key={split.user_id} className="bg-black/40 border border-border px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                          <span className="text-gray-300">{split.users.name}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-200 font-mono">₹{parseFloat(split.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
