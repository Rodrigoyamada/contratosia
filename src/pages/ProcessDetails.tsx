import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { supabase } from '../lib/supabaseClient';
import type { Process, Document } from '../types';
import { Button } from '../components/ui/Button';
import { FileText, Edit2, Trash2 } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { DFDEditor } from '../components/DFDEditor';
import { ETPEditor } from '../components/ETPEditor';
import { RiskMatrixEditor } from '../components/RiskMatrixEditor';
import { TREditor } from '../components/TREditor';
import { exportToPDF, exportToWord } from '../utils/exportUtils';

// Lock to prevent duplicate document creation (Global to persist across remounts)
const creationLocks = new Set<string>();

export default function ProcessDetails() {
    const { id } = useParams<{ id: string }>();
    const [process, setProcess] = useState<Process | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const { documents, loading: docsLoading, createDocument, updateDocument, deleteDocument } = useDocuments(id || '');

    // Back-to-front deletion: the last doc can always be deleted.
    // Additionally, a blank/draft doc (no generated content) can also be deleted
    // so it doesn't block deletion of preceding documents.
    const DOC_ORDER = ['DFD', 'ETP', 'Matriz de Risco', 'TR'] as const;

    const isDocBlank = (doc: Document): boolean => {
        if (doc.status === 'completed') return false;
        const hasContent = doc.generated_text && doc.generated_text.trim().length > 0;
        return !hasContent;
    };

    const canDelete = (doc: Document): boolean => {
        // Always allow deleting a blank/draft document with no content
        if (isDocBlank(doc)) return true;
        // Otherwise only allow deleting the last document in the chain
        const lastType = [...DOC_ORDER].reverse().find(t => documents.some(d => d.type === t));
        return doc.type === lastType;
    };

    const handleDeleteDoc = async (doc: Document) => {
        setConfirmDeleteId(null);
        await deleteDocument(doc.id);
        // select the previous doc in chain after deletion
        const remaining = documents.filter(d => d.id !== doc.id);
        const prevType = DOC_ORDER[DOC_ORDER.indexOf(doc.type as typeof DOC_ORDER[number]) - 1];
        const prev = remaining.find(d => d.type === prevType) || remaining[remaining.length - 1] || null;
        setSelectedDocument(prev);
    };

    useEffect(() => {
        async function fetchProcess() {
            if (!id) return;
            const { data } = await supabase
                .from('processes')
                .select('*')
                .eq('id', id)
                .single();

            if (data) setProcess(data as Process);
            setLoading(false);
        }
        fetchProcess();
    }, [id]);

    // Auto-create DFD document if none exists
    useEffect(() => {
        if (!docsLoading && documents.length === 0 && id) {
            const lockKey = `${id}-DFD`;
            if (creationLocks.has(lockKey)) return;

            creationLocks.add(lockKey);

            // Safety timeout to release lock if something hangs indefinitely
            setTimeout(() => creationLocks.delete(lockKey), 10000);

            createDocument({
                type: 'DFD',
                title: 'DFD',
                status: 'draft',
                order_index: 0,
            }).then((result) => {
                if (result.data) {
                    setSelectedDocument(result.data as Document);
                }
            }).finally(() => {
                creationLocks.delete(lockKey);
            });
        } else if (documents.length > 0 && !selectedDocument) {
            setSelectedDocument(documents[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documents.length, docsLoading, id]);

    // Auto-create next documents
    useEffect(() => {
        const checkAndCreate = async () => {
            if (docsLoading || !id) return;

            const dfd = documents.find(d => d.type === 'DFD');
            const etp = documents.find(d => d.type === 'ETP');
            const riskMatrix = documents.find(d => d.type === 'Matriz de Risco');
            const tr = documents.find(d => d.type === 'TR');

            // Create ETP if DFD is completed and ETP doesn't exist
            if (dfd?.status === 'completed' && !etp) {
                const lockKey = `${id}-ETP`;
                if (!creationLocks.has(lockKey)) {
                    creationLocks.add(lockKey);
                    // Safety timeout
                    setTimeout(() => creationLocks.delete(lockKey), 10000);

                    try {
                        // Double check server side
                        const { data: existing } = await supabase
                            .from('documents')
                            .select('id')
                            .eq('process_id', id)
                            .eq('type', 'ETP')
                            .maybeSingle();

                        if (!existing) {
                            await createDocument({
                                type: 'ETP',
                                title: 'ETP',
                                status: 'draft',
                                order_index: 1,
                            });
                        }
                    } finally {
                        creationLocks.delete(lockKey);
                    }
                }
            }

            // Create Risk Matrix if ETP is completed and Matrix doesn't exist
            if (etp?.status === 'completed' && !riskMatrix) {
                const lockKey = `${id}-Matriz de Risco`;
                if (!creationLocks.has(lockKey)) {
                    creationLocks.add(lockKey);
                    // Safety timeout
                    setTimeout(() => creationLocks.delete(lockKey), 10000);

                    try {
                        // Double check server side
                        const { data: existing } = await supabase
                            .from('documents')
                            .select('id')
                            .eq('process_id', id)
                            .eq('type', 'Matriz de Risco')
                            .maybeSingle();

                        if (!existing) {
                            await createDocument({
                                type: 'Matriz de Risco',
                                title: 'Matriz de Risco',
                                status: 'draft',
                                order_index: 2,
                            });
                        }
                    } finally {
                        creationLocks.delete(lockKey);
                    }
                }
            }

            // Create TR if Risk Matrix is completed and TR doesn't exist
            if (riskMatrix?.status === 'completed' && !tr) {
                const lockKey = `${id}-TR`;
                if (!creationLocks.has(lockKey)) {
                    creationLocks.add(lockKey);
                    // Safety timeout
                    setTimeout(() => creationLocks.delete(lockKey), 10000);

                    try {
                        // Double check server side
                        const { data: existing } = await supabase
                            .from('documents')
                            .select('id')
                            .eq('process_id', id)
                            .eq('type', 'TR')
                            .maybeSingle();

                        if (!existing) {
                            await createDocument({
                                type: 'TR',
                                title: 'TR',
                                status: 'draft',
                                order_index: 3,
                            });
                        }
                    } finally {
                        creationLocks.delete(lockKey);
                    }
                }
            }
        };

        checkAndCreate();
    }, [documents, docsLoading, id, createDocument]);

    const handleSaveDocument = async (updates: Partial<Document>) => {
        if (!selectedDocument) return;

        console.log('ProcessDetails: Salvando documento', selectedDocument.id, updates);
        const result = await updateDocument(selectedDocument.id, updates);

        if (result.error) {
            console.error('ProcessDetails: Erro ao salvar documento:', result.error);
            throw new Error(result.error);
        }

        if (result.data) {
            console.log('ProcessDetails: Documento salvo com sucesso!', result.data);
            setSelectedDocument(result.data as Document);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </AppLayout>
        );
    }

    if (!process) {
        return (
            <AppLayout>
                <div className="text-center p-12">Processo não encontrado.</div>
            </AppLayout>
        );
    }

    return (
        <AppLayout noPadding>
            <div className="min-h-full flex flex-col p-2 md:p-4">
                <div className="flex flex-col flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-2 rounded-t-xl shrink-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{process.title}</h1>
                                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    {process.nup && <span>NUP: {process.nup}</span>}
                                    {process.contract_number && <span>Nº Contratação: {process.contract_number}</span>}
                                </div>
                            </div>
                            <Button variant="ghost" size="sm">
                                <Edit2 className="h-4 w-4 mr-2" />
                                Editar Informações
                            </Button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex flex-1">
                        {/* Sidebar - Document Tree */}
                        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto rounded-bl-xl">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Documentos</h2>
                            <div className="space-y-3">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className={`border rounded-lg p-3 transition-colors ${selectedDocument?.id === doc.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setSelectedDocument(doc)}
                                            className="w-full text-left flex items-center gap-2 mb-2"
                                        >
                                            {doc.status === 'completed' ? (
                                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                                            )}
                                            <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">{doc.type === 'TR' ? 'TR' : doc.title}</span>
                                            {/* Delete icon */}
                                            <button
                                                onClick={e => { e.stopPropagation(); if (canDelete(doc)) setConfirmDeleteId(doc.id); }}
                                                disabled={!canDelete(doc)}
                                                title={canDelete(doc) ? `Apagar ${doc.title}` : 'Apague os documentos posteriores primeiro'}
                                                className={`ml-auto p-0.5 rounded transition-colors ${canDelete(doc)
                                                    ? 'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer'
                                                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                    }`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </button>

                                        {/* Inline delete confirmation */}
                                        {confirmDeleteId === doc.id && (
                                            <div className="ml-7 mt-1 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                                                <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-2">
                                                    Apagar <strong>{doc.title}</strong>? Esta ação não pode ser desfeita.
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="flex-1 text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDoc(doc)}
                                                        className="flex-1 text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                                                    >
                                                        Apagar
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Export links - only show for completed documents */}
                                        {doc.status === 'completed' && confirmDeleteId !== doc.id && (
                                            <div className="ml-7 space-y-1 text-xs">
                                                <button
                                                    onClick={async () => {
                                                        const result = await exportToPDF(doc, process?.title || 'Processo');
                                                        if (!result.success) {
                                                            alert(result.error);
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Exportar PDF
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const result = await exportToWord(doc, process?.title || 'Processo');
                                                        if (!result.success) {
                                                            alert(result.error);
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Exportar Word
                                                </button>
                                            </div>
                                        )}
                                        {/* TR Progress bar in sidebar */}
                                        {doc.type === 'TR' && (() => {
                                            let saved = 0;
                                            try {
                                                const parsed = JSON.parse(doc.generated_text || '{}');
                                                if (parsed?.blocos) {
                                                    saved = ['bloco1', 'bloco2', 'bloco3', 'bloco4', 'bloco5']
                                                        .filter(k => parsed.blocos[k] !== null && parsed.blocos[k] !== undefined).length;
                                                }
                                            } catch { }
                                            return (
                                                <div className="ml-7 mt-1.5">
                                                    <div className="flex gap-1 mb-0.5">
                                                        {[1, 2, 3, 4, 5].map(i => (
                                                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= saved ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{saved}/5 blocos</p>
                                                </div>
                                            );
                                        })()}

                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Editor Area */}
                        <div className="flex-1 p-6">
                            <div className="pb-16 max-w-5xl mx-auto">{selectedDocument ? (
                                <div>
                                    {selectedDocument.type !== 'TR' && (
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                            {selectedDocument.type === 'ETP' ? `${selectedDocument.title} - Estudo Técnico Preliminar` : selectedDocument.title}
                                        </h2>
                                    )}
                                    {selectedDocument.type === 'DFD' && (
                                        <DFDEditor
                                            key={selectedDocument.id}
                                            document={selectedDocument}
                                            onSave={handleSaveDocument}
                                        />
                                    )}
                                    {selectedDocument.type === 'ETP' && (
                                        <ETPEditor
                                            key={selectedDocument.id}
                                            document={selectedDocument}
                                            dfdDocument={documents.find(d => d.type === 'DFD')!}
                                            objectNature={process?.object_nature || ''}
                                            onSave={handleSaveDocument}
                                        />
                                    )}
                                    {selectedDocument.type === 'Matriz de Risco' && (
                                        <RiskMatrixEditor
                                            key={selectedDocument.id}
                                            document={selectedDocument}
                                            etpDocument={documents.find(d => d.type === 'ETP')}
                                            onSave={handleSaveDocument}
                                        />
                                    )}
                                    {selectedDocument.type === 'TR' && (
                                        <TREditor
                                            key={selectedDocument.id}
                                            document={selectedDocument}
                                            onSave={handleSaveDocument}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 dark:text-gray-400 mt-12">
                                    Selecione um documento para editar
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
