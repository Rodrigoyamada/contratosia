import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Process } from '../types';
import { useAuth } from './useAuth';

export function useProcesses() {
    const { user } = useAuth();
    const [processes, setProcesses] = useState<Process[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProcesses = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('processes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProcesses(data as Process[]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProcesses();
    }, [fetchProcesses]);

    const createProcess = async (processData: Partial<Process>) => {
        if (!user) return { error: 'User not authenticated' };

        try {
            const { data, error } = await supabase
                .from('processes')
                .insert([{ ...processData, user_id: user.id }])
                .select()
                .single();

            if (error) throw error;

            setProcesses((prev) => [data as Process, ...prev]);
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err.message };
        }
    };

    const updateProcess = async (id: string, updates: Partial<Process>) => {
        try {
            const { data, error } = await supabase
                .from('processes')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setProcesses((prev) =>
                prev.map((p) => (p.id === id ? (data as Process) : p))
            );
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err.message };
        }
    };

    const deleteProcess = async (id: string) => {
        try {
            const { error } = await supabase
                .from('processes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProcesses((prev) => prev.filter((p) => p.id !== id));
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    };

    return {
        processes,
        loading,
        error,
        fetchProcesses,
        createProcess,
        updateProcess,
        deleteProcess,
    };
}
