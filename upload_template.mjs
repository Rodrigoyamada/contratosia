import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read environment variables from .env file
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = path.join(__dirname, 'docs', 'template_tagueado_v2.docx');
const fileBuffer = fs.readFileSync(filePath);

console.log('Uploading template_tagueado_v2.docx to Supabase Storage...');
const { data, error } = await supabase.storage
    .from('templates')
    .upload('template_tagueado_v2.docx', fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
    });

if (error) {
    console.error('❌ Upload failed:', error.message);
} else {
    console.log('✅ Upload successful!');
    console.log('Public URL: ' + supabaseUrl + '/storage/v1/object/public/templates/template_tagueado_v2.docx');
}
