const https = require('https');

const generateWithOpenRouter = (prompt, model) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model || 'meta-llama/llama-3.1-8b-instruct:free',
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
            reject(new Error(JSON.stringify(parsed.error)));
          } else if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error('No content: ' + body.substring(0, 200)));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Request error: ' + e.message)));
    req.setTimeout(45000, () => {
      req.destroy();
      reject(new Error('Timed out after 45s'));
    });
    req.write(data);
    req.end();
  });
};

// Try multiple free models in order until one works
const MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2-7b-instruct:free',
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const generateWithAI = async (prompt) => {
  for (let modelIndex = 0; modelIndex < MODELS.length; modelIndex++) {
    const model = MODELS[modelIndex];
    try {
      console.log('Trying model:', model);
      const result = await generateWithOpenRouter(prompt, model);
      console.log('Success with model:', model);
      return result;
    } catch (err) {
      const is429 = err.message.includes('429') || err.message.includes('rate') || err.message.includes('Rate') || err.message.includes('rate-limited');
      console.error('Model ' + model + ' failed:', err.message.substring(0, 100));
      if (is429) {
        console.log('Rate limited on ' + model + ' — trying next model...');
        await sleep(2000);
        continue;
      }
      // Non-rate-limit error — try next model
      await sleep(1000);
      continue;
    }
  }
  throw new Error('All models exhausted. Please try again in a minute.');
};

const generateBlogPost = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' blog post about: ' + topic + '. Include title, intro, 3 sections with subheadings, conclusion. Use markdown. Keep it concise under 500 words.'
);

const generateLinkedInPost = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' LinkedIn post about: ' + topic + '. Strong hook, 3 short paragraphs, call to action, 3-5 hashtags. Under 200 words.'
);

const generateTwitterThread = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' Twitter thread about: ' + topic + '. Exactly 5 tweets. Format: 1/ text 2/ text etc. Max 240 chars each.'
);

const generateYouTubeScript = (topic, tone) => generateWithAI(
  'Write a ' + tone + ' YouTube script about: ' + topic + '. Hook, intro, 3 points, outro. Keep under 400 words.'
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