import { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { supabase } from '../lib/supabaseClient';
import type { Profile, UserRole } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { User as UserIcon, Shield, ShieldAlert } from 'lucide-react';

export default function Users() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data as Profile[]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleRole = async (userId: string, currentRole: UserRole) => {
        const newRole: UserRole = currentRole === 'admin' ? 'user' : 'admin';

        // Optimistic update
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) {
                throw error;
            }
        } catch (err: any) {
            setError(err.message);
            // Revert optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, role: currentRole } : u));
        }
    };

    return (
        <AppLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciamento de Usuários</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Visualize e gerencie as permissões dos usuários do sistema.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : error ? (
                <div className="rounded-md bg-red-50 p-4 text-red-800">
                    Erro ao carregar usuários: {error}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((user) => (
                            <li key={user.id}>
                                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                                                <UserIcon className="h-6 w-6" />
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {user.full_name || 'Usuário sem nome'}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Cadastrado em {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                                            {user.role}
                                        </Badge>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => toggleRole(user.id, user.role)}
                                            title={user.role === 'admin' ? "Remover admin" : "Tornar admin"}
                                        >
                                            {user.role === 'admin' ? (
                                                <ShieldAlert className="h-4 w-4 text-red-500" />
                                            ) : (
                                                <Shield className="h-4 w-4 text-blue-500" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </AppLayout>
    );
}
