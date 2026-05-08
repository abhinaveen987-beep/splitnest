import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

async function addSettlement(formData: FormData) {
  'use server';
  const session = await getSession();
  if (!session) return;

  const receiverId = formData.get('receiverId') as string;
  const amount = parseFloat(formData.get('amount') as string);
  
  if (!receiverId || isNaN(amount) || amount <= 0) return;

  await supabase.from('settlements').insert({
    payer_id: session.user.id,
    receiver_id: receiverId,
    amount: amount,
    status: 'COMPLETED',
    date: new Date().toISOString()
  });

  revalidatePath('/settlements');
  revalidatePath('/balances');
  revalidatePath('/dashboard');
  redirect('/balances');
}

export default async function SettlementsPage({ searchParams }: { searchParams: { payTo?: string, amount?: string } }) {
  const session = await getSession();
  if (!session) return null;

  const currentUserId = session.user.id;

  const { data: users } = await supabase.from('users').select('id, name');
  const otherUsers = users?.filter(u => u.id !== currentUserId) || [];
  const userMap = new Map(users?.map(u => [u.id, u.name]));

  const { data: settlements } = await supabase
    .from('settlements')
    .select('*')
    .or(`payer_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('date', { ascending: false });

  // Use searchParams for pre-filling the form if navigated from Balances page
  const prefillPayTo = searchParams.payTo || (otherUsers.length > 0 ? otherUsers[0].id : '');
  const prefillAmount = searchParams.amount || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settlements</h1>
        <p className="text-gray-400 text-sm">Record payments and view past settlements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Record Payment Form */}
        <div className="glass-card p-6 rounded-2xl h-fit border-primary/20">
          <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Record Payment
          </h2>
          <form action={addSettlement} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Pay To</label>
              <select
                name="receiverId"
                defaultValue={prefillPayTo}
                required
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                {otherUsers.map(u => (
                  <option key={u.id} value={u.id} className="bg-gray-900 text-white">{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Amount (₹)</label>
              <input
                type="number"
                name="amount"
                step="0.01"
                defaultValue={prefillAmount}
                required
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                placeholder="0.00"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg shadow-lg shadow-primary/20 transition-all mt-4"
            >
              Mark as Paid
            </button>
          </form>
        </div>

        {/* Settlement History */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-gray-200">Past Settlements</h2>
          </div>
          <div className="divide-y divide-border/50">
            {settlements?.map((s) => {
              const isPayer = s.payer_id === currentUserId;
              const otherPersonName = isPayer ? userMap.get(s.receiver_id) : userMap.get(s.payer_id);
              
              return (
                <div key={s.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isPayer ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                    }`}>
                      {otherPersonName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-200 flex items-center gap-2">
                        {isPayer ? 'You paid' : `${otherPersonName} paid you`}
                        {isPayer && <ArrowRight className="w-3 h-3 text-gray-500" />}
                        {isPayer && <span className="text-gray-400">{otherPersonName}</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(s.date), 'MMM dd, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold ${isPayer ? 'text-danger' : 'text-success'}`}>
                    {isPayer ? '-' : '+'}₹{parseFloat(s.amount).toFixed(2)}
                  </div>
                </div>
              );
            })}
            
            {settlements?.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No settlements yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
