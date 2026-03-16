
import { mergeAudioVideo, stitchVideos } from './src/lib/ffmpeg-service';
import path from 'path';
import fs from 'fs';

async function test() {
  const cwd = process.cwd();
  const v1 = path.join(cwd, 'test_v1.mp4');
  const v2 = path.join(cwd, 'test_v2.mp4');
  const a1 = path.join(cwd, 'test_audio.mp3');
  const stitchOut = path.join(cwd, 'test_stitch_out.mp4');
  const finalOut = path.join(cwd, 'test_final_out.mp4');

  console.log('Testing Unified Merge...');
  try {
    const mergeResult = await mergeAudioVideo({
      videoPaths: [v1, v2],
      audioPath: a1,
      outputPath: finalOut
    });
    console.log('Merge Result:', mergeResult);
  } catch (e) {
    console.error('Merge Failed:', e);
    process.exit(1);
  }
}

test();
