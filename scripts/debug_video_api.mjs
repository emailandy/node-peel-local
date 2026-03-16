
// Native fetch is available in Node 18+
async function testVideoGen() {
  try {
    console.log("Testing Video Generation API...");
    const response = await fetch("http://localhost:3000/api/video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: "A cute banana dancing",
        model: "veo-3.1-generate-preview"
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`API Error (${response.status}):`);
      console.error(text);
    } else {
      const json = await response.json();
      console.log("Success:", json);
    }
  } catch (error) {
    console.error("Script failed:", error);
  }
}

testVideoGen();
