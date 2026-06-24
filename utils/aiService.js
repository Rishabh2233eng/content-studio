const https = require('https');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const generateWithCloudflare = (prompt) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a helpful AI content writer. Write clear, engaging, well-structured content.' },
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
          if (parsed.success === false) {
            reject(new Error('Cloudflare error: ' + JSON.stringify(parsed.errors).substring(0, 150)));
          } else if (parsed.result && parsed.result.response) {
            resolve(parsed.result.response);
          } else {
            reject(new Error('No response from Cloudflare: ' + body.substring(0, 150)));
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

const generateWithAI = async (prompt) => {
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    try {
      console.log('Trying Cloudflare...');
      const result = await generateWithCloudflare(prompt);
      console.log('Cloudflare success!');
      return result;
    } catch (err) {
      console.error('Cloudflare failed:', err.message.substring(0, 150));
      if (err.message.includes('429')) {
        console.log('Rate limited, waiting 5s...');
        await sleep(5000);
        try {
          const retry = await generateWithCloudflare(prompt);
          console.log('Cloudflare retry success!');
          return retry;
        } catch (e) {
          console.error('Retry failed:', e.message.substring(0, 80));
        }
      }
    }
  }
  throw new Error('Generation failed. Please try again.');
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