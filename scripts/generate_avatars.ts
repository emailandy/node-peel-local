import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// 1. Configuration
const MODEL_ID = "gemini-3-pro-image-preview"; // Nano Banana Pro
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'avatars');
const TARGET_FILE = path.join(process.cwd(), 'src', 'lib', 'staticAvatars.ts');

// 2. Load API Key (Naive .env.local parser)
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/(^"|"$)/g, '');
      }
    });
  }
}
loadEnv();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY found in .env.local");
  process.exit(1);
}

// 3. Define Avatars
const CATEGORIES = ['professional', 'creative', 'family', 'solo'] as const;
type Category = typeof CATEGORIES[number];

interface AvatarDef {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  category: Category;
  description: string;
}

const AVATARS: AvatarDef[] = [
  // --- Professional (12) ---
  { id: 'prof-1', name: 'Sarah - Tech CEO', gender: 'female', category: 'professional', description: 'A confident female technology CEO in a modern glass office, wearing a navy blazer, natural lighting, 8k resolution.' },
  { id: 'prof-2', name: 'James - Architect', gender: 'male', category: 'professional', description: 'A focused male architect reviewing blueprints in a sunlit studio, rolling up sleeves, wearing glasses, high detail.' },
  { id: 'prof-3', name: 'Dr. Emily - Surgeon', gender: 'female', category: 'professional', description: 'A dedicated female surgeon in scrubs, hospital hallway background, confident smile, professional lighting.' },
  { id: 'prof-4', name: 'Michael - Lawyer', gender: 'male', category: 'professional', description: 'A sharp male lawyer in a courtroom, wearing a grey suit, serious expression, dramatic lighting.' },
  { id: 'prof-5', name: 'Linda - Real Estate', gender: 'female', category: 'professional', description: 'A friendly female real estate agent standing in front of a modern house, holding a tablet, sunny day.' },
  { id: 'prof-6', name: 'Robert - Engineer', gender: 'male', category: 'professional', description: 'A male civil engineer at a construction site, wearing a hard hat and safety vest, holding blueprints.' },
  { id: 'prof-7', name: 'Jessica - Marketing', gender: 'female', category: 'professional', description: 'A creative female marketing director in a colorful office, brainstorming at a whiteboard, casual chic.' },
  { id: 'prof-8', name: 'David - Finance', gender: 'male', category: 'professional', description: 'A male financial analyst looking at multiple monitors with charts, modern trading floor background.' },
  { id: 'prof-9', name: 'Karen - HR Manager', gender: 'female', category: 'professional', description: 'A welcoming female HR manager in a corporate lobby, holding a folder, warm smile.' },
  { id: 'prof-10', name: 'Thomas - Professor', gender: 'male', category: 'professional', description: 'A distinct male professor in a university library, wearing a tweed jacket, holding a book.' },
  { id: 'prof-11', name: 'Amanda - Chef', gender: 'female', category: 'professional', description: 'A professional female chef in a high-end kitchen, plating a dish, chef whites, focused expression.' },
  { id: 'prof-12', name: 'Daniel - Pilot', gender: 'male', category: 'professional', description: 'A male airline pilot in the cockpit, wearing uniform and sunglasses, blue sky visible through window.' },

  // --- Creative (12) ---
  { id: 'creat-1', name: 'Elena - Painter', gender: 'female', category: 'creative', description: 'A female artist in a paint-splattered studio, holding a palette and brush, bohemian style.' },
  { id: 'creat-2', name: 'Marcus - Musician', gender: 'male', category: 'creative', description: 'A cool male jazz musician playing saxophone in a dimly lit club, neon bokeh, atmospheric smoke.' },
  { id: 'creat-3', name: 'Sophie - Writer', gender: 'female', category: 'creative', description: 'A female writer sitting at a cafe window with a laptop and coffee, raining outside, cozy atmosphere.' },
  { id: 'creat-4', name: 'Leo - Photographer', gender: 'male', category: 'creative', description: 'A male photographer holding a vintage camera, standing in an urban street, golden hour lighting.' },
  { id: 'creat-5', name: 'Isabella - Fashion', gender: 'female', category: 'creative', description: 'A female fashion designer draping fabric on a mannequin, stylish studio, sketches on wall.' },
  { id: 'creat-6', name: 'Alex - Potter', gender: 'male', category: 'creative', description: 'A male potter at a wheel, hands covered in clay, rustic workshop, natural light.' },
  { id: 'creat-7', name: 'Mia - Dancer', gender: 'female', category: 'creative', description: 'A female ballet dancer in a studio, tying pointe shoes, soft natural light, graceful pose.' },
  { id: 'creat-8', name: 'Lucas - Director', gender: 'male', category: 'creative', description: 'A male film director on set, pointing at a scene, wearing a cap, film camera in foreground.' },
  { id: 'creat-9', name: 'Chloe - DJ', gender: 'female', category: 'creative', description: 'A female DJ at a festival deck, hands in air, vibrant stage lights, energetic crowd background.' },
  { id: 'creat-10', name: 'Noah - Tattoo Artist', gender: 'male', category: 'creative', description: 'A male tattoo artist sketching a design, edgy style, tattoo shop background.' },
  { id: 'creat-11', name: 'Lily - Florist', gender: 'female', category: 'creative', description: 'A female florist arranging a colorful bouquet, surrounded by flowers, bright shop.' },
  { id: 'creat-12', name: 'Ethan - Graphic Des', gender: 'male', category: 'creative', description: 'A male graphic designer working on a tablet, modern minimalist desk, vector art on screen.' },

  // --- Family (12) ---
  { id: 'fam-1', name: 'Park Picnic', gender: 'other', category: 'family', description: 'A happy family of four having a picnic in a sunny park, laughing, eating sandwiches, vibrant colors.' },
  { id: 'fam-2', name: 'Father Daughter Bike', gender: 'male', category: 'family', description: 'A father teaching his young daughter how to ride a bike on a suburban street, golden hour.' },
  { id: 'fam-3', name: 'Mother Son Reading', gender: 'female', category: 'family', description: 'A mother reading a book to her son in a cozy armchair, warm lamp light, bedtime story.' },
  { id: 'fam-4', name: 'Holiday Dinner', gender: 'other', category: 'family', description: 'A large family gathering around a dinner table, laughing, turkey on table, warm festive lighting.' },
  { id: 'fam-5', name: 'Beach Day', gender: 'other', category: 'family', description: 'A family running on a sandy beach, holding hands, ocean waves in background, blue sky.' },
  { id: 'fam-6', name: 'Newborn', gender: 'other', category: 'family', description: 'Parents holding a newborn baby, close up on hands and baby feet, soft focus, angelic lighting.' },
  { id: 'fam-7', name: 'Hiking Trip', gender: 'other', category: 'family', description: 'A family hiking on a forest trail, wearing backpacks, nature background, dappled sunlight.' },
  { id: 'fam-8', name: 'Kitchen Baking', gender: 'female', category: 'family', description: 'A mother and children baking cookies in a messy kitchen, flour in air, laughing.' },
  { id: 'fam-9', name: 'Gaming Together', gender: 'male', category: 'family', description: 'A father and son playing video games on a couch, intense focus, holding controllers.' },
  { id: 'fam-10', name: 'Gardening', gender: 'female', category: 'family', description: 'A grandmother and grandchild planting flowers in a garden, soil on hands, sunny day.' },
  { id: 'fam-11', name: 'Siblings', gender: 'other', category: 'family', description: 'Two siblings (boy and girl) sharing headphones, listening to music on a bus, rainy window.' },
  { id: 'fam-12', name: 'Dog Walk', gender: 'other', category: 'family', description: 'A couple walking their dog in an autumn park, falling leaves, cozy sweaters.' },

  // --- Solo (12) ---
  { id: 'solo-1', name: 'Maya - Hiker', gender: 'female', category: 'solo', description: 'An adventurous female hiker standing on a mountain peak, overlooking a valley, wind in hair, epic view.' },
  { id: 'solo-2', name: 'Alex - Gamer', gender: 'male', category: 'solo', description: 'A focused male gamer wearing headset, RGB lighting reflection, dark room, cyber aesthetics.' },
  { id: 'solo-3', name: 'Zara - Traveler', gender: 'female', category: 'solo', description: 'A female traveler with a backpack looking at a map in a busy European street.' },
  { id: 'solo-4', name: 'Ben - Runner', gender: 'male', category: 'solo', description: 'A male runner exploring a city trail at sunrise, athletic wear, motion blur background.' },
  { id: 'solo-5', name: 'Eva - Coffee', gender: 'female', category: 'solo', description: 'A woman enjoying a coffee alone in a trendy cafe, contemplative expression, stylish outfit.' },
  { id: 'solo-6', name: 'Sam - Skater', gender: 'male', category: 'solo', description: 'A male skateboarder doing a trick at a skatepark, dynamic angle, urban setting.' },
  { id: 'solo-7', name: 'Luna - Yoga', gender: 'female', category: 'solo', description: 'A woman doing yoga on a mat by the beach at sunset, silhouette, peaceful atmosphere.' },
  { id: 'solo-8', name: 'Max - Coding', gender: 'male', category: 'solo', description: 'A developer coding late at night, multiple monitors, matrix code on screen, hood up.' },
  { id: 'solo-9', name: 'Nina - Reading', gender: 'female', category: 'solo', description: 'A woman reading a book on a park bench, autumn leaves, peaceful solitude.' },
  { id: 'solo-10', name: 'Leo - Surfer', gender: 'male', category: 'solo', description: 'A male surfer walking into the ocean with a surfboard, sunrise, waves crashing.' },
  { id: 'solo-11', name: 'Tara - Meditation', gender: 'female', category: 'solo', description: 'A woman meditating in a zen garden, eyes closed, lotus position, soft focus.' },
  { id: 'solo-12', name: 'Ryan - Gym', gender: 'male', category: 'solo', description: 'A man lifting weights in a gym, sweat, focused expression, gym equipment background.' },
];

