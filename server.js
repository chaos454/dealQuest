const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Resolve file path
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // Safety check: Prevent directory traversal outside the directory
    if (!filePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Access Forbidden');
        return;
    }

    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Return 404 for files that don't exist
                res.statusCode = 404;
                res.end('File Not Found');
            } else {
                // Return 500 for other errors
                res.statusCode = 500;
                res.end(`Internal Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('\n==================================================');
    console.log(`🎮 DealQuest is running successfully!`);
    console.log(`🔗 Local Server: http://localhost:${PORT}`);
    console.log('==================================================\n');
    console.log('Press Ctrl+C to stop the server.');
});
