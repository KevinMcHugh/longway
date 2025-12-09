package main

import (
	"math/rand"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestGenerateRunCreatesChallengeNodes(t *testing.T) {
	seed := int64(12345)
	songs := []song{
		{title: "Eye of the Tiger", artist: "Survivor", length: "4:05", seconds: 245, year: 1982, difficulty: 3},
		{title: "Through the Fire and Flames", artist: "DragonForce", length: "7:24", seconds: 444, year: 2006, difficulty: 6},
		{title: "Knights of Cydonia", artist: "Muse", length: "6:06", seconds: 366, year: 2006, difficulty: 5},
	}
	acts := generateRun(seed, songs)

	if len(acts) != totalActs {
		t.Fatalf("expected %d acts, got %d", totalActs, len(acts))
	}

	for actIdx, a := range acts {
		if a.index != actIdx+1 {
			t.Fatalf("act index mismatch: got %d want %d", a.index, actIdx+1)
		}
		for rowIdx, row := range a.rows {
			if len(row) == 0 {
				t.Fatalf("act %d row %d has no nodes", a.index, rowIdx)
			}
			for colIdx, n := range row {
				if rowIdx == len(a.rows)-1 {
					if n.kind != nodeBoss {
						t.Fatalf("act %d final row col %d kind = %v, want boss", a.index, colIdx, n.kind)
					}
					continue
				}
				if n.kind == nodeShop {
					continue
				}
				if n.kind != nodeChallenge {
					t.Fatalf("act %d row %d col %d kind = %v, want %v", a.index, rowIdx, colIdx, n.kind, nodeChallenge)
				}
				if n.challenge == nil {
					t.Fatalf("act %d row %d col %d missing challenge", a.index, rowIdx, colIdx)
				}
				if len(n.challenge.songs) == 0 {
					t.Fatalf("act %d row %d col %d challenge missing songs", a.index, rowIdx, colIdx)
				}
			}
		}
	}
}

func TestHorizontalMovementClamps(t *testing.T) {
	a := act{
		index: 1,
		rows: [][]node{
			{
				{col: 0},
				{col: 1},
			},
		},
	}
	m := model{
		acts:       []act{a},
		currentAct: 0,
		cursorRow:  0,
		cursorCol:  0,
		allowed:    []int{0, 1},
		allowedIdx: 0,
	}

	m.moveHorizontal(-1)
	if m.cursorCol != 0 {
		t.Fatalf("moveHorizontal underflow: col %d, want 0", m.cursorCol)
	}

	m.moveHorizontal(1)
	if m.cursorCol != 1 {
		t.Fatalf("moveHorizontal right: col %d, want 1", m.cursorCol)
	}

	m.moveHorizontal(5)
	if m.cursorCol != 1 {
		t.Fatalf("moveHorizontal overflow clamp: col %d, want 1", m.cursorCol)
	}
}

func TestSwitchActResetsCursor(t *testing.T) {
	acts := []act{
		{index: 1, rows: [][]node{{{col: 0}}}},
		{index: 2, rows: [][]node{{{col: 0}, {col: 1}}}},
	}
	m := model{acts: acts, currentAct: 0, cursorRow: 0, cursorCol: 0}
	m.cursorRow = 0
	m.cursorCol = 1

	m.nextAct()
	if m.currentAct != 1 {
		t.Fatalf("expected currentAct 1, got %d", m.currentAct)
	}
	if m.cursorRow != 0 || m.cursorCol != 0 {
		t.Fatalf("cursor not reset on nextAct: row %d col %d", m.cursorRow, m.cursorCol)
	}

	m.prevAct()
	if m.currentAct != 0 {
		t.Fatalf("expected currentAct 0, got %d", m.currentAct)
	}
	if m.cursorRow != 0 || m.cursorCol != 0 {
		t.Fatalf("cursor not reset on prevAct: row %d col %d", m.cursorRow, m.cursorCol)
	}
}

func TestRenderNodePreviewIncludesChallengeDetails(t *testing.T) {
	n := &node{
		kind: nodeChallenge,
		challenge: &challenge{
			name:    "TestChallenge",
			summary: "Play it.",
			songs: []song{
				{title: "Eye of the Tiger", artist: "Survivor"},
			},
		},
	}

	out := renderNodePreview(n, nil)
	if !strings.Contains(out, "TestChallenge") || !strings.Contains(out, "Play it.") {
		t.Fatalf("renderNodePreview missing challenge details: %s", out)
	}
}

func TestLoadSongsReadsCSV(t *testing.T) {
	_, filename, _, _ := runtime.Caller(0)
	path := filepath.Join(filepath.Dir(filename), "..", "..", "songs.csv")

	songs, err := loadSongs(path)
	if err != nil {
		t.Fatalf("loadSongs error: %v", err)
	}
	if len(songs) < 20 {
		t.Fatalf("expected at least 20 songs from CSV, got %d", len(songs))
	}

	found := false
	for _, s := range songs {
		if strings.EqualFold(s.title, "Eye of the Tiger") && strings.EqualFold(s.artist, "Survivor") {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected Eye of the Tiger in songs.csv")
	}
}

func TestLoadSongsSupportsSecondsColumn(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.csv")
	contents := "id,title,artist,album,genre,diff_band,length,year,seconds,origin,diff_guitar\n" +
		"id-1,Song One,Artist,Album,Rock,4,6:00,2000,360,Pack A,5\n"
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("write temp csv: %v", err)
	}

	songs, err := loadSongs(path)
	if err != nil {
		t.Fatalf("loadSongs error: %v", err)
	}
	if len(songs) != 1 {
		t.Fatalf("expected 1 song, got %d", len(songs))
	}
	if songs[0].seconds != 360 {
		t.Fatalf("expected seconds=360, got %d", songs[0].seconds)
	}
	if songs[0].length != "6:00" {
		t.Fatalf("expected length to be preserved, got %s", songs[0].length)
	}
	if songs[0].origin != "Pack A" {
		t.Fatalf("expected origin to parse")
	}
	if songs[0].diffGuitar != 5 {
		t.Fatalf("expected diffGuitar=5, got %d", songs[0].diffGuitar)
	}
}

func TestNewDecadeChallengePicksSameDecade(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	songs := []song{
		{title: "SongA", artist: "A", year: 1981, difficulty: 2},
		{title: "SongB", artist: "B", year: 1982, difficulty: 2},
		{title: "SongC", artist: "C", year: 1985, difficulty: 2},
		{title: "Other", artist: "D", year: 1999, difficulty: 2},
	}

	ch, ok := newDecadeChallenge(songs, rng, challengeSongListSize)
	if !ok {
		t.Fatalf("expected decade challenge")
	}
	if len(ch.songs) == 0 || len(ch.songs) > challengeSongListSize {
		t.Fatalf("expected 1..%d songs, got %d", challengeSongListSize, len(ch.songs))
	}
	for _, s := range ch.songs {
		if decadeForYear(s.year) != decadeForYear(ch.songs[0].year) {
			t.Fatalf("songs from different decades: %d vs %d", s.year, ch.songs[0].year)
		}
	}
}

func TestNewLongSongChallengePicksLongTracks(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	songs := []song{
		{title: "Short", seconds: 200, difficulty: 2},
		{title: "LongA", seconds: 301, difficulty: 2},
		{title: "LongB", seconds: 400, difficulty: 2},
		{title: "LongC", seconds: 500, difficulty: 2},
	}

	ch, ok := newLongSongChallenge(songs, rng, challengeSongListSize)
	if !ok {
		t.Fatalf("expected long song challenge")
	}
	if len(ch.songs) == 0 || len(ch.songs) > challengeSongListSize {
		t.Fatalf("expected 1..%d songs, got %d", challengeSongListSize, len(ch.songs))
	}
	for _, s := range ch.songs {
		if s.seconds <= 300 {
			t.Fatalf("included non-long song: %v", s)
		}
	}
}

func TestNewGenreChallengeUsesSameGenre(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	songs := []song{
		{title: "SongA", artist: "A", genre: "Rock", difficulty: 2},
		{title: "SongB", artist: "B", genre: "Rock", difficulty: 2},
		{title: "SongC", artist: "C", genre: "Rock", difficulty: 2},
		{title: "SongD", artist: "D", genre: "Pop", difficulty: 2},
	}

	ch, ok := newGenreChallenge(songs, rng, challengeSongListSize)
	if !ok {
		t.Fatalf("expected genre challenge")
	}
	if len(ch.songs) == 0 || len(ch.songs) > challengeSongListSize {
		t.Fatalf("expected 1..%d songs, got %d", challengeSongListSize, len(ch.songs))
	}
	for _, s := range ch.songs {
		if strings.ToLower(s.genre) != strings.ToLower(ch.songs[0].genre) {
			t.Fatalf("songs from different genres: %s vs %s", s.genre, ch.songs[0].genre)
		}
	}
}

func TestNewDifficultyChallengeUsesTier(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	songs := []song{
		{title: "Lvl1-A", difficulty: 1},
		{title: "Lvl1-B", difficulty: 1},
		{title: "Lvl1-C", difficulty: 1},
		{title: "Lvl2", difficulty: 2},
		{title: "Lvl4", difficulty: 4},
	}

	ch, ok := newDifficultyChallenge(songs, rng, challengeSongListSize)
	if !ok {
		t.Fatalf("expected difficulty challenge")
	}
	if len(ch.songs) == 0 || len(ch.songs) > challengeSongListSize {
		t.Fatalf("expected 1..%d songs, got %d", challengeSongListSize, len(ch.songs))
	}

	firstLevel := ch.songs[0].difficulty
	for _, s := range ch.songs {
		if s.difficulty != firstLevel {
			t.Fatalf("mixed difficulty levels: %d vs %d", s.difficulty, firstLevel)
		}
	}
}

func TestApplyActDifficultyConstraints(t *testing.T) {
	songs := []song{
		{title: "Low", difficulty: 1},
		{title: "Mid", difficulty: 3},
		{title: "High", difficulty: 6},
	}

	act1 := applyActDifficultyConstraints(1, songs)
	for _, s := range act1 {
		if s.difficulty > 3 {
			t.Fatalf("act1 contains high diff: %d", s.difficulty)
		}
	}

	act2 := applyActDifficultyConstraints(2, songs)
	for _, s := range act2 {
		if s.difficulty > 5 {
			t.Fatalf("act2 contains too high diff: %d", s.difficulty)
		}
	}

	act3 := applyActDifficultyConstraints(3, songs)
	for _, s := range act3 {
		if s.difficulty < 3 {
			t.Fatalf("act3 contains too low diff: %d", s.difficulty)
		}
	}
}

func TestPickPoolSizePerAct(t *testing.T) {
	rng := rand.New(rand.NewSource(5))

	size1 := pickPoolSize(1, 20, rng)
	if size1 < 9 || size1 > 12 {
		t.Fatalf("act1 pool size out of range: %d", size1)
	}

	size2 := pickPoolSize(2, 20, rng)
	if size2 < 6 || size2 > 9 {
		t.Fatalf("act2 pool size out of range: %d", size2)
	}

	size3 := pickPoolSize(3, 20, rng)
	if size3 < 3 || size3 > 5 {
		t.Fatalf("act3 pool size out of range: %d", size3)
	}

	clamped := pickPoolSize(1, 5, rng)
	if clamped != 5 {
		t.Fatalf("pool size should clamp to available: got %d want 5", clamped)
	}
}

func TestBossIsLastRow(t *testing.T) {
	seed := int64(123)
	songs := []song{
		{title: "Bohemian Rhapsody", artist: "Queen", difficulty: 6, seconds: 355},
		{title: "Other", artist: "X", difficulty: 3, seconds: 200},
	}
	acts := generateRun(seed, songs)
	for _, a := range acts {
		last := a.rows[len(a.rows)-1]
		if len(last) != 1 || last[0].kind != nodeBoss {
			t.Fatalf("last row not boss: %+v", last)
		}
		if last[0].challenge == nil || last[0].challenge.songs[0].title != "Bohemian Rhapsody" {
			t.Fatalf("boss challenge missing Bohemian Rhapsody: %+v", last[0].challenge)
		}
		// verify connectivity: every node except first row should have incoming edge
		incoming := make([][]int, len(a.rows))
		for r := 1; r < len(a.rows); r++ {
			incoming[r] = make([]int, len(a.rows[r]))
		}
		for r := 0; r < len(a.rows)-1; r++ {
			for _, n := range a.rows[r] {
				for _, e := range n.edges {
					incoming[r+1][e]++
				}
			}
		}
		for r := 1; r < len(incoming); r++ {
			for c, v := range incoming[r] {
				if v == 0 {
					t.Fatalf("row %d col %d has no incoming edge", r, c)
				}
			}
		}
	}
}

func TestCtrlCAlwaysQuits(t *testing.T) {
	m := newModel([]song{
		{title: "Song", artist: "A", difficulty: 1},
	})
	m.selectingSongs = true
	_, cmd := m.Update(tea.KeyMsg{Type: tea.KeyCtrlC})
	if cmd == nil {
		t.Fatalf("expected quit command")
	}
	msg := cmd()
	if _, ok := msg.(tea.QuitMsg); !ok {
		t.Fatalf("expected QuitMsg, got %T", msg)
	}
}
