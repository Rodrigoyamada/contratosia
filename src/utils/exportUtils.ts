import type { Document } from '../types';
import { jsPDF } from 'jspdf';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

/** Extracts printable text from a document, handling TR's JSON blocos format */
function extractText(document: Document): string {
    const raw = document.generated_text || document.demand_text || '';
    if (document.type === 'TR') {
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.blocos) {
                return ['bloco1', 'bloco2', 'bloco3', 'bloco4', 'bloco5']
                    .map(k => parsed.blocos[k])
                    .filter(Boolean)
                    .join('\n\n---\n\n');
            }
        } catch { /* fall through */ }
    }
    return raw;
}

/**
 * Export document to PDF
 */
export async function exportToPDF(document: Document, processTitle: string) {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        let yPosition = 20;

        // Helper function to add new page if needed
        const checkPageBreak = (requiredSpace: number) => {
            if (yPosition + requiredSpace > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
            }
        };

        // Determine title based on document type
        // Determine title based on document type
        let docTitle = '';
        switch (document.type) {
            case 'ETP':
                docTitle = 'ETP - Estudo Técnico Preliminar';
                break;
            case 'Matriz de Risco':
                docTitle = 'Matriz de Risco';
                break;
            case 'TR':
                docTitle = 'Termo de Referência';
                break;
            case 'DFD':
            default:
                docTitle = 'DFD - Documento de Formalização da Demanda';
                break;
        }

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(docTitle, margin, yPosition);
        yPosition += 15;

        // Process info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Processo: ${processTitle}`, margin, yPosition);
        yPosition += 10;

        // Separator
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;

        // Content
        doc.setFontSize(11);
        const text = extractText(document);
        if (text) {
            const splitText = doc.splitTextToSize(text, maxWidth);
            for (let i = 0; i < splitText.length; i++) {
                checkPageBreak(7);
                doc.text(splitText[i], margin, yPosition);
                yPosition += 7;
            }
            yPosition += 10;
        }

        // Estimated value
        if (document.estimated_value) {
            checkPageBreak(15);
            yPosition += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Valor Estimado:', margin, yPosition);
            doc.setFont('helvetica', 'normal');
            const formattedValue = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(document.estimated_value);
            doc.text(formattedValue, margin + 35, yPosition);
        }

        // Save the PDF
        const fileName = `${document.type}_${processTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        doc.save(fileName);

        return { success: true };
    } catch (error: any) {
        console.error('Error exporting to PDF:', error);
        return {
            success: false,
            error: `Erro ao exportar PDF: ${error.message || 'Erro desconhecido'}`
        };
    }
}

/**
 * Export document to Word (.docx)
 */
export async function exportToWord(document: Document, processTitle: string) {
    try {
        const sections = [];

        // Determine title based on document type
        // Determine title based on document type
        let docTitle = '';
        switch (document.type) {
            case 'ETP':
                docTitle = 'ETP - Estudo Técnico Preliminar';
                break;
            case 'Matriz de Risco':
                docTitle = 'Matriz de Risco';
                break;
            case 'TR':
                docTitle = 'Termo de Referência';
                break;
            case 'DFD':
            default:
                docTitle = 'DFD - Documento de Formalização da Demanda';
                break;
        }

        // Title
        sections.push(
            new Paragraph({
                text: docTitle,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            })
        );

        // Process info
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Processo: ',
                        bold: true,
                    }),
                    new TextRun(processTitle),
                ],
                spacing: { after: 200 },
            })
        );

        // Separator line (using underscores)
        sections.push(
            new Paragraph({
                text: '_'.repeat(80),
                spacing: { after: 200 },
            })
        );

        // Content
        const text = extractText(document);
        if (text) {
            const paragraphs = text.split('\n\n');
            paragraphs.forEach(para => {
                if (para.trim()) {
                    sections.push(
                        new Paragraph({
                            text: para.trim(),
                            spacing: { after: 200 },
                            alignment: AlignmentType.JUSTIFIED,
                        })
                    );
                }
            });
        }

        // Estimated value
        if (document.estimated_value) {
            const formattedValue = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(document.estimated_value);

            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: 'Valor Estimado: ',
                            bold: true,
                        }),
                        new TextRun(formattedValue),
                    ],
                    spacing: { before: 400 },
                })
            );
        }

        const doc = new DocxDocument({
            sections: [{
                properties: {},
                children: sections,
            }],
        });

        const blob = await Packer.toBlob(doc);
        const fileName = `${document.type}_${processTitle.replace(/[^a-z0-9]/gi, '_')}.docx`;
        saveAs(blob, fileName);

        return { success: true };
    } catch (error: any) {
        console.error('Error exporting to Word:', error);
        return {
            success: false,
            error: `Erro ao exportar Word: ${error.message || 'Erro desconhecido'}`
        };
    }
}
