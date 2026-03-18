const https = require('https');
https.get('https://ahorrafinal.vercel.app/app.js?v=5', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("File length:", data.length);
    console.log("First 100 chars:", data.substring(0, 100));
    try {
      new Function(data);
      console.log("Syntax check passed!");
    } catch (e) {
      console.log("Syntax error inside file!", e.message);
    }
  });
});
