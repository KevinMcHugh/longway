package main

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
)

type challenge struct {
	id      string
	name    string
	summary string
	songs   []song
}

type challengeType int

const (
	challengeTest challengeType = iota
	challengeDecade
	challengeLongSong
	challengeGenre
	challengeDifficulty
)

const (
	challengeSongListSize = 12
)

func newChallenge(songs []song, rng *rand.Rand) *challenge {
	creators := []func([]song, *rand.Rand) (*challenge, bool){
		newDecadeChallenge,
		newLongSongChallenge,
		newGenreChallenge,
		newDifficultyChallenge,
	}

	if rng == nil {
		rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	}

	for _, idx := range rng.Perm(len(creators)) {
		if c, ok := creators[idx](songs, rng); ok {
			return c
		}
	}

	return newTestChallenge(songs)
}

func newDecadeChallenge(songs []song, rng *rand.Rand) (*challenge, bool) {
	byDecade := make(map[int][]song)
	for _, s := range songs {
		dec := decadeForYear(s.year)
		if dec == 0 {
			continue
		}
		byDecade[dec] = append(byDecade[dec], s)
	}

	var eligible []int
	for dec, list := range byDecade {
		if len(list) >= 3 {
			eligible = append(eligible, dec)
		}
	}

	if len(eligible) == 0 {
		return nil, false
	}

	decade := eligible[rng.Intn(len(eligible))]
	pool := byDecade[decade]
	selected := sampleSongs(pool, min(challengeSongListSize, len(pool)), rng)

	summary := fmt.Sprintf("Pick any 3 of these %d tracks from the %ds.", len(selected), decade)

	return &challenge{
		id:      fmt.Sprintf("decade-%d", decade),
		name:    "DecadeChallenge",
		summary: summary,
		songs:   selected,
	}, true
}

func newLongSongChallenge(songs []song, rng *rand.Rand) (*challenge, bool) {
	var longSongs []song
	for _, s := range songs {
		if s.seconds > 300 { // strictly over 5 minutes
			longSongs = append(longSongs, s)
		}
	}

	if len(longSongs) < 3 {
		return nil, false
	}

	selected := sampleSongs(longSongs, min(challengeSongListSize, len(longSongs)), rng)

	return &challenge{
		id:      "long-song",
		name:    "LongSongChallenge",
		summary: fmt.Sprintf("Pick any 3 of these %d long tracks (over 5 minutes).", len(selected)),
		songs:   selected,
	}, true
}

func newGenreChallenge(songs []song, rng *rand.Rand) (*challenge, bool) {
	byGenre := make(map[string][]song)
	for _, s := range songs {
		if s.genre == "" {
			continue
		}
		key := strings.ToLower(s.genre)
		byGenre[key] = append(byGenre[key], s)
	}

	var eligible []string
	for g, list := range byGenre {
		if len(list) >= 3 {
			eligible = append(eligible, g)
		}
	}

	if len(eligible) == 0 {
		return nil, false
	}

	genreKey := eligible[rng.Intn(len(eligible))]
	pool := byGenre[genreKey]
	selected := sampleSongs(pool, min(challengeSongListSize, len(pool)), rng)

	label := strings.Title(genreKey)
	return &challenge{
		id:      fmt.Sprintf("genre-%s", genreKey),
		name:    "GenreChallenge",
		summary: fmt.Sprintf("Pick any 3 of these %d %s tracks.", len(selected), label),
		songs:   selected,
	}, true
}

func newDifficultyChallenge(songs []song, rng *rand.Rand) (*challenge, bool) {
	if len(songs) == 0 {
		return nil, false
	}

	tiers := map[string][]song{
		"easy":   {},
		"medium": {},
		"hard":   {},
		"expert": {},
	}

	for _, s := range songs {
		tiers[difficultyTier(s.difficulty)] = append(tiers[difficultyTier(s.difficulty)], s)
	}

	labels := []string{"expert", "hard", "medium", "easy"}
	for _, label := range labels {
		if len(tiers[label]) >= 3 {
			selected := sampleSongs(tiers[label], min(challengeSongListSize, len(tiers[label])), rng)
			return &challenge{
				id:      fmt.Sprintf("difficulty-%s", label),
				name:    "DifficultyChallenge",
				summary: fmt.Sprintf("Pick any 3 of these %d %s tracks.", len(selected), label),
				songs:   selected,
			}, true
		}
	}

	return nil, false
}

func newTestChallenge(songs []song) *challenge {
	candidates := songs
	if len(candidates) == 0 {
		candidates = []song{fallbackSong()}
	}

	s := fallbackSong()
	if found, ok := findSongByTitle(candidates, "Eye of the Tiger"); ok {
		s = found
	} else {
		s = candidates[0]
	}

	summary := "Play \"Eye of the Tiger\" to push through this encounter."
	if s.artist != "" && s.title != "" {
		summary = fmt.Sprintf("Play \"%s\" by %s to push through this encounter.", s.title, s.artist)
	}

	return &challenge{
		id:      "test-challenge",
		name:    "TestChallenge",
		summary: summary,
		songs:   sampleSongs(candidates, min(challengeSongListSize, len(candidates)), rand.New(rand.NewSource(time.Now().UnixNano()))),
	}
}

func sampleSongs(pool []song, count int, rng *rand.Rand) []song {
	if len(pool) <= count {
		return append([]song{}, pool...)
	}

	out := make([]song, 0, count)
	indices := rng.Perm(len(pool))
	for i := 0; i < count; i++ {
		out = append(out, pool[indices[i]])
	}
	return out
}

func decadeForYear(year int) int {
	if year == 0 {
		return 0
	}
	return (year / 10) * 10
}

func difficultyTier(d int) string {
	switch {
	case d >= 6:
		return "expert"
	case d == 5:
		return "hard"
	case d == 3 || d == 4:
		return "medium"
	default:
		return "easy"
	}
}
