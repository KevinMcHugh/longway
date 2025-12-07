package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

type song struct {
	id         string
	title      string
	artist     string
	album      string
	genre      string
	difficulty int
	length     string
	year       int
	seconds    int
}

func loadSongs(path string) ([]song, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true

	var songs []song
	for {
		rec, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if len(rec) == 0 {
			continue
		}
		if isHeader(rec) {
			continue
		}
		if len(rec) < 5 {
			return nil, fmt.Errorf("invalid song record (need at least id,title,artist,album,genre): %v", rec)
		}

		songs = append(songs, song{
			id:         strings.TrimSpace(rec[0]),
			title:      strings.TrimSpace(rec[1]),
			artist:     strings.TrimSpace(rec[2]),
			album:      field(rec, 3),
			genre:      field(rec, 4),
			difficulty: parseDifficulty(field(rec, 5)),
			length:     field(rec, 6),
			year:       parseYear(field(rec, 7)),
			seconds:    parseDurationToSeconds(field(rec, 6)),
		})
	}

	if len(songs) == 0 {
		return nil, fmt.Errorf("no songs loaded from %s", path)
	}

	return songs, nil
}

func isHeader(rec []string) bool {
	if len(rec) < 5 {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(rec[0]), "id") &&
		strings.EqualFold(strings.TrimSpace(rec[1]), "title") &&
		strings.EqualFold(strings.TrimSpace(rec[2]), "artist") &&
		strings.EqualFold(strings.TrimSpace(rec[3]), "album") &&
		strings.EqualFold(strings.TrimSpace(rec[4]), "genre")
}

func field(rec []string, idx int) string {
	if idx >= len(rec) {
		return ""
	}
	return strings.TrimSpace(rec[idx])
}

func parseYear(val string) int {
	if val == "" {
		return 0
	}
	y, err := strconv.Atoi(val)
	if err != nil {
		return 0
	}
	return y
}

func parseDurationToSeconds(val string) int {
	if val == "" {
		return 0
	}
	parts := strings.Split(val, ":")
	if len(parts) != 2 {
		return 0
	}
	minutes, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0
	}
	seconds, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0
	}
	return minutes*60 + seconds
}

func parseDifficulty(val string) int {
	if val == "" {
		return 0
	}
	d, err := strconv.Atoi(val)
	if err != nil {
		return 0
	}
	if d < 0 {
		return 0
	}
	if d > 6 {
		return 6
	}
	return d
}

func fallbackSong() song {
	return song{
		id:         "song-001",
		title:      "Eye of the Tiger",
		artist:     "Survivor",
		album:      "Eye of the Tiger",
		genre:      "Rock",
		difficulty: 3,
		year:       1982,
		length:     "4:05",
		seconds:    245,
	}
}

func findSongByTitle(songs []song, title string) (song, bool) {
	for _, s := range songs {
		if strings.EqualFold(s.title, title) {
			return s, true
		}
	}
	return song{}, false
}
