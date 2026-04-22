export async function processWithAI(demandText: string): Promise<{ text: string; error: string | null }> {
    const webhookUrl = 'https://n8n.srv1291896.hstgr.cloud/webhook/98cb3f0b-893e-4a05-babb-fe8731c2f22a';

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatInput: demandText
            }),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // n8n returns a direct object with msg_saida field
        // Example: { "msg_saida": "generated text here" }
        const generatedText = data.msg_saida || data.text || data.response || '';

        return { text: generatedText, error: null };
    } catch (error: any) {
        console.error('Error calling n8n webhook:', error);
        return { text: '', error: error.message || 'Erro ao processar com IA' };
    }
}

export async function processETP(objectNature: string, userAnswers: string, dfdText: string): Promise<{ text: string; error: string | null }> {
    const webhookUrl = 'https://n8n.srv1291896.hstgr.cloud/webhook/5f31bfb0-3bb7-4e6f-9d47-61728b16dc22';

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                objectNature,
                userAnswers,
                dfdText
            }),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('ETP Webhook raw response:', data);

        // n8n might return an array or a single object
        const responseData = Array.isArray(data) ? data[0] : data;

        // Try to find the text in various common fields
        // The browser debug revealed the key is often an empty string ""
        const generatedText = responseData[''] ||
            responseData.msg_saida ||
            responseData.text ||
            responseData.response ||
            responseData.output ||
            responseData.message ||
            // Fallback: take the first string value found in the object if it's an object
            (typeof responseData === 'object' && responseData !== null ? Object.values(responseData).find(v => typeof v === 'string') : '') ||
            (typeof responseData === 'string' ? responseData : '');

        console.log('ETP Generated text:', generatedText ? generatedText.substring(0, 50) + '...' : 'Empty');

        return { text: generatedText, error: null };
    } catch (error: any) {
        console.error('Error calling ETP webhook:', error);
        return { text: '', error: error.message || 'Erro ao processar ETP com IA' };
    }
}

export async function refineETP(objectNature: string, currentText: string, userAnswers: string, refinementInstructions: string): Promise<{ text: string; error: string | null }> {
    const webhookUrl = 'https://n8n.srv1291896.hstgr.cloud/webhook/17e3fb1c-6f06-45fb-97bc-dbb8d23ff4e6';

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                objectNature,
                currentText,
                userAnswers,
                refinementInstructions
            }),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('ETP Refinement Webhook raw response:', data);

        const responseData = Array.isArray(data) ? data[0] : data;

        // Try to find the text in various common fields
        const generatedText = responseData[''] ||
            responseData.msg_saida ||
            responseData.text ||
            responseData.response ||
            responseData.output ||
            responseData.message ||
            (typeof responseData === 'object' && responseData !== null ? Object.values(responseData).find(v => typeof v === 'string') : '') ||
            (typeof responseData === 'string' ? responseData : '');

        console.log('ETP Refined text:', generatedText ? generatedText.substring(0, 50) + '...' : 'Empty');

        return { text: generatedText, error: null };
    } catch (error: any) {
        console.error('Error calling ETP refinement webhook:', error);
        return { text: '', error: error.message || 'Erro ao aprimorar ETP com IA' };
    }
}

export async function generateRiskMatrix(etpText: string): Promise<{ text: string; error: string | null }> {
    const webhookUrl = 'https://n8n.srv1291896.hstgr.cloud/webhook/3bc494ee-3556-4e13-b33e-69d70c6e28ae';

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                etpText
            }),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Risk Matrix Webhook raw response:', data);

        const responseData = Array.isArray(data) ? data[0] : data;

        // Try to find the text in various common fields
        const generatedText = responseData[''] ||
            responseData.msg_saida ||
            responseData.text ||
            responseData.response ||
            responseData.output ||
            responseData.message ||
            (typeof responseData === 'object' && responseData !== null ? Object.values(responseData).find(v => typeof v === 'string') : '') ||
            (typeof responseData === 'string' ? responseData : '');

        console.log('Risk Matrix Generated text:', generatedText ? generatedText.substring(0, 50) + '...' : 'Empty');

        return { text: generatedText, error: null };
    } catch (error: any) {
        console.error('Error calling Risk Matrix webhook:', error);
        return { text: '', error: error.message || 'Erro ao gerar Matriz de Risco' };
    }
}

