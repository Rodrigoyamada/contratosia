import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

const inputPath = path.resolve('./docs/modelo-de-termo-de-referencia-compras-lei-no-14-133-dez-25.docx');
const outputPath = path.resolve('./docs/template_tagueado.docx');

try {
    // Load the docx file as a binary string
    const content = fs.readFileSync(inputPath, 'binary');

    // Load into PizZip
    const zip = new PizZip(content);

    // Get the main document XML
    let xml = zip.file("word/document.xml").asText();

    // --- Replacements ---
    // Note: Word often splits strings across multiple XML tags (e.g., <w:t>[INSERIR</w:t><w:t> OBJETO]</w:t>).
    // A simple string replace might fail if the text is fragmented. 
    // However, for clean documents or simple tags, it sometimes works.
    // We will do our best with raw XML string manipulation for a quick proof of concept.

    // 1. Simple tags
    xml = xml.replace(/\[INSERIR OBJETO\]/g, '{{objeto_contratacao}}');
    xml = xml.replace(/\[incluindo instalação, montagem INCLUIR ATIVIDADES\]/g, '{{atividades_incluidas}}');
    xml = xml.replace(/Processo Administrativo n° xxxxx\.xxxxxx\/xxxx-xx/g, 'Processo Administrativo n° {{numero_processo}}');

    // Condicionais (Bens comuns/especiais)
    xml = xml.replace(/Os bens objeto desta contratação são caracterizados como comuns, conforme justificativa constante do Estudo Técnico Preliminar./g, '{#is_bens_comuns}Os bens objeto desta contratação são caracterizados como comuns, conforme justificativa constante do Estudo Técnico Preliminar.{/is_bens_comuns}');

    xml = xml.replace(/Os bens objeto desta contratação são caracterizados como especiais, conforme justificativa constante do Estudo Técnico Preliminar./g, '{#is_bens_especiais}Os bens objeto desta contratação são caracterizados como especiais, conforme justificativa constante do Estudo Técnico Preliminar.{/is_bens_especiais}');

    // Update the XML in the zip
    zip.file("word/document.xml", xml);

    // Header XML (if needed) - let's just stick to document.xml for now.

    // Generate the new docx
    const buf = zip.generate({ type: 'nodebuffer', compression: "DEFLATE" });

    fs.writeFileSync(outputPath, buf);
    console.log(`Document saved successfully to ${outputPath}`);
} catch (error) {
    console.error('Error modifying document:', error);
}
