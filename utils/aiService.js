const https = require('https');

const generateWithAI = (prompt) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.CLOUDFLARE_API_TOKEN;

    if (process.env.OPENROUTER_API_KEY) {
      const data = JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      });

      const options = {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://contentstudio.vercel.app',
          'X-Title': 'Content Studio'
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.error) {
              reject(new Error(JSON.stringify(parsed.error)));
            } else {
              resolve(parsed.choices[0].message.content);
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();

    } else {
      const data = JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful AI content writer.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1024
      });

      const options = {
        hostname: 'api.cloudflare.com',
        path: '/client/v4/accounts/' + process.env.CLOUDFLARE_ACCOUNT_ID + '/ai/run/@cf/meta/llama-3.1-8b-instruct',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (!parsed.success) {
              reject(new Error(JSON.stringify(parsed.errors)));
            } else {
              resolve(parsed.result.response);
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    }
  });
};

const generateBlogPost = async (topic, tone) => {
  return await generateWithAI(
    'You are an expert blog writer. Write in a ' + tone + ' tone. Write a detailed blog post about: ' + topic + '. Include: title, intro, 3 sections with subheadings, conclusion. Use markdown.'
  );
};

const generateLinkedInPost = async (topic, tone) => {
  return await generateWithAI(
    'You are a LinkedIn expert. Write in a ' + tone + ' tone. Write a LinkedIn post about: ' + topic + '. Strong hook, 3 paragraphs, CTA, 5 hashtags. Under 300 words.'
  );
};

const generateTwitterThread = async (topic, tone) => {
  return await generateWithAI(
    'You are a Twitter expert. Write in a ' + tone + ' tone. Write a 6 tweet thread about: ' + topic + '. Format: 1/ 2/ 3/ etc. Max 280 chars each.'
  );
};

const generateYouTubeScript = async (topic, tone) => {
  return await generateWithAI(
    'You are a YouTube scriptwriter. Write in a ' + tone + ' tone. Write a script about: ' + topic + '. Include hook, intro, 3 points, CTA, stage directions.'
  );
};

const generateEmailNewsletter = async (topic, tone) => {
  return await generateWithAI(
    'You are an email expert. Write in a ' + tone + ' tone. Write a newsletter about: ' + topic + '. Subject line, preview, greeting, 3 sections, CTA, sign-off.'
  );
};

module.exports = {
  generateBlogPost,
  generateLinkedInPost,
  generateTwitterThread,
  generateYouTubeScript,
  generateEmailNewsletter
};