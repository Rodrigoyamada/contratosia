import React, { useState, useCallback, useEffect } from 'react';
import {
    UploadCloud, File as FileIcon, X, AlertTriangle, RefreshCw,
    Save, CheckCircle2, Lock, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { Button } from './ui/Button';
import type { Document } from '../types';
import {
    processTRBloco1, processTRBloco2, processTRBloco3,
    processTRBloco4, processTRBloco5
} from '../services/n8nService';
import { supabase } from '../lib/supabaseClient';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit3 } from 'lucide-react';

interface TREditorProps {
    document: Document;
    onSave: (updates: Partial<Document>) => Promise<void>;
}

// ─── Persisted state shape (stored in generated_text) ────────────────────────
// Now storing JSON variable records instead of a giant markdown string
interface TRBlocos {
    bloco1: Record<string, any> | null;
    bloco2: Record<string, any> | null;
    bloco3: Record<string, any> | null;
    bloco4: Record<string, any> | null;
    bloco5: Record<string, any> | null;
}

// Per-block user inputs (persisted in demand_text as JSON)
interface TRInputs {
    bloco1: string;
    bloco2: string;
    bloco3: string;
    bloco4: string;
    bloco5: string;
}

interface TRState {
    blocos: TRBlocos;
}

function parseTRState(raw: string | null | undefined): TRState {
    const defaultState = { blocos: { bloco1: null, bloco2: null, bloco3: null, bloco4: null, bloco5: null } };
    if (!raw) return defaultState;
    try {
        const parsed = JSON.parse(raw);
        if (parsed?.blocos) {
            // Convert possible legacy string values into an object { content: string } so it doesn't break UI
            Object.keys(parsed.blocos).forEach(k => {
                if (typeof parsed.blocos[k] === 'string') {
                    parsed.blocos[k] = { _legacy_content: parsed.blocos[k] };
                }
            });
            return parsed as TRState;
        }
    } catch { /* fall through */ }
    return defaultState;
}

function parseTRInputs(raw: string | null | undefined): TRInputs {
    if (!raw) return { bloco1: '', bloco2: '', bloco3: '', bloco4: '', bloco5: '' };
    try {
        const parsed = JSON.parse(raw);
        if (parsed?.bloco1 !== undefined) return parsed as TRInputs;
    } catch { /* fall through */ }
    // Legacy: raw string was the global content — put it in bloco1
    return { bloco1: raw, bloco2: '', bloco3: '', bloco4: '', bloco5: '' };
}

