import { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { useProcesses } from '../hooks/useProcesses';
import type { Process } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ProcessForm } from '../components/ProcessForm';
import { Plus, Edit2, ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Processes() {
    const { processes, loading, error, deleteProcess, fetchProcesses } = useProcesses();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProcess, setEditingProcess] = useState<Process | undefined>(undefined);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [processToDelete, setProcessToDelete] = useState<Process | null>(null);

    const handleCreateNew = () => {
        setEditingProcess(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (process: Process) => {
        setEditingProcess(process);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (process: Process) => {
        setProcessToDelete(process);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!processToDelete) return;

        console.log('Deleting process:', processToDelete.id);
        const result = await deleteProcess(processToDelete.id);
        if (result.error) {
            alert(`Erro ao excluir processo: ${result.error}`);
            console.error('Delete error:', result.error);
        } else {
            console.log('Process deleted successfully');
        }

        setIsDeleteModalOpen(false);
        setProcessToDelete(null);
    };

    const handleCancelDelete = () => {
        setIsDeleteModalOpen(false);
        setProcessToDelete(null);
    };

    const handleSuccess = () => {
        setIsModalOpen(false);
        fetchProcesses();
    };

    return (
        <AppLayout>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processos</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Gerencie seus documentos de formalização da demanda
                    </p>
                </div>
                <Button onClick={handleCreateNew}>
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Criar Novo Processo
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : error ? (
                <div className="rounded-md bg-red-50 p-4 text-red-800">
                    Erro ao carregar processos: {error}
                </div>
            ) : processes.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum processo</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Comece criando um novo processo de contratação.
                    </p>
                    <div className="mt-6">
                        <Button onClick={handleCreateNew}>
                            <Plus className="-ml-1 mr-2 h-5 w-5" />
                            Criar Novo Processo
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {processes.map((process) => (
                        <div
                            key={process.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <Badge
                                        variant={
                                            process.status === 'concluido'
                                                ? 'success'
                                                : process.status === 'em_andamento'
                                                    ? 'warning'
                                                    : 'default'
                                        }
                                    >
                                        {process.status === 'concluido'
                                            ? 'Concluído'
                                            : process.status === 'em_andamento'
                                                ? 'Em Andamento'
                                                : 'Rascunho'}
                                    </Badge>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(process.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                                    {process.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                    {process.description}
                                </p>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(process)}>
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    Editar
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDeleteClick(process)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Link to={`/processes/${process.id}`}>
                                        <Button size="sm" variant="secondary">
                                            Continuar
                                            <ArrowRight className="ml-1 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProcess ? 'Editar Processo' : 'Novo Processo'}
            >
                <ProcessForm
                    initialData={editingProcess}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={handleCancelDelete}
                title="Confirmar Exclusão"
            >
                <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        Deseja realmente excluir definitivamente o processo{' '}
                        <strong className="text-gray-900 dark:text-white">
                            "{processToDelete?.title}"
                        </strong>
                        ?
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-3 justify-end pt-4">
                        <Button
                            variant="ghost"
                            onClick={handleCancelDelete}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Excluir Definitivamente
                        </Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}

function FileText(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );
}
