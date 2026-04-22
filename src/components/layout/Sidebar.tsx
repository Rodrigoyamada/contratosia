import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Home, Users, FileText } from 'lucide-react';

export function Sidebar({ isOpen }: { isOpen: boolean }) {
    const { profile } = useAuth();

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-10 w-64 transform bg-white dark:bg-gray-800 shadow-md transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                } md:static md:translate-x-0 pt-16 md:pt-0`}
        >
            <div className="flex h-full flex-col overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 p-2 md:p-4">
                <ul className="space-y-2 font-medium">
                    <li>
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                `flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group ${isActive ? 'bg-gray-100 dark:bg-gray-700' : ''
                                }`
                            }
                        >
                            <Home className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                            <span className="ml-3">Dashboard</span>
                        </NavLink>
                    </li>

                    <li>
                        <NavLink
                            to="/processes"
                            className={({ isActive }) =>
                                `flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group ${isActive ? 'bg-gray-100 dark:bg-gray-700' : ''
                                }`
                            }
                        >
                            <FileText className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                            <span className="ml-3">Processos</span>
                        </NavLink>
                    </li>

                    {profile?.role === 'admin' && (
                        <li>
                            <NavLink
                                to="/users"
                                className={({ isActive }) =>
                                    `flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group ${isActive ? 'bg-gray-100 dark:bg-gray-700' : ''
                                    }`
                                }
                            >
                                <Users className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                                <span className="ml-3">Usuários</span>
                            </NavLink>
                        </li>
                    )}
                </ul>
            </div>
        </aside>
    );
}
