const express = require('express');
const multer = require('multer');
const path = require('path');
const upload = multer();
const app = express();
const PORT = 5555;

// Middleware
app.use(upload.any());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.setHeader('X-Creator', 'https://x.com/yz9yt');
    next();
});

// Vulnerable Endpoint
// Vulnerable Endpoint
app.post('/', (req, apiRes) => {
    console.log('[CTF] Received POST request');

    try {
        // In the real vulnerability, the payload comes in as a multipart form field
        // which contains a JSON string.
        // Based on the walkthrough curl, it's in field "0".
        const rawPayload = req.body['0'];

        if (rawPayload) {
            console.log('[CTF] Raw payload found');
            const payload = JSON.parse(rawPayload);

            // Navigate the object structure to find the injection point
            // Payload structure from walkthrough:
            // { ..., "_response": { "_prefix": "CODE_TO_EXECUTE", ... } }
            const codeToExecute = payload?._response?._prefix;

            if (codeToExecute) {
                console.log(`[CTF] ⚠️  Executing injected code: ${codeToExecute}`);

                // ---------------------------------------------------------
                // 🚨 REAL RCE EXECUTION 🚨
                // ---------------------------------------------------------
                // This will actually run the code.
                // The payload usually throws a specific error to return data.
                try {
                    // The payload in the walkthrough is:
                    // var res=...execSync('echo $((1337*2))')...; throw Object.assign(...)
                    const result = eval(codeToExecute);
                } catch (e) {
                    // The exploit relies on throwing a "NEXT_REDIRECT" error
                    // to leak the result via the digest property.
                    if (e.message === 'NEXT_REDIRECT' && e.digest) {
                        const digest = e.digest;
                        // format: NEXT_REDIRECT;push;/login?a=2674;307;
                        console.log(`[CTF] 💥 EXPLOIT SUCCESSFUL! Caught redirect digest: ${digest}`);

                        // Extract the "leaked" value (the result of the calc)
                        // It's after "/login?a=" and before the next semicolon
                        const match = digest.match(/a=(.*?);/);
                        const result = match ? match[1] : 'unknown';

                        apiRes.setHeader('X-Action-Redirect', `/dashboard?session=${result}&admin=true`);
                        apiRes.setHeader('Location', `/dashboard?session=${result}`);
                        apiRes.status(303).json({
                            status: "REDIRECT",
                            destination: "/dashboard",
                            leaked_data: result
                        });
                        return;
                    }
                    throw e; // rethrow if it's not our expected exploit error
                }
            }
        }
    } catch (err) {
        console.error('[CTF] Error processing request:', err.message);
    }

    // Default response if no exploit worked
    console.log('[CTF] Request received, but no valid exploit payload executed.');
    apiRes.status(401).json({
        error: "Unauthorized",
        message: "Invalid credentials or request format."
    });
});

// Fallback for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
    ██████╗ ████████╗███████╗
    ██╔════╝ ╚══██╔══╝██╔════╝
    ██║         ██║   █████╗  
    ██║         ██║   ██╔══╝  
    ╚██████╗    ██║   ██║     
     ╚═════╝    ╚═╝   ╚═╝     
    
    🏁 CTF CHALLENGE STARTED
    👉 Listening on http://localhost:${PORT}
    🛡️  Simulating: CVE-2025-55182 (Next.js/RSC)
    🐦 Creator: https://x.com/yz9yt
    `);
});
