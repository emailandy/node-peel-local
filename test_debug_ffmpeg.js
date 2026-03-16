
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

// Create dummy files so ffmpeg doesn't complain immediately
fs.writeFileSync('dummy_video.mp4', 'dummy data');
fs.writeFileSync('dummy_audio.mp3', 'dummy data');

console.log("Testing ffmpeg command generation...");

const command = ffmpeg()
  .input('dummy_video.mp4')
  .input('dummy_audio.mp3')
  .inputOption("-stream_loop -1") // Testing if this applies to audio
  .outputOptions([
    "-c:v copy",
    "-c:a aac",
    "-map 0:v:0",
    "-map 1:a:0",
    "-shortest",
    "-y"
  ])
  .on('start', (cmdLine) => {
    console.log("Generated Command: " + cmdLine);
  })
  .on('error', (err) => {
    // Expected to fail execution since files are fake
    // but we only care about the command line
    console.log("Execution stopped (expected): " + err.message);
  })
  .save('output.mp4');
