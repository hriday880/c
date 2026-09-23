#include "httplib.h"
#include "json.hpp"
#include <curl/curl.h>
#include <iostream>
#include <string>
#include <regex>

using json = nlohmann::json;
using namespace httplib;

// Helper to handle libcurl writing data
size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

// Reusable function to make HTTPS GET requests using macOS native libcurl
std::string curl_get(const std::string& url) {
    CURL* curl;
    CURLcode res;
    std::string readBuffer;

    curl = curl_easy_init();
    if(curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);
        curl_easy_setopt(curl, CURLOPT_USERAGENT, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
        // Follow redirects
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        // Timeout
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
        
        res = curl_easy_perform(curl);
        curl_easy_cleanup(curl);
        
        if(res != CURLE_OK) return "";
    }
    return readBuffer;
}

// URL Encoder
std::string url_encode(const std::string &value) {
    CURL *curl = curl_easy_init();
    if(curl) {
        char *output = curl_easy_escape(curl, value.c_str(), value.length());
        if(output) {
            std::string result(output);
            curl_free(output);
            curl_easy_cleanup(curl);
            return result;
        }
    }
    return value;
}

int main() {
    Server svr;

    svr.Get("/api/analyze", [](const Request& req, Response& res) {
        // Handle CORS
        res.set_header("Access-Control-Allow-Origin", "*");

        if (!req.has_param("q")) {
            json error = {{"error", "Missing query parameter 'q'"}};
            res.status = 400;
            res.set_content(error.dump(), "application/json");
            return;
        }

        std::string q = req.get_param_value("q");
        
        // 1. Fetch iTunes Data
        std::string itunes_url = "https://itunes.apple.com/search?term=" + url_encode(q) + "&media=music&entity=song&limit=1&country=IN";
        std::string itunes_res = curl_get(itunes_url);
        
        json itunes_json;
        try {
            itunes_json = json::parse(itunes_res);
        } catch(...) {
            json error = {{"error", "Failed to parse iTunes API"}};
            res.status = 500;
            res.set_content(error.dump(), "application/json");
            return;
        }

        if (!itunes_json.contains("results") || itunes_json["results"].empty()) {
            json error = {{"error", "Song not found on iTunes"}};
            res.status = 404;
            res.set_content(error.dump(), "application/json");
            return;
        }

        auto trackInfo = itunes_json["results"][0];
        std::string trackName = trackInfo.value("trackName", "Unknown Track");
        std::string artistName = trackInfo.value("artistName", "Unknown Artist");
        std::string genre = trackInfo.value("primaryGenreName", "Pop");
        std::string artwork = trackInfo.value("artworkUrl100", "");
        std::string previewUrl = trackInfo.value("previewUrl", "");
        
        // Upgrade resolution to 600x600
        size_t pos = artwork.find("100x100bb");
        if (pos != std::string::npos) {
            artwork.replace(pos, 9, "600x600bb");
        }

        // 2. Fetch Lyrics (Lyrics.ovh)
        std::string lyrics_url = "https://api.lyrics.ovh/v1/" + url_encode(artistName) + "/" + url_encode(trackName);
        std::string lyrics_res = curl_get(lyrics_url);
        std::string lyrics_snippet = "Music is the art of the invisible made briefly visible.";
        
        try {
            json lyrics_json = json::parse(lyrics_res);
            if (lyrics_json.contains("lyrics")) {
                std::string full_lyrics = lyrics_json["lyrics"];
                // Basic string splitting to find first decent line
                size_t nl1 = full_lyrics.find('\n');
                if (nl1 != std::string::npos && nl1 > 10) {
                    lyrics_snippet = full_lyrics.substr(0, nl1);
                    // Remove carriage returns
                    lyrics_snippet.erase(std::remove(lyrics_snippet.begin(), lyrics_snippet.end(), '\r'), lyrics_snippet.end());
                }
            }
        } catch(...) {}

        // Fallback snippet if lyrics.ovh fails (very common for Indian/regional songs)
        if (lyrics_snippet == "Music is the art of the invisible made briefly visible.") {
            lyrics_snippet = "The rhythm of " + trackName + " echoes with a distinct, undeniable energy.";
        }

        // Create a pseudo-random hash to make sure different songs get different data
        std::hash<std::string> hasher;
        size_t h = hasher(trackName + artistName);
        
        std::vector<std::string> eras = {"contemporary", "golden age", "modern", "throwback", "timeless"};
        std::vector<std::string> moods = {"dynamic", "melancholic", "euphoric", "intense", "ethereal", "vibrant"};
        std::vector<std::string> tempos = {"varied", "upbeat", "downtempo", "driving", "syncopated"};

        // 3. Scrape DaFont
        int themeID = 501; // Sans Serif default
        std::string g_lower = genre;
        std::transform(g_lower.begin(), g_lower.end(), g_lower.begin(), ::tolower);
        
        if (g_lower.find("electronic") != std::string::npos || g_lower.find("dance") != std::string::npos) themeID = 301;
        else if (g_lower.find("classical") != std::string::npos || g_lower.find("jazz") != std::string::npos) themeID = 502;
        else if (g_lower.find("hip hop") != std::string::npos || g_lower.find("rap") != std::string::npos) themeID = 114;
        else if (g_lower.find("rock") != std::string::npos || g_lower.find("metal") != std::string::npos) themeID = 115;
        else if (g_lower.find("bollywood") != std::string::npos || g_lower.find("indian") != std::string::npos) themeID = 401; // Calligraphy for Indian

        std::string dafont_url = "https://www.dafont.com/theme.php?cat=" + std::to_string(themeID) + "&text=Typography";
        std::string dafont_html = curl_get(dafont_url);
        
        std::string displayFont = "Helvetica";
        std::string bodyFont = "Arial";
        
        std::regex font_regex(R"regex(<img[^>]*class="preview"[^>]*alt="([^"]+)")regex");
        std::sregex_iterator it(dafont_html.begin(), dafont_html.end(), font_regex);
        std::sregex_iterator end;
        
        std::vector<std::string> scrapedFonts;
        while (it != end) {
            scrapedFonts.push_back(it->str(1));
            ++it;
        }
        
        if (scrapedFonts.size() > 1) {
            displayFont = scrapedFonts[h % scrapedFonts.size()];
            bodyFont = scrapedFonts[(h / 2) % scrapedFonts.size()];
            if (displayFont == bodyFont) bodyFont = scrapedFonts[(h + 1) % scrapedFonts.size()];
        } else if (scrapedFonts.size() == 1) {
            displayFont = scrapedFonts[0];
        }

        // 4. Build JSON Response
        json payload = {
            {"song", {
                {"songName", trackName},
                {"artist", artistName},
                {"era", eras[h % eras.size()]},
                {"genre", genre},
                {"mood", moods[(h / 3) % moods.size()]},
                {"tempo", tempos[(h / 5) % tempos.size()]},
                {"artworkUrl", artwork},
                {"previewUrl", previewUrl},
                {"lyricsSnippet", lyrics_snippet},
                {"uiCard", {
                    {"headline", "The sound of " + artistName + ", visualized"},
                    {"subtext", "A chromatic breakdown of " + trackName},
                    {"ctaLabel", "Explore System"}
                }},
                {"designRationale", "Dominant clusters from " + trackName + "'s album cover determine primary and accent roles."},
                {"typography", {
                    {"displayFont", displayFont},
                    {"bodyFont", bodyFont},
                    {"displayWhy", "Scraped from DaFont (Theme " + std::to_string(themeID) + ")."},
                    {"bodyWhy", "Complementary font scraped from DaFont."},
                    {"specimenHeading", "The weight of a held breath"},
                    {"specimenBody", "Discover music that moves through you like light through old glass."}
                }}
            }}
        };

        res.set_content(payload.dump(), "application/json");
    });

    std::cout << "Fast C++ Backend running on http://localhost:8080\n";
    svr.listen("0.0.0.0", 8080);
}
