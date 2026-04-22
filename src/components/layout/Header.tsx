import { useAuth } from '../../hooks/useAuth';
import { LogOut, User as UserIcon } from 'lucide-react';

export function Header() {
    const { profile, signOut } = useAuth();
    return (
        <header className="bg-slate-700 border-b border-slate-800 shadow-sm z-10">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <span className="text-xl font-bold text-white tracking-tight">
                            Contratos<span className="text-blue-200">IA</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-800 dark:text-blue-100 font-medium">
                                {profile?.full_name?.charAt(0) || <UserIcon size={16} />}
                            </div>
                            <div className="hidden md:flex flex-col ml-2 text-left justify-center">
                                <span className="text-sm font-medium text-white leading-tight">
                                    {profile?.full_name}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => signOut()}
                            className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-200 bg-slate-600 hover:bg-slate-500 hover:text-white rounded-md transition-colors border border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-700"
                            title="Sair"
                        >
                            <LogOut className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:block">Sair</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
