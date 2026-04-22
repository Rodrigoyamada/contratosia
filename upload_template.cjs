const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://zcmswxnzjjkxslhcxzgc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbXN3eG56ampreHNsaGN4emdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3ODU4MjcsImV4cCI6MjA4NjM2MTgyN30.CPz1wfW-3KQVd4gRZ0OwmnWKnXDdFzaJcGNTyoXKEn4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadTemplate() {
    try {
        // Check if bucket exists
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

        if (bucketError) {
            console.error('Error listing buckets:', bucketError);
            return;
        }

        const bucketName = 'templates';
        const bucketExists = buckets.some(b => b.name === bucketName);

        if (!bucketExists) {
            console.log(`Bucket '${bucketName}' not found. Creating...`);
            const { data, error } = await supabase.storage.createBucket(bucketName, {
                public: true,
                allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                fileSizeLimit: 10485760 // 10MB
            });

            if (error) {
                console.error('Error creating bucket:', error);
                return;
            }
            console.log('Bucket created successfully.');
        } else {
            console.log(`Bucket '${bucketName}' already exists.`);
        }

        // Read file
        const filePath = './docs/template_tagueado.docx';
        const fileBuffer = fs.readFileSync(filePath);

        console.log('Uploading file...');
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload('template_tagueado.docx', fileBuffer, {
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                upsert: true
            });

        if (error) {
            console.error('Error uploading file:', error);
            return;
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl('template_tagueado.docx');

        console.log('File uploaded successfully!');
        console.log('Public URL:', publicUrlData.publicUrl);

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

uploadTemplate();