export async function processTR(data: any, file?: File | null): Promise<{ success: boolean; data?: any; message?: string }> {
    // Production webhook URL for TR creation
    const webhookUrl = 'https://n8n.srv1291896.hstgr.cloud/webhook/gerar-tr';

    try {
        let body: FormData | string;
        const headers: Record<string, string> = {};

        if (file) {
            // Dynamically import the PDF extractor to keep the bundle lean
            const { extractTextFromPDF, isPDF } = await import('../utils/pdfExtractor');

            if (isPDF(file)) {
                // Extract text from PDF and send everything as JSON
                console.log('[processTR] Extracting text from PDF:', file.name);
                let pesquisaPrecos = '';
                try {
                    pesquisaPrecos = await extractTextFromPDF(file);
                    console.log('[processTR] PDF extracted, chars:', pesquisaPrecos.length);
                } catch (pdfErr) {
                    console.warn('[processTR] PDF extraction failed, sending without pesquisa_precos:', pdfErr);
                }
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify({
                    ...data,
                    has_file: true,
                    pesquisa_precos_texto: pesquisaPrecos,
                    file_name: file.name,
                });
            } else {
                // Non-PDF (Excel/Word) — send as multipart/form-data binary
                const formData = new FormData();
                formData.append('pesquisa_precos', file, file.name);
                formData.append('content', data.content || '');
                formData.append('etp_content', data.etp_content || '');
                formData.append('matriz_riscos', data.matriz_riscos || '');
                formData.append('process_id', data.process_id || '');
                formData.append('document_id', data.document_id || '');
                formData.append('has_file', 'true');
                body = formData;
                // Don't set Content-Type — browser sets it with boundary for FormData
            }
        } else {
            // No file — send as regular JSON
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify({ ...data, has_file: false });
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers,
            body,
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
        }

        const rawResponseText = await response.text();
        console.log('[processTR] Raw n8n response:', rawResponseText.substring(0, 500));

        // n8n sometimes returns a JSON-encoded string (double encoded)
        let responseData: any;
        try {
            responseData = JSON.parse(rawResponseText);
            // If the result is itself a string, parse again (double-encoded)
            if (typeof responseData === 'string') {
                responseData = JSON.parse(responseData);
            }
        } catch (e) {
            console.error('[processTR] Failed to parse response JSON:', e);
            throw new Error('Resposta inválida do servidor n8n.');
        }

        const finalData = Array.isArray(responseData) ? responseData[0] : responseData;
        console.log('[processTR] finalData keys:', Object.keys(finalData || {}));
        console.log('[processTR] has frontend_preview:', !!finalData?.frontend_preview);
        console.log('[processTR] has docxtemplater:', !!finalData?.docxtemplater);

        // Build the generated_text: readable markdown preview + hidden JSON for export
        let generatedText = '';
        if (finalData.frontend_preview) {
            const sections = [
                finalData.frontend_preview.secao_requisitos || '',
                finalData.frontend_preview.secao_gestao || '',
                finalData.frontend_preview.secao_infracoes || '',
                finalData.frontend_preview.secao_entregas || '',
            ].filter(Boolean);

            console.log('[processTR] Preview sections found:', sections.length);
            generatedText = sections.join('\n\n---\n\n');

            // Inject hidden JSON for the export button to use
            if (finalData.docxtemplater) {
                const hiddenJson = JSON.stringify(finalData.docxtemplater, null, 2);
                generatedText += `\n\n<!-- DOCX_JSON_START\n${hiddenJson}\nDOCX_JSON_END -->`;
            }
        } else {
            // Fallback for non-structured responses
            generatedText = finalData[''] || finalData.text || finalData.response || finalData.msg_saida || '';
            console.log('[processTR] Using fallback text, length:', generatedText.length);
        }

        console.log('[processTR] Final generatedText length:', generatedText.length);

        return {
            success: true,
            data: {
                generated_text: generatedText,
                structured_data: finalData.docxtemplater || null
            }
        };
    } catch (error: any) {
        console.error('Error calling TR n8n webhook:', error);
        return {
            success: false,
            message: error.message || 'Erro ao processar o Termo de Referência com a IA'
        };
    }
}

