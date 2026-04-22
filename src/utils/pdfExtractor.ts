import * as pdfjs from 'pdfjs-dist';

// Point the worker to the bundled worker file
// Vite will handle the URL import
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

/**
 * Extracts all plain text from a PDF File object.
 * Returns the full text content as a single string.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        pageTexts.push(pageText);
    }

    return pageTexts.join('\n\n');
}

/**
 * Checks if a file is a PDF based on its MIME type or extension.
 */
export function isPDF(file: File): boolean {
    return (
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
    );
}
