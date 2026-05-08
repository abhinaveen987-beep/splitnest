import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Check if any users exist
    const { data: users, error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      return NextResponse.json({ error: 'Database error', details: error }, { status: 500 });
    }

    if (users && users.length > 0) {
      return NextResponse.json({ message: 'Setup already completed. Users exist.' });
    }

    // Hash the password for the initial admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create the admin user
    const { data: newUser, error: insertError } = await supabase.from('users').insert({
      name: 'Sourav',
      email: 'admin@splitnest.com',
      password: hashedPassword,
      role: 'ADMIN'
    }).select().single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create admin user', details: insertError }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Initial admin user created.',
      credentials: {
        email: 'admin@splitnest.com',
        password: 'admin123'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
