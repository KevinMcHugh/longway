package main

type node struct {
	col       int
	edges     []int // indices into the next row
	kind      nodeKind
	challenge *challenge
}

type act struct {
	index int
	rows  [][]node
}

type nodeKind int

const (
	nodeUnknown nodeKind = iota
	nodeChallenge
)

const (
	totalActs      = 3
	rowsPerAct     = 8
	minNodesPerRow = 2
	maxNodesPerRow = 5
	colSpacing     = 4
)