const N8N_BASE = 'https://n8n.srv1291896.hstgr.cloud/webhook';

async function callBlocoWebhook(
    path: string,
    payload: Record<string, string>
): Promise<{ success: boolean; texto_bloco?: string; message?: string; variables?: Record<string, any> }> {
    try {
        const response = await fetch(`${N8N_BASE}/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Webhook ${path} retornou ${response.status}`);
        const rawText = await response.text();
        let data: any;
        try { data = JSON.parse(rawText); if (typeof data === 'string') data = JSON.parse(data); }
        catch { throw new Error('Resposta inválida do servidor n8n.'); }

        const final = Array.isArray(data) ? data[0] : data;
        const texto = final?.texto_bloco || final?.output || final?.text || '';

        console.log(`[${path}] Response keys:`, Object.keys(final || {}));

        const finalTexto = final?.texto_formatado || final?.texto_bloco || texto;
        const finalVars = final?.variables || {};

        return {
            success: true,
            texto_bloco: finalTexto,
            variables: { ...finalVars, texto_formatado: finalTexto }
        };
    } catch (err: any) {
        console.error(`[${path}] Erro:`, err);
        return { success: false, message: err.message || 'Erro ao chamar o webhook.' };
    }
}

export async function processTRBloco1(p: { content: string; etp_content: string; pesquisa_precos_texto?: string; matriz_riscos?: string; process_id: string; object_nature?: string }) {
    return callBlocoWebhook('gerar-tr-bloco1', { content: p.content, etp_content: p.etp_content, pesquisa_precos_texto: p.pesquisa_precos_texto || '', matriz_riscos: p.matriz_riscos || '', process_id: p.process_id, object_nature: p.object_nature || 'Aquisição de Bens' });
}
export async function processTRBloco2(p: { content: string; etp_content: string; matriz_riscos?: string; process_id: string; object_nature?: string }) {
    return callBlocoWebhook('gerar-tr-bloco2', { content: p.content, etp_content: p.etp_content, matriz_riscos: p.matriz_riscos || '', process_id: p.process_id, object_nature: p.object_nature || 'Aquisição de Bens' });
}
export async function processTRBloco3(p: { content: string; etp_content: string; matriz_riscos?: string; process_id: string; object_nature?: string }) {
    return callBlocoWebhook('gerar-tr-bloco3', { content: p.content, etp_content: p.etp_content, matriz_riscos: p.matriz_riscos || '', process_id: p.process_id, object_nature: p.object_nature || 'Aquisição de Bens' });
}
export async function processTRBloco4(p: { content: string; etp_content: string; matriz_riscos?: string; process_id: string; object_nature?: string }) {
    return callBlocoWebhook('gerar-tr-bloco4', { content: p.content, etp_content: p.etp_content, matriz_riscos: p.matriz_riscos || '', process_id: p.process_id, object_nature: p.object_nature || 'Aquisição de Bens' });
}
export async function processTRBloco5(p: { content: string; etp_content: string; matriz_riscos?: string; process_id: string; object_nature?: string }) {
    return callBlocoWebhook('gerar-tr-bloco5', { content: p.content, etp_content: p.etp_content, matriz_riscos: p.matriz_riscos || '', process_id: p.process_id, object_nature: p.object_nature || 'Aquisição de Bens' });
}
