import Groq from 'groq-sdk';
import { env } from '../config/env.js';

const groq = new Groq({
  apiKey: env.groqKey
});

// source of truth tentang kamu
const ILHAM_PROFILE = `
Nama: Ilham Muhamad
Usia: 25 tahun
Asal: Trenggalek, Jawa Timur
Domisili: Bendungan Hilir, Jakarta

Pendidikan:
- Teknik Informatika
- Perguruan Tinggi Indonesia Mandiri, Bandung

Pekerjaan:
- Mobile Developer di FTL Gym

Pengalaman:
- Berpengalaman di dunia software engineering sejak 2022
- Total pengalaman sekitar 4 tahun
`.trim();

export async function askGroq(question) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.4, // lebih stabil, ga halu
    messages: [
      {
        role: 'system',
        content: `
Kamu adalah AI pribadi milik Ilham Muhamad.

Gunakan informasi berikut sebagai SATU-SATUNYA sumber kebenaran:

${ILHAM_PROFILE}

Aturan:
- Jawab hanya berdasarkan informasi di atas
- Jangan mengarang atau menambah fakta baru
- Jika pertanyaan di luar topik Ilham, jawab sopan bahwa informasinya tidak tersedia
- Jawaban singkat, santai, manusiawi (1–3 kalimat)
        `.trim()
      },
      {
        role: 'user',
        content: question
      }
    ]
  });

  return res.choices[0].message.content;
}
