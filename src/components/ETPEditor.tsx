import { useState } from 'react';
import type { Document } from '../types';
import { Button } from './ui/Button';
import { processETP } from '../services/n8nService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ETPEditorProps {
    document: Document;
    dfdDocument: Document;
    objectNature: string;
    onSave: (updates: Partial<Document>) => Promise<void>;
}

const GUIDING_QUESTIONS = [
    '1. Qual é o possível objeto da contratação?',
    '2. Qual problema administrativo a contratação resolve?',
    '3. Há contrato vigente? Quando encerra?',
    '4. Quantidade estimada?',
    '5. Valor estimado?',
    '6. Prazo estimado de vigência?',
    '7. Existe solução alternativa analisada? Qual?',
];

export function ETPEditor({ document, dfdDocument, objectNature, onSave }: ETPEditorProps) {
    const [userAnswers, setUserAnswers] = useState(document.demand_text || '');
    const [generatedText, setGeneratedText] = useState(document.generated_text || '');
    const [processing, setProcessing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasProcessed, setHasProcessed] = useState(!!document.generated_text);
    const [isRefining, setIsRefining] = useState(false);
    const [refinementInstructions, setRefinementInstructions] = useState('');

    const handleProcessWithAI = async () => {
        if (!userAnswers.trim()) {
            setError('Por favor, responda às perguntas antes de processar.');
            return;
        }

        setProcessing(true);
        setError(null);

        const dfdText = dfdDocument.generated_text || dfdDocument.demand_text || '';
        const result = await processETP(objectNature, userAnswers, dfdText);

        if (result.error) {
            setError(result.error);
        } else {
            setGeneratedText(result.text);
            setHasProcessed(true);
        }

        setProcessing(false);
    };

    const handleRefineWithAI = async () => {
        if (!refinementInstructions.trim()) {
            setError('Por favor, descreva o que deseja aprimorar.');
            return;
        }

        setProcessing(true);
        setError(null);

        // Call the new refinement service
        // We import it dynamically or use the imported one if we updated imports (need to check imports)
        // Assuming refineETP is imported from n8nService
        const { refineETP } = await import('../services/n8nService');
        const result = await refineETP(objectNature, generatedText, userAnswers, refinementInstructions);

        if (result.error) {
            setError(result.error);
        } else {
            setGeneratedText(result.text);
            setIsRefining(false); // Go back to main view
            setRefinementInstructions(''); // Clear instructions
        }

        setProcessing(false);
    };

    const handleSave = async () => {
        if (!generatedText.trim()) {
            setError('Você precisa processar com IA antes de salvar.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave({
                demand_text: userAnswers,
                generated_text: generatedText,
                status: 'completed',
            });
        } catch (err: any) {
            console.error('Erro ao salvar:', err);
            setError(err.message || 'Erro ao salvar documento');
        } finally {
            setSaving(false);
        }
    };

    const canSave = hasProcessed && generatedText.trim().length > 0;

    // Refinement View
    if (isRefining) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Aprimoramento do ETP
                    </h3>
                    <Button
                        onClick={() => setIsRefining(false)}
                        variant="ghost"
                        size="sm"
                    >
                        Voltar
                    </Button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Instruções para Aprimoramento
                    </label>
                    <textarea
                        value={refinementInstructions}
                        onChange={(e) => setRefinementInstructions(e.target.value)}
                        placeholder={`O que deseja aprimorar:
- Justificativa da necessidade, a situação atual, (descreva com mais detalhes);
- Resultados Pretendidos (descreva com mais detalhes);
- Descrição da Solução como um todo (descreva com mais detalhes).`}
                        className="w-full min-h-[300px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={processing}
                    />
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                <Button
                    onClick={handleRefineWithAI}
                    loading={processing}
                    disabled={!refinementInstructions.trim() || processing}
                    size="lg"
                    className="w-full"
                >
                    {processing ? 'Aguarde, isto pode levar alguns minutos...' : 'Reprocessar'}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Guiding Questions */}
            {!hasProcessed && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                        Perguntas Orientadoras
                    </h3>
                    <div className="space-y-2">
                        {GUIDING_QUESTIONS.map((question, index) => (
                            <p key={index} className="text-sm text-blue-800 dark:text-blue-200">
                                {question}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* User Answers / Generated Text */}
            <div>
                {!hasProcessed && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Suas Respostas
                    </label>
                )}
                {hasProcessed && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        O texto gerado pela IA foi formatado e está pronto. Utilize o botão "Reprocessar com IA" caso deseje fazer aprimoramentos.
                    </p>
                )}
                <div className="space-y-3">
                    {hasProcessed ? (
                        <div className="w-full min-h-[400px] max-h-[600px] rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-6 py-8 text-sm text-gray-900 dark:text-gray-100 prose prose-sm dark:prose-invert max-w-none shadow-inner overflow-y-auto">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
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
                                {generatedText || "O texto gerado pela IA aparecerá aqui..."}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <textarea
                            value={userAnswers}
                            onChange={(e) => setUserAnswers(e.target.value)}
                            placeholder="Responda às perguntas orientadoras acima..."
                            className="w-full min-h-[200px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={processing}
                        />
                    )}

                    {/* Reprocess button - shows after document is saved */}
                    {document.status === 'completed' && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setIsRefining(true)}
                                loading={processing}
                                disabled={processing}
                                variant="secondary"
                                size="sm"
                            >
                                Reprocessar com IA
                            </Button>
                        </div>
                    )}

                    {!hasProcessed && (
                        <Button
                            onClick={handleProcessWithAI}
                            loading={processing}
                            disabled={!userAnswers.trim() || processing}
                            size="lg"
                            className="w-full"
                        >
                            {processing ? 'Aguarde, isto pode levar alguns minutos...' : 'Processar com IA'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            {/* Save Button */}
            {hasProcessed && (
                <div>
                    <Button
                        onClick={handleSave}
                        loading={saving}
                        disabled={!canSave || saving}
                        size="lg"
                        className="w-full"
                    >
                        {saving ? 'Salvando...' : 'Salvar ETP'}
                    </Button>
                </div>
            )}
        </div>
    );
}
