const express = require('express');

class CorsBypassPlugin {
    constructor(core) {
        this.core = core;
        this.router = express.Router();
        this.setupRoutes();
    }

    setupRoutes() {
        this.router.post('/proxy', async (req, res) => {
            try {
                const { url, options } = req.body;
                
                if (!url) {
                    return res.status(400).send({ error: "Missing 'url' in request body." });
                }

                // Node.js native fetch (requires Node 18+)
                const response = await fetch(url, options);
                
                // Read response body as text
                const textData = await response.text();
                
                // Forward the status code and enable CORS globally for this endpoint
                res.status(response.status);
                res.set('Access-Control-Allow-Origin', '*');
                
                // Optionally forward some safe headers here if needed, but sending the text is enough for 99% cases
                res.send(textData);
                
            } catch (error) {
                console.error("[ST CORS Proxy] Error:", error);
                res.status(500).send({ error: error.message });
            }
        });
    }
}

const pluginInstance = new CorsBypassPlugin();

module.exports = {
    info: {
        id: 'st-cors-proxy',
        name: 'ST CORS Proxy',
        description: 'Internal proxy to bypass CORS',
        version: '1.0.0',
        author: 'Kaiz'
    },
    init: function(router, core) {
        router.use('/', pluginInstance.router);
    }
};
