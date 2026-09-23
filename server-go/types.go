package main

type MusicData struct {
	TrackName        string `json:"trackName"`
	ArtistName       string `json:"artistName"`
	PrimaryGenreName string `json:"primaryGenreName"`
	ArtworkUrl       string `json:"artworkUrl600"`
}

type Typography struct {
	DisplayFont     string `json:"displayFont"`
	BodyFont        string `json:"bodyFont"`
	DisplayWhy      string `json:"displayWhy"`
	BodyWhy         string `json:"bodyWhy"`
	SpecimenHeading string `json:"specimenHeading"`
	SpecimenBody    string `json:"specimenBody"`
}

type ScrapedInfo struct {
	LyricsSnippet   string            `json:"lyricsSnippet"`
	UICard          map[string]string `json:"uiCard"`
	DesignRationale string            `json:"designRationale"`
}

type SongPayload struct {
	SongName        string            `json:"songName"`
	Artist          string            `json:"artist"`
	Era             string            `json:"era"`
	Genre           string            `json:"genre"`
	Mood            string            `json:"mood"`
	Tempo           string            `json:"tempo"`
	ArtworkUrl      string            `json:"artworkUrl"`
	LyricsSnippet   string            `json:"lyricsSnippet"`
	UICard          map[string]string `json:"uiCard"`
	DesignRationale string            `json:"designRationale"`
	Typography      Typography        `json:"typography"`
}

type AnalyzeResponse struct {
	Song  SongPayload `json:"song"`
	Error string      `json:"error,omitempty"`
}