// ─── Block metadata ───────────────────────────────────────────────────────────
const BLOCOS = [
    {
        id: 1,
        key: 'bloco1' as keyof TRBlocos,
        inputKey: 'bloco1' as keyof TRInputs,
        titulo: 'Objeto, Fundamentação e Solução',
        subtitulo: 'Seções 1, 2 e 3 da minuta AGU',
        descricao: 'Objeto · Justificativa · Descrição da Solução (Extraído do ETP)',
        color: 'blue',
        placeholder: `A IA transcreverá as seções 1.1, 2.1 e 3.1 do seu ETP diretamente para o TR conforme o padrão AGU.
Caso queira orientar a IA sobre algum detalhe específico do objeto ou da justificativa, digite aqui.`,
    },
    {
        id: 2,
        key: 'bloco2' as keyof TRBlocos,
        inputKey: 'bloco2' as keyof TRInputs,
        titulo: 'Requisitos da Contratação',
        subtitulo: 'Seção 4 da minuta AGU',
        descricao: 'Especificações Técnicas · Sustentabilidade · Marcas · Subcontratação · Garantia',
        color: 'violet',
        placeholder: `Gere a Seção 4 completa. A IA extrairá especificações técnicas e regras do ETP.
Indique se há marcas específicas ou exigência de amostra se não estiver claro no ETP.`,
    },
    {
        id: 3,
        key: 'bloco3' as keyof TRBlocos,
        inputKey: 'bloco3' as keyof TRInputs,
        titulo: 'Modelo de Execução e Entrega',
        subtitulo: 'Seção 5 da minuta AGU',
        descricao: 'Prazo · Local de Entrega · Recebimento · Garantia do Produto',
        color: 'amber',
        placeholder: `Indique detalhes sobre a entrega e o recebimento.
Ex: "Prazo de entrega de 15 dias úteis no almoxarifado central".`,
    },
    {
        id: 4,
        key: 'bloco4' as keyof TRBlocos,
        inputKey: 'bloco4' as keyof TRInputs,
        titulo: 'Gestão, Fiscalização e Sanções',
        subtitulo: 'Seção 6 da minuta AGU',
        descricao: 'Gestor e Fiscal · Atribuições · Infrações e Sanções',
        color: 'rose',
        placeholder: `Defina quem será o fiscal ou indique se haverá fiscalização setorial.
A IA preencherá as cláusulas de sanções padrão da AGU.`,
    },
    {
        id: 5,
        key: 'bloco5' as keyof TRBlocos,
        inputKey: 'bloco5' as keyof TRInputs,
        titulo: 'Pagamento e Habilitação',
        subtitulo: 'Seções 7 e 8 da minuta AGU',
        descricao: 'Critérios de Pagamento · Habilitação · Qualificação Técnica',
        color: 'emerald',
        placeholder: `Indique prazos para pagamento ou exigências técnicas específicas.
Ex: "O pagamento será efetuado em até 30 dias".`,
    },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; btn: string; inputBg: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-200', btn: 'bg-blue-600 hover:bg-blue-700 text-white', inputBg: 'bg-blue-50/50 dark:bg-blue-900/10' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-700', text: 'text-violet-700 dark:text-violet-300', badge: 'bg-violet-100 dark:bg-violet-800/50 text-violet-700 dark:text-violet-200', btn: 'bg-violet-600 hover:bg-violet-700 text-white', inputBg: 'bg-violet-50/50 dark:bg-violet-900/10' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-200', btn: 'bg-amber-600 hover:bg-amber-700 text-white', inputBg: 'bg-amber-50/50 dark:bg-amber-900/10' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-700', text: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-100 dark:bg-rose-800/50 text-rose-700 dark:text-rose-200', btn: 'bg-rose-600 hover:bg-rose-700 text-white', inputBg: 'bg-rose-50/50 dark:bg-rose-900/10' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white', inputBg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
};

// ─── Block view state ─────────────────────────────────────────────────────────
type BlocoViewState = 'input' | 'generating' | 'generated' | 'saved';

