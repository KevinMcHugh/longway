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
	rows := make([][]node, rowsPerAct)
	for row := 0; row < rowsPerAct; row++ {
		count := minNodesPerRow + rng.Intn(maxNodesPerRow-minNodesPerRow+1)
		nodes := make([]node, count)
		for i := range nodes {
			nodes[i] = node{
				col:       i,
				kind:      nodeChallenge,
				challenge: newChallenge(songs, rng),
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
