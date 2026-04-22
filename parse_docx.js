const fs = require('fs');
const docx = require('docx-parser');
docx.parseDocx('./docs/modelo-de-termo-de-referencia-compras-lei-no-14-133-dez-25.docx', function(data){
    fs.writeFileSync('out_clean.txt', data);
    console.log("Done");
});
