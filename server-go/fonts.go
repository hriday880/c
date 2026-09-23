package main

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

func ScrapeDaFont(genre string) Typography {
	fallback := Typography{
		DisplayFont:     "Helvetica",
		BodyFont:        "Arial",
		DisplayWhy:      "Fallback font due to scrape failure.",
		BodyWhy:         "Fallback font due to scrape failure.",
		SpecimenHeading: "The weight of a held breath",
		SpecimenBody:    "Discover music that moves through you like light through old glass.",
	}

	themeID := 501 // Sans Serif
	g := strings.ToLower(genre)

	if strings.Contains(g, "electronic") || strings.Contains(g, "techno") || strings.Contains(g, "dance") {
		themeID = 301
	} else if strings.Contains(g, "classical") || strings.Contains(g, "jazz") {
		themeID = 502
	} else if strings.Contains(g, "hip hop") || strings.Contains(g, "rap") {
		themeID = 114
	} else if strings.Contains(g, "rock") || strings.Contains(g, "metal") {
		themeID = 115
	}

	scrapeURL := fmt.Sprintf("https://www.dafont.com/theme.php?cat=%d&text=Typography", themeID)
	req, _ := http.NewRequest("GET", scrapeURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("DaFont scrape error:", err)
		return fallback
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fallback
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		fmt.Println("DaFont parse error:", err)
		return fallback
	}

	var fonts []string
	doc.Find(".preview").Each(func(i int, s *goquery.Selection) {
		if name, exists := s.Attr("alt"); exists && name != "" {
			fonts = append(fonts, name)
		} else if title, exists := s.Attr("title"); exists && title != "" {
			fonts = append(fonts, title)
		}
	})

	if len(fonts) > 0 {
		fallback.DisplayFont = fonts[0]
		if len(fonts) > 1 {
			fallback.BodyFont = fonts[1]
		} else {
			fallback.BodyFont = fonts[0]
		}
		fallback.DisplayWhy = fmt.Sprintf("Scraped from DaFont (Theme %d) for the %s aesthetic.", themeID, genre)
		fallback.BodyWhy = "Complementary font scraped from DaFont."
	}

	return fallback
}
