import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, createReadStream } from "fs";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { url } = req.body;
  const audioFile = "audio.mp3";

  try {
    // Download audio with yt-dlp
    execSync(`yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o ${audioFile} ${url}`);

    // Transcribe using Whisper via OpenAI
    const fileStream = createReadStream(audioFile);
    const transcript = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1"
    });

    const prompt = `Berikan 2-3 highlight dari transkrip berikut (dengan waktu HH:MM:SS - HH:MM:SS):\n\n${transcript.text}`;
    const gpt = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }]
    });

    unlinkSync(audioFile);
    res.json({ highlights: gpt.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
}
