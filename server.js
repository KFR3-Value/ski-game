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
        case '.jpg':
        case '.jpeg': contentType = 'image/jpeg'; break;
        case '.mp4': contentType = 'video/mp4'; break;
    }

    fs.stat(filePath, (error, stats) => {
        if (error) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        if (stats.isDirectory()) {
            res.writeHead(403);
            res.end('Directory access forbidden');
            return;
        }

        const totalSize = stats.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const startPart = parts[0];
            const endPart = parts[1];
            
            let start, end;
            
            if (startPart === "") {
                end = totalSize - 1;
                start = totalSize - parseInt(endPart, 10);
            } else if (endPart === "") {
                start = parseInt(startPart, 10);
                end = totalSize - 1;
            } else {
                start = parseInt(startPart, 10);
                end = parseInt(endPart, 10);
            }

            if (isNaN(start) || isNaN(end) || start < 0 || end >= totalSize || start > end) {
                res.writeHead(416, {
                    'Content-Range': `bytes */${totalSize}`
                });
                res.end();
                return;
            }

            const chunksize = (end - start) + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            
            fileStream.pipe(res);
            
            fileStream.on('error', (streamErr) => {
                console.error('Stream error:', streamErr);
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end('Internal server error');
                }
            });
        } else {
            res.writeHead(200, {
                'Content-Length': totalSize,
                'Content-Type': contentType,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
            fileStream.on('error', (streamErr) => {
                console.error('Stream error:', streamErr);
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end('Internal server error');
                }
            });
        }
    });
});

const PORT = process.env.PORT || 8080; // Cloud Run defaults to 8080
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
});
