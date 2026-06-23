const https = require('https');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1-0528:free',
  'google/gemma-3-27b-it:free',
  'qwen/qwen3-8b:free',
  'mistralai/devstral-small:free',
];

const callOpenRouter = (prompt, model) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
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
          console.log('OpenRouter status:', res.statusCode, '| model:', model);
          const parsed = JSON.parse(body);
          if (parsed.error) {
            const code = parsed.error.code || res.statusCode;
            reject(new Error(code + ':' + (parsed.error.message || '').substring(0, 80)));
          } else if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error('No content: ' + body.substring(0, 100)));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Network: ' + e.message)));
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Timeout 60s'));
    });
    req.write(data);
    req.end();
  });
};

const generateWithAI = async (prompt) => {
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      console.log('Trying model:', model);
      const result = await callOpenRouter(prompt, model);
      console.log('Success with:', model);
      return result;
    } catch (err) {
      const msg = err.message;
      console.error('Failed:', model, '-', msg.substring(0, 80));

      const is429 = msg.includes('429') || msg.includes('rate') || msg.includes('Rate');
      const is404 = msg.includes('404') || msg.includes('No endpoints');
      const is402 = msg.includes('402') || msg.includes('credits') || msg.includes('Credits');

      if (is402) {
        console.log('Credits required for this model, trying next...');
        await sleep(1000);
        continue;
      }
      if (is429) {
        console.log('Rate limited, waiting 8s before trying next model...');
        await sleep(8000);
        continue;
      }
      if (is404) {
        console.log('Model not found, trying next...');
        await sleep(500);
        continue;
      }
      // Other error — try next
      await sleep(2000);
      continue;
    }
  }
  throw new Error('All models failed. Please try again in a minute.');
};

const generateBlogPost = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' blog post about: ' + topic + '. Include title, intro, 3 sections with subheadings, conclusion. Use markdown. Under 500 words.'
);

const generateLinkedInPost = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' LinkedIn post about: ' + topic + '. Strong hook, 3 short paragraphs, call to action, 3-5 hashtags. Under 200 words.'
);

const generateTwitterThread = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' Twitter thread about: ' + topic + '. 5 tweets numbered 1/ through 5/. Max 240 chars each.'
);

const generateYouTubeScript = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' YouTube video script about: ' + topic + '. Hook, intro, 3 main points, outro. Under 400 words.'
);

const generateEmailNewsletter = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' email newsletter about: ' + topic + '. Subject line, preview text, greeting, 2 sections, call to action. Under 300 words.'
);

module.exports = {
  generateBlogPost,
  generateLinkedInPost,
  generateTwitterThread,
  generateYouTubeScript,
  generateEmailNewsletter
};