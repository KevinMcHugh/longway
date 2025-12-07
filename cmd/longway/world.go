package main

import "math/rand"

func generateRun(seed int64, songs []song) []act {
	rng := rand.New(rand.NewSource(seed))
	acts := make([]act, totalActs)
	for i := 0; i < totalActs; i++ {
		acts[i] = generateAct(i+1, rng, songs)
	}
	return acts
}

func generateAct(index int, rng *rand.Rand, songs []song) act {
	actSongs := applyActDifficultyConstraints(index, songs)
	poolSize := pickPoolSize(index, len(actSongs), rng)
	rows := make([][]node, rowsPerAct)
	for row := 0; row < rowsPerAct; row++ {
		count := minNodesPerRow + rng.Intn(maxNodesPerRow-minNodesPerRow+1)
		nodes := make([]node, count)
		for i := range nodes {
			nodes[i] = node{
				col:       i,
				kind:      nodeChallenge,
				challenge: newChallenge(actSongs, rng, poolSize),
			}
		}
		if row > 0 {
			connectRows(rows[row-1], nodes, rng)
		}
		rows[row] = nodes
	}

	return act{
		index: index,
		rows:  rows,
	}
}

func connectRows(prev []node, next []node, rng *rand.Rand) {
	incoming := make([]int, len(next))

	for i := range prev {
		targets := pickTargets(len(next), rng)
		prev[i].edges = append(prev[i].edges, targets...)
		for _, t := range targets {
			incoming[t]++
		}
	}

	for j, seen := range incoming {
		if seen == 0 {
			src := rng.Intn(len(prev))
			prev[src].edges = append(prev[src].edges, j)
		}
	}
}

func pickTargets(nextCount int, rng *rand.Rand) []int {
	targetCount := 1 + rng.Intn(2) // 1 or 2 targets
	targets := make([]int, 0, targetCount)
	seen := make(map[int]struct{})
	for len(targets) < targetCount {
		t := rng.Intn(nextCount)
		if _, ok := seen[t]; ok {
			continue
		}
		seen[t] = struct{}{}
		targets = append(targets, t)
	}
	return targets
}

func applyActDifficultyConstraints(actIndex int, songs []song) []song {
	if len(songs) == 0 {
		return songs
	}

	filtered := make([]song, 0, len(songs))
	for _, s := range songs {
		d := clampDifficulty(s.difficulty)

		switch actIndex {
		case 1:
			if d <= 3 {
				filtered = append(filtered, s)
			}
		case 2:
			if d <= 5 {
				filtered = append(filtered, s)
			}
		default:
			if d >= 3 {
				filtered = append(filtered, s)
			}
		}
	}

	if len(filtered) == 0 {
		return songs
	}
	return filtered
}

func pickPoolSize(actIndex int, available int, rng *rand.Rand) int {
	minSize, maxSize := poolBoundsForAct(actIndex)
	if available < minSize {
		return available
	}
	if available < maxSize {
		maxSize = available
	}
	if minSize == maxSize {
		return minSize
	}
	return minSize + rng.Intn(maxSize-minSize+1)
}

func poolBoundsForAct(actIndex int) (int, int) {
	switch actIndex {
	case 1:
		return 9, 12
	case 2:
		return 6, 9
	default:
		return 3, 5
	}
}
