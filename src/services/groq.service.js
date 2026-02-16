import Groq from 'groq-sdk';
import { env } from '../config/app.js';

const groq = new Groq({
  apiKey: env.groqKey
});

export async function askGroq(question, aiConfig) {
  const systemContent = [
    aiConfig?.systemPrompt,
    aiConfig?.sourceOfTruth,
    aiConfig?.aiBehavior
  ].filter(Boolean).join('\n\n');

  const res = await groq.chat.completions.create({
    model: aiConfig?.aiModel || 'llama-3.1-8b-instant',
    temperature: aiConfig?.aiTemperature ?? 0.6,
    top_p: aiConfig?.aiTopP ?? 0.9,
    max_tokens: aiConfig?.aiMaxTokens ?? undefined,
    messages: [
      {
        role: 'system',
        content: systemContent
      },
      {
        role: 'user',
        content: question
      }
    ]
  });

  return res.choices[0].message.content;
}
