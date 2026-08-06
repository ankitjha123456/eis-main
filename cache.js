function httpGetJson(url, authHeader, timeoutMs) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      
      if (isHttps) {
        // Use https with custom agent that ignores SSL errors
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: { 
            Authorization: authHeader, 
            Accept: 'application/json' 
          },
          timeout: timeoutMs || 15000,
          rejectUnauthorized: false,  // IGNORE SSL ERRORS
          agent: new https.Agent({
            rejectUnauthorized: false
          })
        };
        
        const req = https.get(options, (res) => {
          let data = '';
          res.on('data', (c) => { data += c; });
          res.on('end', () => {
            if (res.statusCode === 401) {
              const challenge = (res.headers['www-authenticate'] || '').toString();
              if (/ntlm|negotiate/i.test(challenge)) {
                const e = new Error(
                  'TFS is requesting NTLM/Windows authentication instead of Basic auth — a plain username+password ' +
                  '(or PAT) cannot complete that handshake. Enable HTTP Basic Authentication on TFS or use "Alternate Credentials".'
                );
                e.isNtlmChallenge = true;
                return reject(e);
              }
              return reject(new Error('TFS rejected these credentials (HTTP 401) — check the username/password or PAT'));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`TFS returned HTTP ${res.statusCode} while verifying identity`));
            }
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error('TFS returned a non-JSON response while verifying identity')); }
          });
        });
        
        req.on('timeout', () => req.destroy(new Error('Timed out contacting TFS')));
        req.on('error', reject);
        req.end();
      } else {
        // HTTP (non-SSL) - use http module
        const lib = http;
        const req = lib.get(url, { 
          headers: { Authorization: authHeader, Accept: 'application/json' }, 
          timeout: timeoutMs || 15000 
        }, (res) => {
          let data = '';
          res.on('data', (c) => { data += c; });
          res.on('end', () => {
            if (res.statusCode === 401) {
              return reject(new Error('TFS rejected these credentials (HTTP 401) — check the username/password or PAT'));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`TFS returned HTTP ${res.statusCode} while verifying identity`));
            }
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error('TFS returned a non-JSON response while verifying identity')); }
          });
        });
        req.on('timeout', () => req.destroy(new Error('Timed out contacting TFS')));
        req.on('error', reject);
        req.end();
      }
    } catch (e) {
      return reject(new Error('Invalid TFS URL: ' + e.message));
    }
  });
}