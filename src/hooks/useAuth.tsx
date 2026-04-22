import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    signIn: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('useAuth: Initializing auth state...');
        const abortController = new AbortController();
        let isSubscribed = true;
        let timeoutId: ReturnType<typeof setTimeout>;

        const initAuth = async () => {
            try {
                // Set a timeout to ensure loading doesn't hang indefinitely
                timeoutId = setTimeout(() => {
                    if (isSubscribed && loading) {
                        console.warn('useAuth: Auth initialization timeout - setting loading to false');
                        setLoading(false);
                    }
                }, 10000); // 10 second timeout

                const { data: { session }, error } = await supabase.auth.getSession();

                if (abortController.signal.aborted || !isSubscribed) {
                    console.log('useAuth: Request aborted or component unmounted');
                    clearTimeout(timeoutId);
                    return;
                }

                if (error) {
                    console.error('useAuth: Error getting session:', error);
                    clearTimeout(timeoutId);
                    setLoading(false);
                    return;
                }

                console.log('useAuth: Got session:', session ? 'exists' : 'null');
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    console.log('useAuth: Fetching profile for user:', session.user.id);
                    await fetchProfile(session.user.id);
                } else {
                    console.log('useAuth: No session, setting loading to false');
                    setLoading(false);
                }

                clearTimeout(timeoutId);
            } catch (error: any) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError' || abortController.signal.aborted) {
                    console.log('useAuth: Request aborted (expected in dev mode)');
                    return;
                }
                console.error('useAuth: Exception in initAuth:', error);
                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isSubscribed) return;

            console.log('useAuth: Auth state changed:', _event, session ? 'exists' : 'null');
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            isSubscribed = false;
            clearTimeout(timeoutId);
            abortController.abort();
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        console.log('useAuth: fetchProfile called for:', userId);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('useAuth: Error fetching profile:', error);
                // Even if profile fetch fails, we should still set loading to false
                setLoading(false);
                return;
            }

            if (data) {
                console.log('useAuth: Profile fetched successfully:', data);
                setProfile(data as Profile);
            } else {
                console.warn('useAuth: No profile data returned');
            }
        } catch (error) {
            console.error('useAuth: Exception in fetchProfile:', error);
        } finally {
            console.log('useAuth: Setting loading to false');
            setLoading(false);
        }
    };

    const signIn = async () => {
        // Basic implementation - extended in login page logic
        // This function is mostly a placeholder for complex logic if needed
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
    };

    const value = {
        user,
        session,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}> {children} </AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
