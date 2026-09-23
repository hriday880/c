package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// FetchMusicData searches the free iTunes API for track data and album artwork.
func FetchMusicData(query string) (*MusicData, error) {
	apiURL := fmt.Sprintf("https://itunes.apple.com/search?term=%s&media=music&entity=song&limit=1", url.QueryEscape(query))
	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Minimal struct to decode only what we need from iTunes
	var result struct {
		Results []struct {
			TrackName        string `json:"trackName"`
			ArtistName       string `json:"artistName"`
			PrimaryGenreName string `json:"primaryGenreName"`
			ArtworkUrl100    string `json:"artworkUrl100"`
		} `json:"results"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if len(result.Results) == 0 {
		return nil, fmt.Errorf("no results found on iTunes")
	}

	r := result.Results[0]
	
	// Upgrade Apple's default 100x100 thumbnail to high-res 600x600
	artworkUrl600 := strings.Replace(r.ArtworkUrl100, "100x100bb", "600x600bb", 1)

	return &MusicData{
		TrackName:        r.TrackName,
		ArtistName:       r.ArtistName,
		PrimaryGenreName: r.PrimaryGenreName,
		ArtworkUrl:       artworkUrl600,
	}, nil
}
