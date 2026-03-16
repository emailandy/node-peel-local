export interface Avatar {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  gender: 'male' | 'female' | 'other';
  category: 'family' | 'professional' | 'creative' | 'solo';
}

export const STATIC_AVATARS: Avatar[] = [
  {
    id: "prof-1",
    name: "Sarah - Tech CEO",
    description: "A confident female technology CEO in a modern glass office, wearing a navy blazer, natural lighting, 8k resolution.",
    previewUrl: "/avatars/prof-1.png",
    gender: "female",
    category: "professional"
  },
  {
    id: "prof-2",
    name: "James - Architect",
    description: "A focused male architect reviewing blueprints in a sunlit studio, rolling up sleeves, wearing glasses, high detail.",
    previewUrl: "/avatars/prof-2.png",
    gender: "male",
    category: "professional"
  },
  {
    id: "prof-3",
    name: "Dr. Emily - Surgeon",
    description: "A dedicated female surgeon in scrubs, hospital hallway background, confident smile, professional lighting.",
    previewUrl: "/avatars/prof-3.png",
    gender: "female",
    category: "professional"
  },
  {
    id: "prof-4",
    name: "Michael - Lawyer",
    description: "A sharp male lawyer in a courtroom, wearing a grey suit, serious expression, dramatic lighting.",
    previewUrl: "/avatars/prof-4.png",
    gender: "male",
    category: "professional"
  },
  {
    id: "prof-5",
    name: "Linda - Real Estate",
    description: "A friendly female real estate agent standing in front of a modern house, holding a tablet, sunny day.",
    previewUrl: "/avatars/prof-5.png",
    gender: "female",
    category: "professional"
  },
  {
    id: "prof-6",
    name: "Robert - Engineer",
    description: "A male civil engineer at a construction site, wearing a hard hat and safety vest, holding blueprints.",
    previewUrl: "/avatars/prof-6.png",
    gender: "male",
    category: "professional"
  },
  {
    id: "prof-7",
    name: "Jessica - Marketing",
    description: "A creative female marketing director in a colorful office, brainstorming at a whiteboard, casual chic.",
    previewUrl: "/avatars/prof-7.png",
    gender: "female",
    category: "professional"
  },
  {
    id: "prof-8",
    name: "David - Finance",
    description: "A male financial analyst looking at multiple monitors with charts, modern trading floor background.",
    previewUrl: "/avatars/prof-8.png",
    gender: "male",
    category: "professional"
  },
  {
    id: "prof-9",
    name: "Karen - HR Manager",
    description: "A welcoming female HR manager in a corporate lobby, holding a folder, warm smile.",
    previewUrl: "/avatars/prof-9.png",
    gender: "female",
    category: "professional"
  },
  {
    id: "prof-10",
    name: "Thomas - Professor",
    description: "A distinct male professor in a university library, wearing a tweed jacket, holding a book.",
    previewUrl: "/avatars/prof-10.png",
    gender: "male",
    category: "professional"
  },
  {
    id: "prof-11",
    name: "Amanda - Chef",
    description: "A professional female chef in a high-end kitchen, plating a dish, chef whites, focused expression.",
    previewUrl: "/avatars/prof-11.png",
    gender: "female",
    category: "professional"
  },
  {
    id: "prof-12",
    name: "Daniel - Pilot",
    description: "A male airline pilot in the cockpit, wearing uniform and sunglasses, blue sky visible through window.",
    previewUrl: "/avatars/prof-12.png",
    gender: "male",
    category: "professional"
  },
  {
    id: "creat-1",
    name: "Elena - Painter",
    description: "A female artist in a paint-splattered studio, holding a palette and brush, bohemian style.",
    previewUrl: "/avatars/creat-1.png",
    gender: "female",
    category: "creative"
  },
  {
    id: "creat-2",
    name: "Marcus - Musician",
    description: "A cool male jazz musician playing saxophone in a dimly lit club, neon bokeh, atmospheric smoke.",
    previewUrl: "/avatars/creat-2.png",
    gender: "male",
    category: "creative"
  },
  {
    id: "creat-3",
    name: "Sophie - Writer",
    description: "A female writer sitting at a cafe window with a laptop and coffee, raining outside, cozy atmosphere.",
    previewUrl: "/avatars/creat-3.png",
    gender: "female",
    category: "creative"
  },
  {
    id: "creat-4",
    name: "Leo - Photographer",
    description: "A male photographer holding a vintage camera, standing in an urban street, golden hour lighting.",
    previewUrl: "/avatars/creat-4.png",
    gender: "male",
    category: "creative"
  },
  {
    id: "creat-5",
    name: "Isabella - Fashion",
    description: "A female fashion designer draping fabric on a mannequin, stylish studio, sketches on wall.",
    previewUrl: "/avatars/creat-5.png",
    gender: "female",
    category: "creative"
  },
  {
    id: "creat-6",
    name: "Alex - Potter",
    description: "A male potter at a wheel, hands covered in clay, rustic workshop, natural light.",
    previewUrl: "/avatars/creat-6.png",
    gender: "male",
    category: "creative"
  },
  {
    id: "creat-7",
    name: "Mia - Dancer",
    description: "A female ballet dancer in a studio, tying pointe shoes, soft natural light, graceful pose.",
    previewUrl: "/avatars/creat-7.png",
    gender: "female",
    category: "creative"
  },
  {
    id: "creat-8",
    name: "Lucas - Director",
    description: "A male film director on set, pointing at a scene, wearing a cap, film camera in foreground.",
    previewUrl: "/avatars/creat-8.png",
    gender: "male",
    category: "creative"
  },
  {
    id: "creat-9",
    name: "Chloe - DJ",
    description: "A female DJ at a festival deck, hands in air, vibrant stage lights, energetic crowd background.",
    previewUrl: "/avatars/creat-9.png",
    gender: "female",
    category: "creative"
  },
  {
    id: "creat-10",
    name: "Noah - Tattoo Artist",
    description: "A male tattoo artist sketching a design, edgy style, tattoo shop background.",
    previewUrl: "/avatars/creat-10.png",
    gender: "male",
    category: "creative"
  },
  {
    id: "creat-11",
    name: "Lily - Florist",
    description: "A female florist arranging a colorful bouquet, surrounded by flowers, bright shop.",
    previewUrl: "/avatars/creat-11.png",
    gender: "female",
    category: "creative"
  },
  {
    id: "creat-12",
    name: "Ethan - Graphic Des",
    description: "A male graphic designer working on a tablet, modern minimalist desk, vector art on screen.",
    previewUrl: "/avatars/creat-12.png",
    gender: "male",
    category: "creative"
  },
  {
    id: "fam-1",
    name: "Park Picnic",
    description: "A happy family of four having a picnic in a sunny park, laughing, eating sandwiches, vibrant colors.",
    previewUrl: "/avatars/fam-1.png",
    gender: "other",
    category: "family"
  },
  {
    id: "fam-2",
    name: "Father Daughter Bike",
    description: "A father teaching his young daughter how to ride a bike on a suburban street, golden hour.",
    previewUrl: "/avatars/fam-2.png",
    gender: "male",
    category: "family"
  },
  {
    id: "fam-3",
    name: "Mother Son Reading",
    description: "A mother reading a book to her son in a cozy armchair, warm lamp light, bedtime story.",
    previewUrl: "/avatars/fam-3.png",
    gender: "female",
    category: "family"
  },
  {
    id: "fam-4",
    name: "Holiday Dinner",
    description: "A large family gathering around a dinner table, laughing, turkey on table, warm festive lighting.",
    previewUrl: "/avatars/fam-4.png",
    gender: "other",
    category: "family"
  },
  {
    id: "fam-5",
    name: "Beach Day",
    description: "A family running on a sandy beach, holding hands, ocean waves in background, blue sky.",
    previewUrl: "/avatars/fam-5.png",
    gender: "other",
    category: "family"
  },
  {
    id: "fam-6",
    name: "Newborn",
    description: "Parents holding a newborn baby, close up on hands and baby feet, soft focus, angelic lighting.",
    previewUrl: "/avatars/fam-6.png",
    gender: "other",
    category: "family"
  },
  {
    id: "fam-7",
    name: "Hiking Trip",
    description: "A family hiking on a forest trail, wearing backpacks, nature background, dappled sunlight.",
    previewUrl: "/avatars/fam-7.png",
    gender: "other",
    category: "family"
  },
  {
    id: "fam-8",
    name: "Kitchen Baking",
    description: "A mother and children baking cookies in a messy kitchen, flour in air, laughing.",
    previewUrl: "/avatars/fam-8.png",
    gender: "female",
    category: "family"
  },
  {
    id: "fam-9",
    name: "Gaming Together",
    description: "A father and son playing video games on a couch, intense focus, holding controllers.",
    previewUrl: "/avatars/fam-9.png",
    gender: "male",
    category: "family"
  },
  {
    id: "fam-10",
    name: "Gardening",
    description: "A grandmother and grandchild planting flowers in a garden, soil on hands, sunny day.",
    previewUrl: "/avatars/fam-10.png",
    gender: "female",
    category: "family"
  },
  {
    id: "fam-11",
    name: "Siblings",
    description: "Two siblings (boy and girl) sharing headphones, listening to music on a bus, rainy window.",
    previewUrl: "/avatars/fam-11.png",
    gender: "other",
    category: "family"
  },
  {
    id: "fam-12",
    name: "Dog Walk",
    description: "A couple walking their dog in an autumn park, falling leaves, cozy sweaters.",
    previewUrl: "/avatars/fam-12.png",
    gender: "other",
    category: "family"
  },
  {
    id: "solo-1",
    name: "Maya - Hiker",
    description: "An adventurous female hiker standing on a mountain peak, overlooking a valley, wind in hair, epic view.",
    previewUrl: "/avatars/solo-1.png",
    gender: "female",
    category: "solo"
  },
  {
    id: "solo-2",
    name: "Alex - Gamer",
    description: "A focused male gamer wearing headset, RGB lighting reflection, dark room, cyber aesthetics.",
    previewUrl: "/avatars/solo-2.png",
    gender: "male",
    category: "solo"
  },
  {
    id: "solo-3",
    name: "Zara - Traveler",
    description: "A female traveler with a backpack looking at a map in a busy European street.",
    previewUrl: "/avatars/solo-3.png",
    gender: "female",
    category: "solo"
  },
  {
    id: "solo-4",
    name: "Ben - Runner",
    description: "A male runner exploring a city trail at sunrise, athletic wear, motion blur background.",
    previewUrl: "/avatars/solo-4.png",
    gender: "male",
    category: "solo"
  },
  {
    id: "solo-5",
    name: "Eva - Coffee",
    description: "A woman enjoying a coffee alone in a trendy cafe, contemplative expression, stylish outfit.",
    previewUrl: "/avatars/solo-5.png",
    gender: "female",
    category: "solo"
  },
  {
    id: "solo-6",
    name: "Sam - Skater",
    description: "A male skateboarder doing a trick at a skatepark, dynamic angle, urban setting.",
    previewUrl: "/avatars/solo-6.png",
    gender: "male",
    category: "solo"
  },
  {
    id: "solo-7",
    name: "Luna - Yoga",
    description: "A woman doing yoga on a mat by the beach at sunset, silhouette, peaceful atmosphere.",
    previewUrl: "/avatars/solo-7.png",
    gender: "female",
    category: "solo"
  },
  {
    id: "solo-8",
    name: "Max - Coding",
    description: "A developer coding late at night, multiple monitors, matrix code on screen, hood up.",
    previewUrl: "/avatars/solo-8.png",
    gender: "male",
    category: "solo"
  },
  {
    id: "solo-9",
    name: "Nina - Reading",
    description: "A woman reading a book on a park bench, autumn leaves, peaceful solitude.",
    previewUrl: "/avatars/solo-9.png",
    gender: "female",
    category: "solo"
  },
  {
    id: "solo-10",
    name: "Leo - Surfer",
    description: "A male surfer walking into the ocean with a surfboard, sunrise, waves crashing.",
    previewUrl: "/avatars/solo-10.png",
    gender: "male",
    category: "solo"
  },
  {
    id: "solo-11",
    name: "Tara - Meditation",
    description: "A woman meditating in a zen garden, eyes closed, lotus position, soft focus.",
    previewUrl: "/avatars/solo-11.png",
    gender: "female",
    category: "solo"
  },
  {
    id: "solo-12",
    name: "Ryan - Gym",
    description: "A man lifting weights in a gym, sweat, focused expression, gym equipment background.",
    previewUrl: "/avatars/solo-12.png",
    gender: "male",
    category: "solo"
  }
];
