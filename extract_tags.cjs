const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'docs', 'template_tagueado.docx');
const fileBuffer = fs.readFileSync(filePath);
const zip = new PizZip(fileBuffer);

// Read the main document XML
const docXml = zip.file('word/document.xml').asText();

// In Word XML, tags get split across XML elements, e.g. {, {, varname, }, }
// Strategy 1: Extract all text runs and join them to find the tags in the plain text
// Strip all XML tags to get plain text
const plainText = docXml.replace(/<[^>]+>/g, '');

// Now find template tags in the plain text
// Matches things like {{varname}}, {varname}, {#cond}, {/cond}
const tagPattern = /\{[#/]?\{?[\w_ ]+\}?\}/g;
const rawMatches = plainText.match(tagPattern) || [];

// Clean and deduplicate
const uniqueTags = [...new Set(rawMatches.map(t => t.trim()))].sort();

console.log('=== TEMPLATE TAGS (plain text extraction) ===\n');
if (uniqueTags.length === 0) {
    console.log('No tags found with simple regex. Printing raw text sample...\n');
    // Print small chunks where { appears to understand the format
    let idx = 0;
    let count = 0;
    while ((idx = plainText.indexOf('{', idx)) !== -1 && count < 20) {
        console.log(`[pos ${idx}]: "${plainText.substring(Math.max(0, idx - 5), idx + 30)}"`);
        idx++;
        count++;
    }
} else {
    uniqueTags.forEach(tag => console.log(tag));
    console.log('\n=== TOTAL: ' + uniqueTags.length + ' unique tags ===');
}
