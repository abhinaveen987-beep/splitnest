import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, category, amount, payer_id, split_type, date, notes, splits } = body;

    // Validate
    if (!title || !category || !amount || !payer_id || !split_type || !splits || splits.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert Expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        title,
        category,
        amount,
        payer_id,
        split_type,
        date: date || new Date().toISOString(),
        notes
      })
      .select()
      .single();

    if (expenseError) {
      return NextResponse.json({ error: 'Failed to create expense', details: expenseError }, { status: 500 });
    }

    // Insert Splits
    const splitData = splits.map((s: any) => ({
      expense_id: expense.id,
      user_id: s.user_id,
      amount: s.amount
    }));

    const { error: splitsError } = await supabase
      .from('expense_splits')
      .insert(splitData);

    if (splitsError) {
      // Rollback expense if splits fail (for MVP, we just log, but normally use RPC transaction)
      await supabase.from('expenses').delete().eq('id', expense.id);
      return NextResponse.json({ error: 'Failed to create splits', details: splitsError }, { status: 500 });
    }

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