// ─── Component ────────────────────────────────────────────────────────────────
export function TREditor({ document, onSave }: TREditorProps) {
    // Per-block user inputs
    const [inputs, setInputs] = useState<TRInputs>(() => parseTRInputs(document.demand_text));

    // PDF file for block 1
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);

    // Saved blocos state from DB
    const [trState, setTrState] = useState<TRState>(() => parseTRState(document.generated_text));

    // Per-block generated text (not yet saved, but now structurally object variables)
    const [generated, setGenerated] = useState<Record<string, Record<string, any>>>({});

    // Expanded block
    const [expanded, setExpanded] = useState<number | null>(1);
    const [previewModes, setPreviewModes] = useState<Record<number, boolean>>({});

    // Loading states
    const [generating, setGenerating] = useState<number | null>(null);
    const [saving, setSaving] = useState<number | null>(null);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // object_nature
    const [objectNature, setObjectNature] = useState<string>('Aquisição de Bens');
    useEffect(() => {
        supabase
            .from('processes')
            .select('object_nature')
            .eq('id', document.process_id)
            .single()
            .then(({ data }) => {
                if (data?.object_nature) setObjectNature(data.object_nature);
            });
    }, [document.process_id]);

    // ── Context fetcher ──────────────────────────────────────────────────────
    const fetchContext = useCallback(async () => {
        const { data } = await supabase
            .from('documents')
            .select('*')
            .eq('process_id', document.process_id);
        const docs = (data as Document[]) || [];
        const etp = docs.find(d => d.type === 'ETP');
        const matriz = docs.find(d => d.type === 'Matriz de Risco');
        const etp_content = etp?.generated_text || etp?.demand_text || '';
        const matriz_riscos = matriz?.generated_text || matriz?.demand_text || '';
        console.log('[TR ctx] ETP chars:', etp_content.length, '| Matriz chars:', matriz_riscos.length);
        return { etp_content, matriz_riscos };
    }, [document.process_id]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const blocoSalvo = (id: number) => trState.blocos[BLOCOS[id - 1].key] !== null;
    const blocoDesbloqueado = (id: number) => id === 1 || blocoSalvo(id - 1);
    const allSaved = BLOCOS.every(b => trState.blocos[b.key] !== null);

    const viewState = (id: number): BlocoViewState => {
        if (blocoSalvo(id)) return 'saved';
        if (generating === id) return 'generating';
        if (generated[BLOCOS[id - 1].inputKey]) return 'generated';
        return 'input';
    };

    // ── Persist inputs to DB demand_text ────────────────────────────────────
    const persistInputs = useCallback(async (next: TRInputs) => {
        await onSave({ demand_text: JSON.stringify(next) });
    }, [onSave]);

    // ── Persist saved blocos to DB generated_text ────────────────────────────
    const allSaves = (s: TRState) => BLOCOS.every(b => s.blocos[b.key] !== null);
    const persistState = async (next: TRState, nextInputs: TRInputs) => {
        await onSave({
            generated_text: JSON.stringify(next),
            demand_text: JSON.stringify(nextInputs),
            status: allSaves(next) ? 'completed' : 'draft',
        });
        setTrState(next);
    };

    // ── Gerar bloco ──────────────────────────────────────────────────────────
    const handleGerar = async (blocoId: number) => {
        setGenerating(blocoId); setError(null);
        const bloco = BLOCOS[blocoId - 1];
        const userInput = inputs[bloco.inputKey];

        try {
            const { etp_content, matriz_riscos } = await fetchContext();

            let pesquisa_precos_texto = '';
            if (file && blocoId === 1) {
                const { isPDF, extractTextFromPDF } = await import('../utils/pdfExtractor');
                if (isPDF(file)) {
                    try { pesquisa_precos_texto = await extractTextFromPDF(file); }
                    catch { console.warn('PDF extraction failed'); }
                }
            }

            const base = {
                content: userInput,
                etp_content,
                matriz_riscos,
                process_id: document.process_id,
                object_nature: objectNature,
            };

            let result: { success: boolean; texto_bloco?: string; message?: string; variables?: Record<string, any> };
            if (blocoId === 1) result = await processTRBloco1({ ...base, pesquisa_precos_texto });
            else if (blocoId === 2) result = await processTRBloco2(base);
            else if (blocoId === 3) result = await processTRBloco3(base);
            else if (blocoId === 4) result = await processTRBloco4(base);
            else result = await processTRBloco5(base);

            if (result.success && result.variables) {
                setGenerated(prev => ({ ...prev, [bloco.inputKey]: result.variables as Record<string, any> }));
                // Save input answers automatically
                await persistInputs(inputs);
            } else if (result.success && result.texto_bloco) {
                // Legacy fallback for blocks not yet refactored to JSON
                setGenerated(prev => ({ ...prev, [bloco.inputKey]: { _legacy_content: result.texto_bloco } }));
                await persistInputs(inputs);
            } else {
                throw new Error(result.message || 'Resposta vazia do n8n.');
            }
        } catch (e: any) {
            setError(`Bloco ${blocoId}: ${e.message}`);
        } finally {
            setGenerating(null);
        }
    };

    // ── Salvar bloco ─────────────────────────────────────────────────────────
    const handleSalvarBloco = async (blocoId: number) => {
        const bloco = BLOCOS[blocoId - 1];
        const texto = generated[bloco.inputKey];
        if (!texto) return;
        setSaving(blocoId); setError(null);
        try {
            const next: TRState = { blocos: { ...trState.blocos, [bloco.key]: texto } };
            await persistState(next, inputs);
            setGenerated(prev => { const d = { ...prev }; delete d[bloco.inputKey]; return d; });
            if (blocoId < 5) setExpanded(blocoId + 1);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(null);
        }
    };

    // ── Regerar bloco (clear generated, go back to input) ───────────────────
    const handleRegerar = async (blocoId: number) => {
        const bloco = BLOCOS[blocoId - 1];
        setGenerated(prev => { const d = { ...prev }; delete d[bloco.inputKey]; return d; });
        await handleGerar(blocoId);
    };

    // ─── Actions ──────────────────────────────────────────────────────────────
    const handleTextareaStyle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f && f.type === 'application/pdf') {
            setFile(f);
        } else {
            alert('Por favor, envie apenas arquivos PDF.');
        }
    };

    const handleEditSaved = (blocoKey: string, fieldKey: string, value: any) => {
        setTrState(prev => {
            const currentObj = prev.blocos[blocoKey as keyof TRBlocos] || {};
            return {
                ...prev,
                blocos: {
                    ...prev.blocos,
                    [blocoKey]: { ...currentObj, [fieldKey]: value }
                }
            };
        });
    };

    const handleSaveEdits = async (blocoId: number) => {
        const bloco = BLOCOS.find(b => b.id === blocoId)!;
        const texto = trState.blocos[bloco.key];
        if (!texto) return;
        setSaving(blocoId);
        setError(null);
        try {
            const updates = { [bloco.key]: texto };
            const docUpdates = blocoId === 1 ? { content: JSON.stringify(updates) } : {};
            const { error: saveErr } = await supabase
                .from('documents')
                .update(docUpdates)
                .eq('id', document.id);
            if (saveErr) throw saveErr;
            // Also update the full JSON if we are not block 1? Wait, in this logic TR json is updated entirely:
            const allBlocos = { ...trState.blocos, [bloco.key]: texto };
            await onSave({ generated_text: JSON.stringify({ blocos: allBlocos }) });
        } catch (e: any) {
            setError(e.message || 'Erro ao salvar a edição.');
        } finally {
            setSaving(null);
        }
    };

    // ── Export Word ──────────────────────────────────────────────────────────
    const handleExport = async () => {
        setExporting(true); setError(null);
        try {
            // Load the official AGU Word template (must be available in public folder)
            const response = await fetch('/template_tagueado_v2.docx');
            if (!response.ok) throw new Error('Não foi possível carregar o template da AGU.');

            const arrayBuffer = await response.arrayBuffer();
            const zip = new PizZip(arrayBuffer);

            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            // Flatten all blocks into a single key-value variables object
            let allVariables = {};
            BLOCOS.forEach(b => {
                if (trState.blocos[b.key]) {
                    allVariables = { ...allVariables, ...(trState.blocos[b.key] as object) };
                }
            });

            // Build conditional variables
            // Example: docxtemplater handles `{#is_bens_comuns}` natively if is_bens_comuns is true

            doc.render(allVariables);

            // Generate output
            const out = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            saveAs(out, `Termo_de_Referencia_${document.process_id || 'TR'}.docx`);
        } catch (e: any) {
            setError(e.message || 'Erro ao exportar o DOCX.');
        } finally {
            setExporting(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 max-w-4xl mx-auto w-full">

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                        <FileIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Termo de Referência — {objectNature}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Responda as perguntas de cada bloco e gere o texto com IA sequencialmente.
                        </p>
                    </div>
                </div>
                {allSaved && (
                    <Button onClick={handleExport} disabled={exporting} className="bg-green-600 hover:bg-green-700 text-white shrink-0">
                        <Download className="h-4 w-4 mr-2" />
                        {exporting ? 'Exportando...' : 'Exportar Word'}
                    </Button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Blocks */}
            <div className="space-y-3">
                {BLOCOS.map(bloco => {
                    const desbloqueado = blocoDesbloqueado(bloco.id);
                    const salvo = blocoSalvo(bloco.id);
                    const isExpanded = expanded === bloco.id;
                    const colors = COLOR_MAP[bloco.color];
                    const vs = viewState(bloco.id);
                    const isSaving = saving === bloco.id;


                    return (
                        <div
                            key={bloco.id}
                            className={`rounded-xl border transition-all duration-200 overflow-hidden ${desbloqueado
                                ? `${colors.border} shadow-sm`
                                : 'border-gray-200 dark:border-gray-700 opacity-50'
                                }`}
                        >
                            {/* Block header */}
                            <div
                                className={`flex items-center justify-between p-4 cursor-pointer select-none ${desbloqueado ? colors.bg : 'bg-gray-50 dark:bg-gray-800'}`}
                                onClick={() => desbloqueado && setExpanded(isExpanded ? null : bloco.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${salvo ? 'bg-green-100 dark:bg-green-900/40' : desbloqueado ? colors.bg : 'bg-gray-100 dark:bg-gray-700'}`}>
                                        {salvo ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        ) : desbloqueado ? (
                                            <span className={`text-sm font-bold ${colors.text}`}>{bloco.id}</span>
                                        ) : (
                                            <Lock className="h-4 w-4 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{bloco.titulo}</p>
                                            {salvo && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">✓ Salvo</span>}
                                            {vs === 'generated' && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors.badge}`}>Gerado · salvar?</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{bloco.subtitulo}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                </div>
                            </div>

                            {/* Block body (collapsible) */}
                            {isExpanded && desbloqueado && (
                                <div className="border-t border-gray-200 dark:border-gray-700">

                                    {/* ── STATE: saved ── */}
                                    {vs === 'saved' && (
                                        <div className="px-5 pt-5 pb-5">
                                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                                                <div className="text-sm font-medium text-gray-500">
                                                    Conteúdo do Bloco {bloco.id} (Salvo)
                                                </div>
                                            </div>

                                            <div className="relative group">
                                                <textarea
                                                    value={(trState.blocos[bloco.key] as any)?.texto_formatado || ""}
                                                    onChange={e => {
                                                        handleEditSaved(bloco.key, 'texto_formatado', e.target.value);
                                                        handleTextareaStyle(e);
                                                    }}
                                                    className={`w-full p-6 font-mono text-[13px] leading-relaxed rounded-lg border ${colors.border} focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${colors.inputBg} resize-none overflow-hidden min-h-[300px] shadow-sm`}
                                                    onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                />
                                            </div>
                                            <p className="text-[11px] text-gray-400 italic mt-2">Este texto será usado para gerar o documento Word.</p>
                                            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                                <Button
                                                    size="sm"
                                                    disabled={saving !== null}
                                                    onClick={() => handleSaveEdits(bloco.id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/20"
                                                >
                                                    <Save className="h-4 w-4 mr-2" />
                                                    {saving === bloco.id ? 'Salvando…' : 'Salvar Alterações'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── STATE: generating ── */}
                                    {vs === 'generating' && (
                                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                                            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Gerando Bloco {bloco.id} com IA…</p>
                                        </div>
                                    )}

                                    {/* ── STATE: generated (read-only formatted output) ── */}
                                    {vs === 'generated' && (
                                        <div className="px-5 pt-5 pb-5">
                                            <div className="text-sm font-medium text-gray-500 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                                                Conteúdo sugerido para o Bloco {bloco.id}
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] text-gray-400 italic">Este texto será formatado conforme o padrão AGU ao exportar para Word.</p>
                                                    </div>

                                                    <div className="relative group">
                                                        <textarea
                                                            value={(generated[bloco.inputKey] as any)?.texto_formatado || ""}
                                                            onChange={e => {
                                                                const currentVars = generated[bloco.inputKey] || {};
                                                                setGenerated({
                                                                    ...generated,
                                                                    [bloco.inputKey]: { ...currentVars, texto_formatado: e.target.value }
                                                                });
                                                                handleTextareaStyle(e);
                                                            }}
                                                            className="w-full p-6 font-mono text-[13px] leading-relaxed rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 dark:bg-gray-800 resize-none overflow-hidden min-h-[300px] shadow-inner border-dashed"
                                                            onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isSaving}
                                                    onClick={() => handleRegerar(bloco.id)}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                                    Regerar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={isSaving}
                                                    onClick={() => handleSalvarBloco(bloco.id)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                                                >
                                                    <Save className="h-4 w-4 mr-2" />
                                                    {isSaving ? 'Salvando…' : `Confirmar e Salvar`}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── STATE: input ── */}
                                    {vs === 'input' && (
                                        <>
                                            {/* PDF upload — only block 1 */}
                                            {bloco.id === 1 && (
                                                <div className="px-5 pt-5">
                                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                                        📎 Pesquisa de Preços (opcional — PDF)
                                                    </p>
                                                    {!file ? (
                                                        <div
                                                            onDrop={handleDrop}
                                                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                                            onDragLeave={() => setDragging(false)}
                                                            className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors mb-4 ${dragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                                        >
                                                            <UploadCloud className={`h-5 w-5 shrink-0 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
                                                            <label htmlFor="file-upload-tr" className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                                                                <span className="text-blue-600 dark:text-blue-400 font-medium">Clique para upload</span> ou arraste · PDF, DOCX, XLSX
                                                                <input id="file-upload-tr" type="file" className="sr-only" onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} accept=".doc,.docx,.xls,.xlsx,.pdf" />
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50 mb-4">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                                    <FileIcon className="h-4 w-4 text-blue-500 shrink-0" />
                                                                </div>
                                                                <span className="text-sm text-blue-800 dark:text-blue-200 truncate">{file.name}</span>
                                                            </div>
                                                            <button onClick={() => setFile(null)} className="p-1 text-blue-400 hover:text-red-500 transition-colors shrink-0">
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Per-block textarea */}
                                            <div className={bloco.id === 1 ? 'px-5 pb-3' : 'px-5 pt-5 pb-3'}>
                                                <textarea
                                                    value={inputs[bloco.inputKey]}
                                                    onChange={e => setInputs(prev => ({ ...prev, [bloco.inputKey]: e.target.value }))}
                                                    className={`w-full h-52 p-4 rounded-lg border ${colors.border} focus:outline-none focus:ring-2 focus:ring-offset-1 dark:bg-gray-800 dark:text-gray-100 text-sm leading-relaxed font-mono resize-y ${colors.inputBg}`}
                                                    placeholder={bloco.placeholder}
                                                />
                                            </div>
                                            <div className="px-5 pb-5 flex justify-end">
                                                <Button
                                                    size="sm"
                                                    className={colors.btn}
                                                    disabled={!inputs[bloco.inputKey].trim()}
                                                    onClick={() => handleGerar(bloco.id)}
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                                    Gerar com IA
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Final export banner */}
            {allSaved && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-5 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">Todos os blocos gerados e salvos!</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 mb-4">O Termo de Referência está completo. Exporte o documento Word.</p>
                    <Button onClick={handleExport} disabled={exporting} className="bg-green-600 hover:bg-green-700 text-white">
                        <Download className="h-4 w-4 mr-2" />
                        {exporting ? 'Exportando...' : 'Exportar TR (.docx)'}
                    </Button>
                </div>
            )}
        </div>
    );
}
