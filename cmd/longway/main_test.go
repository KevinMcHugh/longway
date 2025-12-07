package main

import (
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestGenerateRunCreatesChallengeNodes(t *testing.T) {
	seed := int64(12345)
	songs := []song{{title: "Eye of the Tiger", artist: "Survivor"}}
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
				if n.kind != nodeChallenge {
					t.Fatalf("act %d row %d col %d kind = %v, want %v", a.index, rowIdx, colIdx, n.kind, nodeChallenge)
				}
				if n.challenge == nil {
					t.Fatalf("act %d row %d col %d missing challenge", a.index, rowIdx, colIdx)
				}
				if n.challenge.name != "TestChallenge" {
					t.Fatalf("act %d row %d col %d challenge name = %s, want TestChallenge", a.index, rowIdx, colIdx, n.challenge.name)
				}
				if n.challenge.song != "Eye of the Tiger" {
					t.Fatalf("act %d row %d col %d song = %s, want Eye of the Tiger", a.index, rowIdx, colIdx, n.challenge.song)
				}
			}
		}
	}
}

func TestMoveDownFollowsEdge(t *testing.T) {
	a := act{
		index: 1,
		rows: [][]node{
			{
				{col: 0, edges: []int{1}},
			},
			{
				{col: 0},
				{col: 1},
			},
		},
	}
	m := model{acts: []act{a}, currentAct: 0, cursorRow: 0, cursorCol: 0}

	m.moveDown()

	if m.cursorRow != 1 || m.cursorCol != 1 {
		t.Fatalf("moveDown landed at row %d col %d, want row 1 col 1", m.cursorRow, m.cursorCol)
	}
}

func TestMoveUpFindsIncomingEdge(t *testing.T) {
	a := act{
		index: 1,
		rows: [][]node{
			{
				{col: 0, edges: []int{1}},
				{col: 1},
			},
			{
				{col: 0},
				{col: 1},
			},
		},
	}
	m := model{acts: []act{a}, currentAct: 0, cursorRow: 1, cursorCol: 1}

	m.moveUp()

	if m.cursorRow != 0 || m.cursorCol != 0 {
		t.Fatalf("moveUp landed at row %d col %d, want row 0 col 0", m.cursorRow, m.cursorCol)
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
	m := model{acts: []act{a}, currentAct: 0, cursorRow: 0, cursorCol: 0}

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
			song:    "Eye of the Tiger",
			summary: "Play it.",
		},
	}

	out := renderNodePreview(n)
	if !strings.Contains(out, "TestChallenge") || !strings.Contains(out, "Eye of the Tiger") {
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
	if len(songs) == 0 {
		t.Fatalf("expected songs from CSV")
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
