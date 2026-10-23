import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject, getProjectDirs } from '../../src/project.mjs';
import { runFFmpeg } from '../../src/utils/paths.mjs';

export const transcribeTool = {
  definition: {
    name: 'transcribe',
    description: 'Transcribe a voiceover MP3 to word-level timestamps using Groq API (optimized for Filipino/Taglish). Generates a transcript JSON file and an SRT subtitle file for burned-in subtitles.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project identifier',
        },
        voiceoverFile: {
          type: 'string',
          description: 'Relative path to voiceover MP3 within project assets/voiceovers/. Example: "episode-01.mp3"',
        },
        outputName: {
          type: 'string',
          description: 'Name for output transcript file (without extension). Defaults to voiceover filename.',
        },
      },
      required: ['projectId', 'voiceoverFile'],
    },
  },

  async execute(args) {
    const project = loadProject(args.projectId);
    const dirs = getProjectDirs(args.projectId);
    
    const voiceoverPath = join(dirs.voiceovers, args.voiceoverFile);
    if (!existsSync(voiceoverPath)) {
      throw new Error(`Voiceover not found: ${voiceoverPath}. Drop the MP3 into projects/${args.projectId}/assets/voiceovers/`);
    }

    // Load Groq key
    const envPath = join(dirs.root, '.env');
    try { 
      const { loadEnvFile } = await import('node:process');
      loadEnvFile(envPath); 
    } catch {
      // Fallback for older Node
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not found in .env. Get a free key at https://console.groq.com/keys');
    }

    // Extract audio to 64kbps mono MP3 for Groq
    const tempAudio = join(dirs.root, '.temp-transcribe.mp3');
    runFFmpeg([
      '-y', '-loglevel', 'error',
      '-i', voiceoverPath,
      '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k',
      tempAudio,
    ]);

    // Call Groq API
    const audioBuffer = readFileSync(tempAudio);
    const form = new FormData();
    form.append('file', new Blob([audioBuffer]), 'audio.mp3');
    form.append('model', 'whisper-large-v3');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    // Clean up temp file
    try { 
      const { rmSync } = await import('node:fs');
      rmSync(tempAudio, { force: true }); 
    } catch {}

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq transcription failed: HTTP ${res.status} - ${text.slice(0, 200)}`);
    }

    const body = await res.json();

    // Convert to our transcript format
    const words = (body.words || []).map(w => ({
      text: w.word.trim(),
      start: w.start,
      end: w.end,
    }));

    const transcript = {
      text: words.map(w => w.text).join(' '),
      audio_duration_secs: body.duration || 0,
      words,
    };

    // Save transcript JSON
    const outputName = args.outputName || args.voiceoverFile.replace(/\.[^/.]+$/, '');
    const transcriptPath = join(dirs.root, 'assets', 'transcripts', `${outputName}.json`);
    
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(dirs.root, 'assets', 'transcripts'), { recursive: true });
    writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2));

    // Generate SRT file
    const srtContent = generateSRT(words);
    const srtPath = join(dirs.root, 'assets', 'transcripts', `${outputName}.srt`);
    writeFileSync(srtPath, srtContent);

    return {
      success: true,
      transcriptPath,
      srtPath,
      wordCount: words.length,
      duration: transcript.audio_duration_secs,
      sampleWords: words.slice(0, 5),
      nextSteps: [
        'Transcript ready for subtitle burn-in during rendering',
        'Link transcript to scene by setting narration.audioFile and narration.transcriptFile',
      ],
    };
  },
};

function generateSRT(words) {
  if (!words.length) return '';

  let srt = '';
  let index = 1;
  
  // Group words into lines of ~5-7 words or ~3 seconds
  let currentLine = [];
  let lineStart = words[0].start;
  
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentLine.push(w);
    
    const lineDuration = w.end - lineStart;
    const nextWord = words[i + 1];
    const gap = nextWord ? nextWord.start - w.end : 0;
    
    // Break line if: 6+ words, 3+ seconds, or long gap
    if (currentLine.length >= 6 || lineDuration >= 3 || gap > 0.5 || i === words.length - 1) {
      const start = formatTime(currentLine[0].start);
      const end = formatTime(currentLine[currentLine.length - 1].end);
      const text = currentLine.map(w => w.text).join(' ');
      
      srt += `${index}\n${start} --> ${end}\n${text}\n\n`;
      index++;
      
      currentLine = [];
      lineStart = nextWord?.start || 0;
    }
  }
  
  return srt;
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}
