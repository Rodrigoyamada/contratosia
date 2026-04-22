import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Document } from '../types';
import { useAuth } from './useAuth';

export function useDocuments(processId: string) {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDocuments = useCallback(async () => {
        if (!user || !processId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('process_id', processId)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setDocuments(data as Document[]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user, processId]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const createDocument = useCallback(async (documentData: Partial<Document>) => {
        if (!user) return { error: 'User not authenticated' };

        try {
            const { data, error } = await supabase
                .from('documents')
                .insert([{ ...documentData, process_id: processId }])
                .select()
                .single();

            if (error) throw error;

            setDocuments((prev) => [...prev, data as Document]);
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err.message };
        }
    }, [user, processId]);

    const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
        try {
            const { data, error } = await supabase
                .from('documents')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setDocuments((prev) =>
                prev.map((d) => (d.id === id ? (data as Document) : d))
            );
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err.message };
        }
    }, []);

    const deleteDocument = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setDocuments((prev) => prev.filter((d) => d.id !== id));
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    }, []);

    return {
        documents,
        loading,
        error,
        fetchDocuments,
        createDocument,
        updateDocument,
        deleteDocument,
    };
}
