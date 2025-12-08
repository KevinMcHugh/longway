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
	origin     string
	diffGuitar int
	diffBass   int
	diffDrums  int
	diffVocals int
	diffKeys   int
	diffRhythm int
	diffCoop   int
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
	header := map[string]int{}
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
		if len(header) == 0 {
			header = detectHeader(rec)
			if len(header) > 0 {
				continue
			}
		}
		s, err := parseSong(rec, header)
		if err != nil {
			return nil, err
		}
		songs = append(songs, s)
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

func detectHeader(rec []string) map[string]int {
	if isHeader(rec) {
		result := make(map[string]int)
		for i, col := range rec {
			result[strings.ToLower(strings.TrimSpace(col))] = i
		}
		return result
	}
	return map[string]int{}
}

func field(rec []string, idx int) string {
	if idx >= len(rec) {
		return ""
	}
	return strings.TrimSpace(rec[idx])
}

func parseSong(rec []string, header map[string]int) (song, error) {
	get := func(key string, fallback int) string {
		if idx, ok := header[strings.ToLower(key)]; ok {
			return field(rec, idx)
		}
		if fallback < 0 {
			return ""
		}
		return field(rec, fallback)
	}

	id := get("id", 0)
	title := get("title", 1)
	artist := get("artist", 2)
	album := get("album", 3)
	genre := get("genre", 4)

	if id == "" || title == "" || artist == "" {
		return song{}, fmt.Errorf("invalid song record (need id,title,artist): %v", rec)
	}

	length := get("length", 6)
	secondsVal := parseDurationToSeconds(length)
	secondsField := get("seconds", -1)
	if secondsField != "" {
		if parsed, err := strconv.Atoi(secondsField); err == nil {
			secondsVal = parsed
		}
	}

	return song{
		id:         id,
		title:      title,
		artist:     artist,
		album:      album,
		genre:      genre,
		difficulty: parseDifficulty(get("diff_band", 5)),
		length:     length,
		year:       parseYear(get("year", 7)),
		seconds:    secondsVal,
		origin:     get("origin", -1),
		diffGuitar: parseDifficulty(get("diff_guitar", -1)),
		diffBass:   parseDifficulty(get("diff_bass", -1)),
		diffDrums:  parseDifficulty(get("diff_drums", -1)),
		diffVocals: parseDifficulty(get("diff_vocals", -1)),
		diffKeys:   parseDifficulty(get("diff_keys", -1)),
		diffRhythm: parseDifficulty(get("diff_rhythm", -1)),
		diffCoop:   parseDifficulty(get("diff_guitar_coop", -1)),
	}, nil
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
	if !strings.Contains(val, ":") {
		seconds, err := strconv.Atoi(val)
		if err == nil {
			return seconds
		}
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
	return clampDifficulty(d)
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
