/**
 * Smart DOCX tagger for AGU TR template.
 * Strategy: Extract plain text from each paragraph, do text replacement,
 * then rebuild the paragraph XML with a single run so the tags aren't split.
 */
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'docs', 'template_tagueado.docx');
const fileBuffer = fs.readFileSync(filePath);
const zip = new PizZip(fileBuffer);

let xml = zip.file('word/document.xml').asText();

// ============================================================
// Step 1: Collapse broken runs in each paragraph
// In OOXML, a paragraph (<w:p>) contains runs (<w:r>).
// Text content is inside <w:t> elements.
// We'll extract paragraph text, replace, and rebuild.
// ============================================================

// Extract the text content of a paragraph run(s)
function getParaText(paraXml) {
    return paraXml.replace(/<[^>]+>/g, '');
}

// Replace text content inside a paragraph but keep its formatting envelope
function replaceParaText(paraXml, newText) {
    // Preserve the first run's properties (font, size, bold etc.)
    const rPrMatch = paraXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    const rPr = rPrMatch ? `<w:rPr>${rPrMatch[1]}</w:rPr>` : '';

    // Get paragraph properties (pPr) to keep paragraph-level formatting
    const pPrMatch = paraXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
    const pPr = pPrMatch ? `<w:pPr>${pPrMatch[1]}</w:pPr>` : '';

    // Build a new, clean run with the replaced text
    const escapedText = newText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapedText}</w:t></w:r></w:p>`;
}

// ============================================================
// Step 2: Define replacements on PLAIN TEXT
// ============================================================
const replacements = [
    // Process number
    [/xxxxx\.xxxxxx\/xxxx-xx/gi, '{{numero_processo}}'],

    // Object
    [/\[INSERIR OBJETO\]/gi, '{{objeto_contratacao}}'],
    [/\[incluindo instalação, montagem INCLUIR ATIVIDADES\]/gi, '{#atividades_incluidas}incluindo {{atividades_incluidas}}{/atividades_incluidas}'],
    [/incluindo instalação, montagem INCLUIR ATIVIDADES/gi, 'incluindo {{atividades_incluidas}}'],

    // Prazo de vigência
    [/\[indicar o prazo\]/gi, '{{prazo_vigencia}}'],
    [/\[indicar o prazo, limitado a 5 anos\]/gi, '{{prazo_vigencia}}'],
    [/\[indicar o prazo, limitado a um ano[^\]]*\]/gi, '{{prazo_vigencia}}'],
    [/\[indicar o termo inicial da vigência\]/gi, 'assinatura do contrato'],

    // Prazo de entrega  
    [/\.\.\.\.\.\.\.\.\. dias, contados do\(a\) \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\./gi, '{{prazo_entrega}} dias, contados da emissão da Ordem de Fornecimento'],

    // Subcontratação %
    [/até o limite de XX% \(xxxxx por cento\)/gi, 'até o limite de {{percentual_subcontratacao}}% do valor total do contrato'],

    // Garantia %
    [/em valor correspondente a XX% \(xxxxx por cento\) do valor \[total\] OU \[anual\] da contratação/gi, 'em valor correspondente a {{percentual_garantia}}% do valor total da contratação'],

    // Prazo de garantia
    [/\[INSERIR EXTENSO\] meses\/anos/gi, '{{prazo_garantia}}'],

    // Generic text markers
    [/\[ANO\]/gi, '{{ano_pca}}'],
    [/\[Indicar o ano\]/gi, '{{ano_pca}}'],
    [/\[INSERIR QUANTIDADE\]/gi, '{{quantidade_minima_atestado}}'],
    [/\[identificação do fiscal do contrato\]/gi, '{{fiscal_nome}}'],
    [/\[identificação do gestor do contrato\]/gi, '{{gestor_nome}}'],

    // Conditional: bens comuns vs especiais
    [/Os bens objeto desta contratação são caracterizados como comuns(?:, conforme justificativa constante do Estudo Técnico Preliminar)?\./gi,
        '{#is_bens_comuns}Os bens objeto desta contratação são caracterizados como comuns, conforme justificativa constante do Estudo Técnico Preliminar.{/is_bens_comuns}'],
    [/Os bens objeto desta contratação são caracterizados como especiais(?:, conforme justificativa constante do Estudo Técnico Preliminar)?\./gi,
        '{#is_bens_especiais}Os bens objeto desta contratação são caracterizados como especiais, conforme justificativa constante do Estudo Técnico Preliminar.{/is_bens_especiais}'],

    // Conditional: subcontratação
    [/Não será admitida a subcontratação do objeto contratual\./gi,
        '{^aceita_subcontratacao}Não será admitida a subcontratação do objeto contratual.{/aceita_subcontratacao}'],

    // Conditional: garantia contratual
    [/Não haverá exigência da garantia da contratação dos art\. 96[^.]*\./gi,
        '{^exige_garantia_contratual}Não haverá exigência da garantia da contratação, pelas razões constantes do Estudo Técnico Preliminar.{/exige_garantia_contratual}'],

    // Remove generic OU markers (optional)
    // [/\r?\nOU\r?\n/g, '\n'],
];

// ============================================================
// Step 3: Process each paragraph
// ============================================================
let replacedCount = 0;

const processedXml = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (paraXml) => {
    let text = getParaText(paraXml);

    let changed = false;
    for (const [pattern, replacement] of replacements) {
        const newText = text.replace(pattern, replacement);
        if (newText !== text) {
            text = newText;
            changed = true;
            replacedCount++;
        }
    }

    if (changed) {
        return replaceParaText(paraXml, text);
    }
    return paraXml;
});

// ============================================================
// Step 4: Write output
// ============================================================
zip.file('word/document.xml', processedXml);
const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

const outPath = path.join(__dirname, 'docs', 'template_tagueado_v2.docx');
fs.writeFileSync(outPath, out);

console.log(`✅ Template tagueado gerado: ${outPath}`);
console.log(`📊 Parágrafos modificados: ${replacedCount}`);

// Quick verification
const buf2 = fs.readFileSync(outPath);
const zip2 = new PizZip(buf2);
const xml2 = zip2.file('word/document.xml').asText();
const plain2 = xml2.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const tags = [...new Set(plain2.match(/\{[{#^/]?[\w_]+\}?\}/g) || [])].sort();
console.log(`\n🏷️  Tags encontradas (${tags.length}):`);
tags.forEach(t => console.log('  ', t));
