package main

import "testing"

func TestGenerateRunCreatesChallengeNodes(t *testing.T) {
	seed := int64(12345)
	acts := generateRun(seed)

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
