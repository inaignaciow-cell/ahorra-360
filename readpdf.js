const fs = require('fs');
const pdf = require('pdf-parse');
pdf(fs.readFileSync('C:/Users/ignac/Ahorra 360/Ahorra360_Features_Bible.pdf')).then(data => {
    fs.writeFileSync('C:/Users/ignac/Ahorra 360/Bible.txt', data.text);
    console.log("PDF Parsing Completed");
}).catch(err => console.error("PDF Parsing Error:", err));
