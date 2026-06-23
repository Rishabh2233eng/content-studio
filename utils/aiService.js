const https = require('https');

const generateWithCloudflare = (prompt) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a helpful AI content writer. Write clear, engaging content.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800
    });

    const path = '/client/v4/accounts/' + process.env.CLOUDFLARE_ACCOUNT_ID + '/ai/run/@cf/meta/llama-3.1-8b-instruct';

    const options = {
      hostname: 'api.cloudflare.com',
      path: path,
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
          console.log('Cloudflare status:', res.statusCode);
          const parsed = JSON.parse(body);
          if (!parsed.success) {
            reject(new Error('Cloudflare error: ' + JSON.stringify(parsed.errors).substring(0, 100)));
          } else if (parsed.result && parsed.result.response) {
            resolve(parsed.result.response);
          } else {
            reject(new Error('No response from Cloudflare: ' + body.substring(0, 100)));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Network error: ' + e.message)));
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Cloudflare timeout after 60s'));
    });
    req.write(data);
    req.end();
  });
};

const generateWithOpenRouter = (prompt) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://content-studio-hbfr.onrender.com',
        'X-Title': 'ContentStudio',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          console.log('OpenRouter status:', res.statusCode);
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error('OpenRouter: ' + JSON.stringify(parsed.error).substring(0, 100)));
          } else if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error('No content from OpenRouter'));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Network error: ' + e.message)));
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('OpenRouter timeout'));
    });
    req.write(data);
    req.end();
  });
};

const generateWithAI = async (prompt) => {
  // Try Cloudflare first — truly free, no credits needed
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    try {
      console.log('Trying Cloudflare...');
      const result = await generateWithCloudflare(prompt);
      console.log('Cloudflare success');
      return result;
    } catch (err) {
      console.error('Cloudflare failed:', err.message.substring(0, 100));
    }
  }

  // Fallback to OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log('Trying OpenRouter fallback...');
      const result = await generateWithOpenRouter(prompt);
      console.log('OpenRouter success');
      return result;
    } catch (err) {
      console.error('OpenRouter failed:', err.message.substring(0, 100));
    }
  }

  throw new Error('All AI providers failed. Please try again.');
};

const generateBlogPost = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' blog post about: ' + topic + '. Include title, intro, 3 sections with subheadings, conclusion. Use markdown. Under 500 words.'
);

const generateLinkedInPost = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' LinkedIn post about: ' + topic + '. Strong hook, 3 short paragraphs, call to action, 3-5 hashtags. Under 200 words.'
);

const generateTwitterThread = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' Twitter thread about: ' + topic + '. 5 tweets. Format: 1/ text 2/ text etc. Max 240 chars each.'
);

const generateYouTubeScript = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' YouTube script about: ' + topic + '. Hook, intro, 3 main points, outro. Under 400 words.'
);

const generateEmailNewsletter = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' email newsletter about: ' + topic + '. Subject line, preview text, greeting, 2-3 sections, call to action. Under 300 words.'
);

module.exports = {
  generateBlogPost,
  generateLinkedInPost,
  generateTwitterThread,
  generateYouTubeScript,
  generateEmailNewsletter
};