// 4. Client
const client = new GoogleGenAI({ apiKey });

async function generateImage(prompt: string, filename: string) {
  const filePath = path.join(OUTPUT_DIR, filename);

  if (fs.existsSync(filePath)) {
    console.log(`Skipping existing: ${filename}`);
    return; // Skip if exists
  }

  console.log(`Generating: ${filename}...`);
  try {
    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      config: {
        responseModalities: ["IMAGE"],
        candidateCount: 1,
      }
    });

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
      const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved: ${filename}`);
    } else {
      console.error(`Failed to generate ${filename}: No image in response`);
    }
  } catch (err: any) {
    console.error(`Error generating ${filename}:`, err);
  }
}

const CONCURRENCY = 5;

async function runConcurrent<T>(items: T[], fn: (item: T) => Promise<void>, concurrency: number) {
  const queue = [...items];
  const activeWorkers = [];

  for (let i = 0; i < concurrency; i++) {
    activeWorkers.push((async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) await fn(item);
      }
    })());
  }

  await Promise.all(activeWorkers);
}

async function main() {
  console.log(`Starting avatar generation (Concurrency: ${CONCURRENCY})...`);

  await runConcurrent(AVATARS, async (avatar) => {
    const filename = `${avatar.id}.png`;
    await generateImage(avatar.description, filename);
  }, CONCURRENCY);

  console.log("Generating staticAvatars.ts...");
  const fileContent = `export interface Avatar {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  gender: 'male' | 'female' | 'other';
  category: 'family' | 'professional' | 'creative' | 'solo';
}

export const STATIC_AVATARS: Avatar[] = [
${AVATARS.map(a => `  {
    id: "${a.id}",
    name: "${a.name}",
    description: "${a.description}",
    previewUrl: "/avatars/${a.id}.png",
    gender: "${a.gender}",
    category: "${a.category}"
  }`).join(',\n')}
];
`;

  fs.writeFileSync(TARGET_FILE, fileContent);
  console.log(`Updated ${TARGET_FILE}`);
  console.log("Done!");
}

main().catch(console.error);
