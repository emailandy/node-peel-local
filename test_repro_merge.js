
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function run() {
    console.log("Generating test assets...");
    try {
        // Generate Video 1 (Red, 1s)
        execSync('ffmpeg -y -f lavfi -i color=c=red:s=320x240:d=1 -c:v libx264 -pix_fmt yuv420p video1.mp4', { stdio: 'ignore' });
        // Generate Video 2 (Blue, 1s)
        execSync('ffmpeg -y -f lavfi -i color=c=blue:s=320x240:d=1 -c:v libx264 -pix_fmt yuv420p video2.mp4', { stdio: 'ignore' });
        // Generate Audio (Sine wave, 0.5s)
        execSync('ffmpeg -y -f lavfi -i sine=f=440:d=0.5 -c:a libmp3lame audio.mp3', { stdio: 'ignore' });
    } catch (e) {
        console.error("Failed to generate assets with ffmpeg. Is ffmpeg installed?", e.message);
        return;
    }

    const v1 = "data:video/mp4;base64," + fs.readFileSync('video1.mp4').toString('base64');
    const v2 = "data:video/mp4;base64," + fs.readFileSync('video2.mp4').toString('base64');
    const a1 = "data:audio/mp3;base64," + fs.readFileSync('audio.mp3').toString('base64');

    console.log("Assets generated. Sending request to API...");

    try {
        const res = await fetch('http://localhost:3000/api/video/stitch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                videos: [v1, v2],
                audio: a1
            })
        });

        const data = await res.json();
        console.log("Response Status:", res.status);
        if (data.error) {
            console.error("API Error:", data.error);
        } else {
            console.log("Success! Video URL:", data.video);
            console.log("Please check the server logs in the other terminal to see detailed processing logs.");
        }

    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
    
    // Cleanup
    try {
        fs.unlinkSync('video1.mp4');
        fs.unlinkSync('video2.mp4');
        fs.unlinkSync('audio.mp3');
    } catch (e) {}
}

run();
