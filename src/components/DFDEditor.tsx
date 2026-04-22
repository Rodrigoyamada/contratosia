import { useState } from 'react';
import type { Document } from '../types';
import { Button } from './ui/Button';
import { processWithAI } from '../services/n8nService';

interface DFDEditorProps {
    document: Document;
    onSave: (updates: Partial<Document>) => Promise<void>;
}

// Helper functions for BRL currency formatting
const formatCurrency = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';

    // Convert to number and format
    const number = parseInt(digits) / 100;
    return number.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const parseCurrency = (value: string): number => {
    // Remove R$, spaces, and convert comma to dot
    const cleaned = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
};

export function DFDEditor({ document, onSave }: DFDEditorProps) {
    const [demandText, setDemandText] = useState(document.demand_text || '');
    const [estimatedValue, setEstimatedValue] = useState(
        document.estimated_value
            ? document.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : ''
    );
    const [processing, setProcessing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasProcessed, setHasProcessed] = useState(!!document.generated_text);

    const handleProcessWithAI = async () => {
        if (!demandText.trim()) {
            setError('Por favor, descreva sua demanda primeiro.');
            return;
        }

        setProcessing(true);
        setError(null);

        const result = await processWithAI(demandText);

        if (result.error) {
            setError(result.error);
        } else {
            setDemandText(result.text);
            setHasProcessed(true);
        }

        setProcessing(false);
    };

    const handleSave = async () => {
        if (!demandText.trim()) {
            setError('Você precisa processar a demanda com IA antes de salvar.');
            return;
        }

        if (!estimatedValue.trim()) {
            setError('O valor estimado é obrigatório.');
            return;
        }

        const parsedValue = parseCurrency(estimatedValue);
        if (parsedValue <= 0) {
            setError('O valor estimado deve ser maior que zero.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            console.log('Salvando documento:', {
                demand_text: demandText,
                generated_text: demandText,
                estimated_value: parsedValue,
                status: 'completed',
            });

            await onSave({
                demand_text: demandText,
                generated_text: demandText,
                estimated_value: parsedValue,
                status: 'completed',
            });

            console.log('Documento salvo com sucesso!');
        } catch (err: any) {
            console.error('Erro ao salvar:', err);
            setError(err.message || 'Erro ao salvar documento');
        } finally {
            setSaving(false);
        }
    };

    const canSave = hasProcessed && demandText.trim().length > 0 && estimatedValue.trim().length > 0;

    return (
        <div className="space-y-6">
            {/* Demand Input with inline Process Button */}
            <div>
                {!hasProcessed && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Qual a sua demanda?
                    </label>
                )}
                <div className="space-y-3">
                    <textarea
                        value={demandText}
                        onChange={(e) => setDemandText(e.target.value)}
                        placeholder={hasProcessed
                            ? "O texto gerado pela IA aparecerá aqui. Você pode editá-lo livremente antes de salvar."
                            : "Exemplo: A Prefeitura de Goiânia, por meio da Secretaria Municipal de Trânsito, precisa de um sistema de monitoramento do trânsito com câmeras monitoradas por inteligência artificial para controlar o fluxo dos semáforos e auxiliar os agentes de trânsito a tomar decisões."
                        }
                        className={`w-full ${hasProcessed ? 'min-h-[300px]' : 'min-h-[120px]'} rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        disabled={processing}
                    />

                    {/* Reprocess button - shows after document is saved */}
                    {document.status === 'completed' && (
                        <div className="flex justify-end">
                            <Button
                                onClick={handleProcessWithAI}
                                loading={processing}
                                disabled={processing || !demandText.trim()}
                                variant="secondary"
                                size="sm"
                            >
                                {processing ? 'Reprocessando...' : 'Reprocessar com IA'}
                            </Button>
                        </div>
                    )}

                    {!hasProcessed && (
                        <Button
                            onClick={handleProcessWithAI}
                            loading={processing}
                            disabled={!demandText.trim() || processing}
                            size="lg"
                            className="w-full"
                        >
                            {processing ? 'Processando com IA...' : 'Processar com IA'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Estimated Value */}
            {hasProcessed && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Valor Estimado (R$) *
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                            R$
                        </span>
                        <input
                            type="text"
                            value={estimatedValue}
                            onChange={(e) => setEstimatedValue(formatCurrency(e.target.value))}
                            placeholder="0,00"
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-12 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>
            )}

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
                        {saving ? 'Salvando...' : 'Salvar DFD'}
                    </Button>
                </div>
            )}
        </div>
    );
}
