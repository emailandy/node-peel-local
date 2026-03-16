import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

// Since ffmpeg-static installation failed, we rely on system ffmpeg
// but we allow overriding via env var for flexibility
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

// Unified function to stitch multiple videos and merge with external audio
export async function mergeAudioVideo({ videoPaths, audioPath, outputPath }: { videoPaths: string[], audioPath: string, outputPath: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Initialize FFmpeg
    let command = ffmpeg();

    // 2. Add all Video Inputs dynamically
    videoPaths.forEach((path) => {
      command = command.input(path);
    });

    // 3. Add Audio Input (This will be the last input index)
    command = command.input(audioPath).inputOption("-stream_loop -1");

    // Calculate the index of the audio file (e.g., if 3 videos, audio is index 3)
    const audioInputIndex = videoPaths.length;

    // 4. Create the Complex Filter
    // We need to build filters to scale each video, then concat them
    const scaleFilters = videoPaths.map((_, i) =>
      `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v${i}]`
    );

    const concatInputs = videoPaths.map((_, i) => `[v${i}]`).join('');
    // Concat: n=count, v=1 (output video), a=0 (no audio from videos)
    const concatFilter = `${concatInputs}concat=n=${videoPaths.length}:v=1:a=0[stitched_video]`;

    // Audio Reset Filter: Resets timestamps to 0
    const audioFilter = `[${audioInputIndex}:a]aresample=async=1:first_pts=0[aout]`;

    command
      .complexFilter([
        ...scaleFilters,
        concatFilter,
        audioFilter
      ])
      .outputOptions([
        // MAP THE VIDEO: Use the named label from our filter
        '-map [stitched_video]',

        // MAP THE AUDIO: Use the label from audio filter
        '-map [aout]',

        // ENCODING
        '-c:v libx264',      // Re-encode video to stitch safely
        '-preset fast',      // Speed/Quality trade-off
        '-c:a aac',          // WAV/MP3 must be converted to AAC for MP4
        '-ac 2',             // Force Stereo
        '-ar 44100',         // Force 44.1kHz

        // DURATION
        '-shortest',         // Stop if audio is shorter than combined video
        '-movflags +faststart'
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('FFmpeg Unified Merge Started:', cmd);
      })
      .on('stderr', (stderr) => {
        // Log stderr for debugging but don't spam if it's just progress
        // console.log('FFmpeg Stderr:', stderr); 
      })
      .on('error', (err, stdout, stderr) => {
        console.error('FFmpeg Unified Merge Error:', stderr);
        reject(err);
      })
      .on('end', () => {
        console.log('FFmpeg Unified Merge Complete:', outputPath);
        resolve(outputPath);
      })
      .run();
  });
}

interface StitchOptions {
  videoPaths: string[];
  outputPath: string;
}

export async function stitchVideos({ videoPaths, outputPath }: StitchOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    if (videoPaths.length < 2) {
      return reject(new Error('At least 2 videos are required for stitching'));
    }

    // Using concat filter for reliability with potentially different encoding parameters
    // This re-encodes, which is safer than concat demuxer for varied sources
    const command = ffmpeg();

    videoPaths.forEach((p) => command.input(p));

    // Create complex filter for scaling and concatenating
    // Scale all inputs to 1280x720 to ensure resolution consistency
    const inputLabels = videoPaths.map((_, i) => `[${i}:v]`);
    const filter = inputLabels.map((label, i) =>
      `${label}scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v${i}];`
    ).join('');

    const concatInput = videoPaths.map((_, i) => `[v${i}]`).join('');
    const fullFilter = `${filter}${concatInput}concat=n=${videoPaths.length}:v=1:a=0[outv]`;

    command
      .complexFilter(fullFilter)
      .outputOptions([
        '-map [outv]',
        '-c:v libx264',
        '-preset fast',
        '-movflags +faststart'
      ])
      .output(outputPath)
      .on('start', (cmdLine) => console.log("FFmpeg Stitch Started:", cmdLine))
      .on('end', () => {
        console.log("FFmpeg Stitch Complete:", outputPath);
        resolve(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error("FFmpeg Stitch Error:", stderr);
        reject(err);
      })
      .run();
  });
}
