package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type LyricsOVHResponse struct {
	Lyrics string `json:"lyrics"`
}

func ScrapeSongInfo(artist, track string) ScrapedInfo {
	fallback := ScrapedInfo{
		LyricsSnippet: "Music is the art of the invisible made briefly visible.",
		UICard: map[string]string{
			"headline": "Where sound finally meets form",
			"subtext":  "Design systems born from the music you love.",
			"ctaLabel": "Explore System",
		},
		DesignRationale: "Palette built from pixel-cluster analysis of the album artwork. Accent is the most chromatically distinct secondary hue.",
	}

	apiURL := fmt.Sprintf("https://api.lyrics.ovh/v1/%s/%s", url.PathEscape(artist), url.PathEscape(track))
	
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(apiURL)
	
	if err == nil {
		defer resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			var lyricsResp LyricsOVHResponse
			if err := json.NewDecoder(resp.Body).Decode(&lyricsResp); err == nil && lyricsResp.Lyrics != "" {
				lines := strings.Split(lyricsResp.Lyrics, "\n")
				var validLines []string
				for _, line := range lines {
					trimmed := strings.TrimSpace(line)
					if len(trimmed) > 15 && !strings.Contains(trimmed, "[") {
						validLines = append(validLines, trimmed)
					}
				}
				if len(validLines) >= 3 {
					fallback.LyricsSnippet = strings.Join(validLines[:3], " / ")
				}
			}
		}
	}

	fallback.UICard["headline"] = fmt.Sprintf("The sound of %s, visualized", artist)
	fallback.UICard["subtext"] = fmt.Sprintf("A chromatic breakdown of %s", track)
	fallback.DesignRationale = fmt.Sprintf("Dominant clusters from %s's album cover determine primary and accent roles. Background and text are computed to maximize readability.", track)

	return fallback
}
