const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Strip query strings (?v=2) and decode URL components (e.g. %20 -> space)
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = '.' + urlPath;
    if (filePath === './') filePath = './index.html';

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpeg'; break;
        case '.mp4': contentType = 'video/mp4'; break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(content);
        }
    });
});

server.listen(8081, '127.0.0.1', () => {
    console.log('Server running at http://127.0.0.1:8081/');
});
