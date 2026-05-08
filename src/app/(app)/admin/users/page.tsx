import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { Trash2, UserPlus } from 'lucide-react';

async function addUser(formData: FormData) {
  'use server';
  
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string || 'USER';

  if (!name || !email || !password) return;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await supabase.from('users').insert({
    name,
    email,
    password: hashedPassword,
    role
  });

  revalidatePath('/admin/users');
}

async function deleteUser(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  if (!id) return;

  await supabase.from('users').delete().eq('id', id);
  revalidatePath('/admin/users');
}

export default async function AdminUsersPage() {
  const session = await getSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Manage Users</h1>
        <p className="text-gray-400 text-sm">Add or remove users from SplitNest.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add User Form */}
        <div className="glass-card p-6 rounded-2xl h-fit">
          <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add New User
          </h2>
          <form action={addUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                name="email"
                required
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
              <select
                name="role"
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="USER" className="bg-gray-900 text-white">User</option>
                <option value="ADMIN" className="bg-gray-900 text-white">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg shadow-lg shadow-primary/20 transition-all"
            >
              Create User
            </button>
          </form>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-gray-200">Existing Users</h2>
          </div>
          <div className="divide-y divide-border">
            {users?.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-gray-200 font-bold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-200">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    u.role === 'ADMIN' ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {u.role}
                  </span>
                  
                  {u.id !== session.user.id && (
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <button 
                        type="submit"
                        className="text-gray-500 hover:text-danger transition-colors p-2 rounded-lg hover:bg-danger/10"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
            
            {users?.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No users found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
