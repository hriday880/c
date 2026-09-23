package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func handleAnalyze(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	q := r.URL.Query().Get("q")
	if q == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(AnalyzeResponse{Error: "Missing query parameter 'q'"})
		return
	}

	musicData, err := FetchMusicData(q)
	if err != nil || musicData == nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(AnalyzeResponse{Error: "Song not found."})
		return
	}

	scrapedInfo := ScrapeSongInfo(musicData.ArtistName, musicData.TrackName)
	typography := ScrapeDaFont(musicData.PrimaryGenreName)

	payload := SongPayload{
		SongName:        musicData.TrackName,
		Artist:          musicData.ArtistName,
		Era:             "contemporary",
		Genre:           musicData.PrimaryGenreName,
		Mood:            "dynamic",
		Tempo:           "varied",
		ArtworkUrl:      musicData.ArtworkUrl,
		LyricsSnippet:   scrapedInfo.LyricsSnippet,
		UICard:          scrapedInfo.UICard,
		DesignRationale: scrapedInfo.DesignRationale,
		Typography:      typography,
	}

	json.NewEncoder(w).Encode(AnalyzeResponse{Song: payload})
}

func main() {
	godotenv.Load() // ignore error if .env doesn't exist

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Using 8080 as default for Go backend
	}

	http.HandleFunc("/api/analyze", handleAnalyze)

	fmt.Printf("Go backend server running on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
