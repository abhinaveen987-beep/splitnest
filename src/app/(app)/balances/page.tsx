import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import Link from 'next/link';

export default async function BalancesPage() {
  const session = await getSession();
  if (!session) return null;

  const currentUserId = session.user.id;

  // Fetch all users to map names
  const { data: users } = await supabase.from('users').select('id, name');
  const userMap = new Map(users?.map(u => [u.id, u.name]));

  // Fetch expenses and splits
  const { data: expenses } = await supabase.from('expenses').select('id, amount, payer_id, expense_splits(user_id, amount)');
  
  // Fetch settlements
  const { data: settlements } = await supabase.from('settlements').select('payer_id, receiver_id, amount');

  // balances[userA][userB] = amount userA owes userB
  const balances: Record<string, Record<string, number>> = {};

  const addDebt = (debtor: string, creditor: string, amount: number) => {
    if (debtor === creditor) return;
    if (!balances[debtor]) balances[debtor] = {};
    balances[debtor][creditor] = (balances[debtor][creditor] || 0) + amount;
  };

  if (expenses) {
    for (const exp of expenses) {
      const payer = exp.payer_id;
      for (const split of exp.expense_splits) {
        addDebt(split.user_id, payer, parseFloat(split.amount));
      }
    }
  }

  // Apply settlements
  if (settlements) {
    for (const set of settlements) {
      addDebt(set.payer_id, set.receiver_id, -parseFloat(set.amount));
    }
  }

  // Net the balances
  // If A owes B 100 and B owes A 40, net is A owes B 60.
  const netBalances: Record<string, Record<string, number>> = {};
  
  Object.keys(balances).forEach(debtor => {
    Object.keys(balances[debtor]).forEach(creditor => {
      const debt = balances[debtor][creditor];
      const credit = balances[creditor]?.[debtor] || 0;
      
      const net = debt - credit;
      if (net > 0.01) { // Ignore small float precision issues
        if (!netBalances[debtor]) netBalances[debtor] = {};
        netBalances[debtor][creditor] = net;
      }
    });
  });

  const iOweList = [];
  const iGetList = [];

  // Extract what I owe
  if (netBalances[currentUserId]) {
    for (const [creditor, amount] of Object.entries(netBalances[currentUserId])) {
      iOweList.push({ userId: creditor, name: userMap.get(creditor), amount });
    }
  }

  // Extract what I get
  for (const [debtor, debts] of Object.entries(netBalances)) {
    if (debts[currentUserId]) {
      iGetList.push({ userId: debtor, name: userMap.get(debtor), amount: debts[currentUserId] });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Pay & Get</h1>
        <p className="text-gray-400 text-sm">See who you owe and who owes you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* You Owe Section */}
        <div className="glass-card rounded-2xl overflow-hidden border-danger/20 relative">
          <div className="p-6 border-b border-border bg-danger/5">
            <h2 className="text-lg font-semibold text-danger flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5" />
              You Owe
            </h2>
          </div>
          <div className="p-2">
            {iOweList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                You're all settled up!
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {iOweList.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center font-bold">
                        {item.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-medium text-gray-200">{item.name}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-danger">₹{item.amount.toFixed(2)}</div>
                      </div>
                      <Link 
                        href={`/settlements?payTo=${item.userId}&amount=${item.amount}`}
                        className="bg-danger/10 hover:bg-danger/20 text-danger px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        Settle
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* You Get Section */}
        <div className="glass-card rounded-2xl overflow-hidden border-success/20 relative">
          <div className="p-6 border-b border-border bg-success/5">
            <h2 className="text-lg font-semibold text-success flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5" />
              You Will Get
            </h2>
          </div>
          <div className="p-2">
            {iGetList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No one owes you right now.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {iGetList.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center font-bold">
                        {item.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-medium text-gray-200">{item.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-success">₹{item.amount.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
