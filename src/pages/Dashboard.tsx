import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { useProcesses } from '../hooks/useProcesses';
import { Plus, FileText, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export default function Dashboard() {
    const { profile } = useAuth();
    const { processes, loading, fetchProcesses } = useProcesses();

    useEffect(() => {
        fetchProcesses();
    }, [fetchProcesses]);

    const totalProcesses = processes.length;
    const activeProcesses = processes.filter(p => p.status === 'em_andamento').length;
    const completedProcesses = processes.filter(p => p.status === 'concluido').length;
    const recentProcesses = processes.slice(0, 5);

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Bem-vindo, {profile?.full_name}
                    </h1>
                    <Link
                        to="/processes" // Changing this to list view since creation is modal now, or could trigger modal state if passed via location state
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Gerenciar Processos
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Card 1: Total de Processos */}
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-md p-3">
                                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Total de Processos
                                        </dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900 dark:text-white">
                                                {loading ? '...' : totalProcesses}
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
                            <div className="text-sm">
                                <Link
                                    to="/processes"
                                    className="font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                                >
                                    Ver todos
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Em Andamento */}
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900 rounded-md p-3">
                                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Em Andamento
                                        </dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900 dark:text-white">
                                                {loading ? '...' : activeProcesses}
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Concluídos */}
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-md p-3">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Concluídos
                                        </dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900 dark:text-white">
                                                {loading ? '...' : completedProcesses}
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Processos Recentes
                    </h2>
                    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                                    Carregando...
                                </li>
                            ) : recentProcesses.length === 0 ? (
                                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                                    Nenhum processo recente encontrado.
                                </li>
                            ) : (
                                recentProcesses.map((process) => (
                                    <li key={process.id}>
                                        <Link to={`/processes/${process.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <div className="px-4 py-4 sm:px-6">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-blue-600 truncate dark:text-blue-400">
                                                        {process.title}
                                                    </p>
                                                    <div className="ml-2 flex-shrink-0 flex">
                                                        <Badge variant={process.status === 'concluido' ? 'success' : 'warning'}>
                                                            {process.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="mt-2 sm:flex sm:justify-between">
                                                    <div className="sm:flex">
                                                        <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                            {process.description}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                                                        <p>
                                                            Atualizado em {new Date(process.updated_at || process.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
