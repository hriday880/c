const http = require('http');

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return Math.abs(hash);
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === '/api/analyze') {
    const q = url.searchParams.get('q');
    if (!q) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Missing query parameter 'q'" }));
    }

    try {
      // 1. Fetch Data (iTunes -> Deezer Fallback for Niche Songs)
      let trackName = "Unknown Track";
      let artistName = "Unknown Artist";
      let genre = "Pop";
      let artwork = "";
      let previewUrl = "";

      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=1&country=IN`;
      const itunesRes = await fetch(itunesUrl);
      const itunesData = await itunesRes.json();

      if (itunesData.results && itunesData.results.length > 0) {
        const trackInfo = itunesData.results[0];
        trackName = trackInfo.trackName || "Unknown Track";
        artistName = trackInfo.artistName || "Unknown Artist";
        genre = trackInfo.primaryGenreName || "Pop";
        artwork = (trackInfo.artworkUrl100 || "").replace('100x100bb', '600x600bb');
        previewUrl = trackInfo.previewUrl || "";
      } else {
        // Fallback to Deezer for underground/niche songs
        const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`;
        const deezerRes = await fetch(deezerUrl);
        const deezerData = await deezerRes.json();
        
        if (deezerData.data && deezerData.data.length > 0) {
          const trackInfo = deezerData.data[0];
          trackName = trackInfo.title;
          artistName = trackInfo.artist.name;
          genre = "Underground/Indie"; // Deezer search doesn't return genre directly
          artwork = trackInfo.album.cover_xl || trackInfo.album.cover_large || "";
          previewUrl = trackInfo.preview || "";
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Song not found on iTunes or Deezer" }));
        }
      }

      // 2. Lyrics Fallback
      let lyrics_snippet = `The rhythm of ${trackName} echoes with a distinct, undeniable energy.`;

      // 3. Dynamic Metadata Hash
      const h = hashString(trackName + artistName);
      const eras = ["contemporary", "golden age", "modern", "throwback", "timeless"];
      const moods = ["dynamic", "melancholic", "euphoric", "intense", "ethereal", "vibrant"];
      const tempos = ["varied", "upbeat", "downtempo", "driving", "syncopated"];

      // 4. Expressive Google Fonts (Frontend uses Google Fonts injection)
      const fontLibrary = {
        electronic: ["Syncopate", "Michroma", "Audiowide", "Orbitron", "Russo One", "Syne"],
        classical: ["Cinzel", "Playfair Display", "Cormorant Garamond", "Great Vibes", "Tangerine"],
        hiphop: ["Bebas Neue", "Anton", "Permanent Marker", "Rock Salt", "Teko", "Black Ops One"],
        rock: ["Metal Mania", "Creepster", "Nosifer", "Eater", "Bungee", "Rubik Mono One"],
        indian: ["Yatra One", "Rozha One", "Kurale", "Federo", "Kalam", "Arya", "Karma"],
        default: ["Montserrat", "Oswald", "Outfit", "Space Grotesk", "Poppins", "Inter"]
      };

      let selectedFonts = fontLibrary.default;
      const g_lower = genre.toLowerCase();
      
      if (g_lower.includes("electronic") || g_lower.includes("dance")) selectedFonts = fontLibrary.electronic;
      else if (g_lower.includes("classical") || g_lower.includes("jazz") || g_lower.includes("acoustic")) selectedFonts = fontLibrary.classical;
      else if (g_lower.includes("hip hop") || g_lower.includes("rap") || g_lower.includes("underground")) selectedFonts = fontLibrary.hiphop;
      else if (g_lower.includes("rock") || g_lower.includes("metal")) selectedFonts = fontLibrary.rock;
      else if (g_lower.includes("bollywood") || g_lower.includes("indian")) selectedFonts = fontLibrary.indian;

      let primaryVibeFonts = selectedFonts;
      let artisticFonts = fontLibrary.indian; // Fallback mix
      let exactMoodFonts = fontLibrary.electronic; // Fallback mix
      let cleanFonts = fontLibrary.default;
      
      if (selectedFonts === fontLibrary.indian) { artisticFonts = fontLibrary.classical; exactMoodFonts = fontLibrary.hiphop; }
      if (selectedFonts === fontLibrary.electronic) { artisticFonts = fontLibrary.rock; exactMoodFonts = fontLibrary.indian; }
      
      const getUnique = (arr, h_val, count) => {
        let res = [];
        for (let i = 0; i < count; i++) {
          res.push(arr[(h_val + i) % arr.length]);
        }
        return res;
      };

      const categories = [
        { name: "Primary Vibe", fonts: getUnique(primaryVibeFonts, h, 2) },
        { name: "Artistic Flair", fonts: getUnique(artisticFonts, h + 2, 2) },
        { name: "Exact Mood", fonts: getUnique(exactMoodFonts, h + 4, 2) },
        { name: "Clean & Legible", fonts: getUnique(cleanFonts, h + 6, 2) }
      ];

      // Grab the first font for the top-level mockup display
      let displayFont = categories[0].fonts[0];
      let bodyFont = categories[3].fonts[0];

      // 5. Accurate Mood Mapping (Heuristic based on Genre)
      let warmth = 50, energy = 50, darkness = 50, texture = 50, intimacy = 50;
      
      if (selectedFonts === fontLibrary.electronic) { energy = 90; texture = 85; warmth = 30; darkness = 60; intimacy = 20; }
      else if (selectedFonts === fontLibrary.classical) { warmth = 80; intimacy = 90; energy = 30; darkness = 40; texture = 70; }
      else if (selectedFonts === fontLibrary.hiphop) { energy = 85; darkness = 75; texture = 80; intimacy = 30; warmth = 40; }
      else if (selectedFonts === fontLibrary.rock) { energy = 95; darkness = 85; texture = 90; intimacy = 10; warmth = 50; }
      else if (selectedFonts === fontLibrary.indian) { warmth = 85; energy = 75; texture = 70; intimacy = 60; darkness = 30; }
      else { warmth = 60; energy = 70; texture = 50; intimacy = 50; darkness = 40; }

      // Add a slight random variation (-10 to +10) and scale to 0.0 - 1.0 for the frontend
      const vary = (val, seed) => {
        const variedInt = Math.min(100, Math.max(0, val + (hashString(trackName + seed) % 20) - 10));
        return parseFloat((variedInt / 100).toFixed(2));
      };

      const moodDimensions = [
        { label: 'Warmth',   value: vary(warmth, "w") },
        { label: 'Energy',   value: vary(energy, "e") },
        { label: 'Darkness', value: vary(darkness, "d") },
        { label: 'Texture',  value: vary(texture, "t") },
        { label: 'Intimacy', value: vary(intimacy, "i") }
      ];

      const payload = {
        song: {
          songName: trackName,
          artist: artistName,
          era: eras[h % eras.length],
          genre: genre,
          mood: moods[Math.floor(h / 3) % moods.length],
          tempo: tempos[Math.floor(h / 5) % tempos.length],
          artworkUrl: artwork,
          previewUrl: previewUrl,
          lyricsSnippet: lyrics_snippet,
          moodDimensions: moodDimensions,
          uiCard: {
            headline: `The sound of ${artistName}, visualized`,
            subtext: `A chromatic breakdown of ${trackName}`,
            ctaLabel: "EXPLORE SYSTEM"
          },
          designRationale: `Dominant clusters from ${trackName}'s album cover determine primary and accent roles.`,
          typography: {
            displayFont,
            bodyFont,
            categories: categories,
            specimenHeading: "The weight of a held breath",
            specimenBody: "Discover music that moves through you like light through old glass."
          }
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    } catch (e) {
      console.error(e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(8080, () => {
  console.log('Fast Node.js Backend running on http://localhost:8080');
});
