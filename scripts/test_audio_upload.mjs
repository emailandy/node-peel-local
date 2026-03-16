
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testAudioUpload() {
  const testFilePath = path.join(process.cwd(), 'temp_test_audio.mp3');
  
  // Create a dummy file
  fs.writeFileSync(testFilePath, "dummy audio content");

  try {
    console.log("Testing Audio Upload API...");
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));

    const response = await fetch("http://localhost:3000/api/audio/upload", {
      method: "POST",
      body: formData,
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Success:", JSON.stringify(data, null, 2));
    } else {
      console.error("Failed:", response.status, await response.text());
    }
  } catch (error) {
    console.error("Script failed:", error);
  } finally {
    // Cleanup
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testAudioUpload();
