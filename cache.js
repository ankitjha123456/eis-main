const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 4423;
const SCRIPT_PATH = path.join(__dirname, 'cache.sh');

app.get('/cache', (req, res) => {
    console.log(`[${new Date().toISOString()}] /cache called`);

    exec(`bash ${SCRIPT_PATH}`, (error, stdout, stderr) => {

        if (error) {
            console.error('Script error:', error.message);
            return res.status(500).json({
                status: 'ERROR',
                message: error.message
            });
        }

        try {
            const result = JSON.parse(stdout.trim());
            console.log('Response sent:', result);
            return res.status(200).json(result);

        } catch (e) {
            console.error('JSON parse error:', e.message);
            return res.status(500).json({
                status: 'ERROR',
                message: 'Failed to parse script output',
                raw: stdout
            });
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://10.177.44.58:${PORT}/cache`);
});