
import fetch from 'node-fetch';

// A minimal valid 1-second silence MP3 base64 string
const SILENT_MP3_BASE64 = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAEAAAC9gAAA7YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQxAAACtsQAAAAAIAAAAJAQAABzTGl2ZUNhc3QudG9vbHMAAAAAAAAAAAAA//uQxAAAAAIAAAAAIAAAAJAQAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

// Dummy video URLs (we just want to trigger the route logic up to audio parsing)
// We need these to be valid enough that the route doesn't error out before checking audio
// But since we are testing headers/params, we can send strings.
// However, the route checks for 'inputVideos' length.
const videoPayload = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
];

async function testApi() {
  console.log("Testing API with direct payload...");
  const audioData = SILENT_MP3_BASE64;
  console.log(`Sending Audio Data Length: ${audioData.length}`);

  try {
    const response = await fetch("http://localhost:3000/api/video/stitch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videos: videoPayload,
        audio: audioData
      }),
    });

    console.log(`Response Status: ${response.status}`);
    const text = await response.text();
    console.log("Response Body Preview:", text.slice(0, 500));
    
    if (response.ok) {
      console.log("SUCCESS: API accepted the payload.");
    } else {
      console.error("FAILURE: API rejected the payload.");
    }

  } catch (err) {
    console.error("Request Failed:", err);
  }
}

testApi();
