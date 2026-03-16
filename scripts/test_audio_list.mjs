
import fetch from 'node-fetch';

async function testAudioList() {
  try {
    console.log("Testing Audio List API...");
    const response = await fetch("http://localhost:3000/api/audio/list");
    
    if (response.ok) {
      const data = await response.json();
      console.log("Success:", JSON.stringify(data, null, 2));
    } else {
      console.error("Failed:", response.status, await response.text());
    }
  } catch (error) {
    console.error("Script failed:", error);
  }
}

testAudioList();
