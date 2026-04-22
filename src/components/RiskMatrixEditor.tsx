
import { useState } from 'react';
import { Button } from './ui/Button';
import type { Document } from '../types';
import { generateRiskMatrix } from '../services/n8nService';
import { Save, RefreshCw, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RiskMatrixEditorProps {
    document: Document;
    onSave: (updates: Partial<Document>) => Promise<void>;
    etpDocument?: Document;
}

export function RiskMatrixEditor({ document, onSave, etpDocument }: RiskMatrixEditorProps) {
    const [content, setContent] = useState(document.generated_text || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!etpDocument?.generated_text) {
            setError('O ETP precisa estar concluído e ter conteúdo gerado para gerar a Matriz de Risco.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const result = await generateRiskMatrix(etpDocument.generated_text);

            if (result.error) {
                setError(result.error);
            } else {
                setContent(result.text);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao gerar Matriz de Risco');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!content) return;

        setIsSaving(true);
        setError(null);

        try {
            await onSave({
                generated_text: content,
                status: 'completed'
            });
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar documento');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>{error}</span>
                </div>
            )}

            {!content && !isGenerating ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-center mb-4">
                        <AlertTriangle className="h-12 w-12 text-blue-500 opacity-80" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Gerar Matriz de Risco
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        A Matriz de Risco será gerada automaticamente com base nas informações do Estudo Técnico Preliminar (ETP).
                    </p>
                    <Button onClick={handleGenerate} disabled={!etpDocument?.generated_text}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Gerar Matriz de Risco
                    </Button>
                    {!etpDocument?.generated_text && (
                        <p className="text-sm text-amber-600 mt-4">
                            Necessário concluir o ETP antes de gerar a Matriz de Risco.
                        </p>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-blue-500" />
                            Matriz de Risco
                        </h3>
                        <div className="flex gap-2">
                            {content && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                                    Reprocessar
                                </Button>
                            )}
                        </div>
                    </div>

                    {isGenerating ? (
                        <div className="p-12 flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-500 animate-pulse">Gerando Matriz de Risco com IA...</p>
                        </div>
                    ) : (
                        <div className="max-h-[600px] overflow-y-auto">
                            <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ children, ...props }) => <h1 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '1em', marginBottom: '0.25em' }} {...props}>{children}</h1>,
                                        h2: ({ children, ...props }) => <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.75em', marginBottom: '0.25em' }} {...props}>{children}</h2>,
                                        h3: ({ children, ...props }) => <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.5em', marginBottom: '0.25em' }} {...props}>{children}</h3>,
                                        table: ({ children, ...props }) => (
                                            <table style={{ borderCollapse: 'collapse', width: '100%' }} {...props}>{children}</table>
                                        ),
                                        th: ({ children, ...props }) => (
                                            <th style={{ border: '1px solid #d1d5db', padding: '6px 10px', backgroundColor: 'rgba(0,0,0,0.04)', textAlign: 'left' }} {...props}>{children}</th>
                                        ),
                                        td: ({ children, ...props }) => (
                                            <td style={{ border: '1px solid #d1d5db', padding: '6px 10px' }} {...props}>{children}</td>
                                        ),
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || isGenerating || !content}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Salvando...' : 'Salvar Matriz de Risco'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
