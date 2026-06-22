const https = require('https');

const generateWithOpenRouter = (prompt) => {
  return new Promise((resolve, reject) => {
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
          console.log('OpenRouter response:', body.substring(0, 200));
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error('OpenRouter error: ' + JSON.stringify(parsed.error)));
          } else if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error('No content in response: ' + body.substring(0, 100)));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + e.message + ' Body: ' + body.substring(0, 100)));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Request error: ' + e.message)));
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Request timed out after 60 seconds'));
    });
    req.write(data);
    req.end();
  });
};

const generateWithCloudflare = (prompt) => {
  return new Promise((resolve, reject) => {
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
            reject(new Error('Cloudflare error: ' + JSON.stringify(parsed.errors)));
          } else {
            resolve(parsed.result.response);
          }
        } catch (e) {
          reject(new Error('Cloudflare parse error: ' + e.message));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Cloudflare request error: ' + e.message)));
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Cloudflare timed out'));
    });
    req.write(data);
    req.end();
  });
};

const generateWithAI = async (prompt) => {
  // Try OpenRouter first
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log('Trying OpenRouter...');
      const result = await generateWithOpenRouter(prompt);
      console.log('OpenRouter success');
      return result;
    } catch (err) {
      console.error('OpenRouter failed:', err.message);
      // Fall through to Cloudflare if available
    }
  }

  // Fallback to Cloudflare
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    try {
      console.log('Trying Cloudflare fallback...');
      const result = await generateWithCloudflare(prompt);
      console.log('Cloudflare success');
      return result;
    } catch (err) {
      console.error('Cloudflare failed:', err.message);
    }
  }

  throw new Error('All AI providers failed. Check API keys in environment variables.');
};

const generateBlogPost = async (topic, tone) => {
  return await generateWithAI(
    'You are an expert blog writer. Write in a ' + tone + ' tone. Write a detailed blog post about: ' + topic + '. Include: title, intro, 3 sections with subheadings, conclusion. Use markdown formatting.'
  );
};

const generateLinkedInPost = async (topic, tone) => {
  return await generateWithAI(
    'You are a LinkedIn expert. Write in a ' + tone + ' tone. Write a LinkedIn post about: ' + topic + '. Strong hook, 3 paragraphs, call to action, 5 relevant hashtags. Under 300 words.'
  );
};

const generateTwitterThread = async (topic, tone) => {
  return await generateWithAI(
    'You are a Twitter expert. Write in a ' + tone + ' tone. Write a 6 tweet thread about: ' + topic + '. Format each tweet as: 1/ 2/ 3/ etc. Max 280 characters each.'
  );
};

const generateYouTubeScript = async (topic, tone) => {
  return await generateWithAI(
    'You are a YouTube scriptwriter. Write in a ' + tone + ' tone. Write a YouTube video script about: ' + topic + '. Include hook, intro, 3 main points, call to action. Add stage directions in brackets.'
  );
};

const generateEmailNewsletter = async (topic, tone) => {
  return await generateWithAI(
    'You are an email marketing expert. Write in a ' + tone + ' tone. Write an email newsletter about: ' + topic + '. Include subject line, preview text, greeting, 3 sections, call to action, sign-off.'
  );
};

module.exports = {
  generateBlogPost,
  generateLinkedInPost,
  generateTwitterThread,
  generateYouTubeScript,
  generateEmailNewsletter
};