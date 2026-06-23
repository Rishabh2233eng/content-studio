const https = require('https');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const generateWithGemini = (prompt) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
    });

    const path = '/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=' + process.env.GEMINI_API_KEY;

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          console.log('Gemini status:', res.statusCode);
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error('Gemini error: ' + JSON.stringify(parsed.error).substring(0, 100)));
          } else if (parsed.candidates && parsed.candidates[0]) {
            const text = parsed.candidates[0].content.parts[0].text;
            resolve(text);
          } else {
            reject(new Error('No content from Gemini: ' + body.substring(0, 100)));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Network error: ' + e.message)));
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Gemini timeout after 60s'));
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
            reject(new Error('OpenRouter: ' + JSON.stringify(parsed.error).substring(0, 80)));
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
  // Try Gemini first — 1500 req/day free, no credits needed
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('Trying Gemini...');
      const result = await generateWithGemini(prompt);
      console.log('Gemini success!');
      return result;
    } catch (err) {
      console.error('Gemini failed:', err.message.substring(0, 100));
      if (err.message.includes('429')) {
        console.log('Gemini rate limited, waiting 5s...');
        await sleep(5000);
        try {
          const retry = await generateWithGemini(prompt);
          console.log('Gemini retry success!');
          return retry;
        } catch (e) {
          console.error('Gemini retry failed:', e.message.substring(0, 80));
        }
      }
    }
  }

  // Fallback to OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log('Trying OpenRouter fallback...');
      const result = await generateWithOpenRouter(prompt);
      console.log('OpenRouter success!');
      return result;
    } catch (err) {
      console.error('OpenRouter failed:', err.message.substring(0, 80));
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