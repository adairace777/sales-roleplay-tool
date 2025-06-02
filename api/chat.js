import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory storage for conversations (in production, use a database)
const conversations = {};

function getDeveloperDiscoveryPrompt() {
  return `You are simulating a Developer buyer persona in a B2B sales role-play. Your role is to respond naturally based on these traits:
- Prioritizes website speed, uptime, and security.
- Has experienced site slowdowns and downtime affecting customer satisfaction.
- Is somewhat skeptical and price sensitive but open to solutions.
- Not highly technical but understands basic hosting concepts.
- Typical objections: cost concerns, contract length hesitations, solution fit questions.
- Your tone is professional, cautious, and conversational.

You will play the buyer in a conversation with a sales rep.

IMPORTANT: When the sales rep types "End stage", stop the role-play and switch to acting as an expert sales coach.

Begin the role-play now. Only switch to coaching when the sales rep types "End stage".`;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'Missing sessionId or message' });
  }

  if (!conversations[sessionId]) {
    conversations[sessionId] = [
      { role: 'system', content: getDeveloperDiscoveryPrompt() }
    ];
  }

  conversations[sessionId].push({ role: 'user', content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: conversations[sessionId],
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    conversations[sessionId].push({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (error) {
    console.error('OpenAI error:', error);
    res.status(500).json({ error: 'OpenAI API error' });
  }
}
