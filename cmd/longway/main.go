package main

import (
	"fmt"
	"math/rand"
	"os"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type model struct {
	acts   []act
	seed   int64
	width  int
	height int
}

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

type challenge struct {
	id      string
	name    string
	song    string
	summary string
}

const (
	totalActs      = 3
	rowsPerAct     = 8
	minNodesPerRow = 2
	maxNodesPerRow = 5
	colSpacing     = 4
)

func newModel() model {
	seed := time.Now().UnixNano()
	return model{
		acts: generateRun(seed),
		seed: seed,
	}
}

func (m model) Init() tea.Cmd {
	return tea.EnterAltScreen
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit
		case "r":
			m.seed = time.Now().UnixNano()
			m.acts = generateRun(m.seed)
		}
	}

	return m, nil
}

func (m model) View() string {
	title := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#F0D94A")).
		Bold(true).
		Underline(true).
		Render("Long Way To The Top")

	sub := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#9AE6FF")).
		Render("Three-act rhythm roguelike — routes like Slay the Spire, resolved by rhythm.")

	controls := "Controls: r rerolls the route • q quits"
	legend := "Legend: C Challenge (TestChallenge: Eye of the Tiger)"

	actViews := make([]string, 0, len(m.acts))
	for _, a := range m.acts {
		actViews = append(actViews, renderAct(a))
	}

	body := lipgloss.JoinVertical(lipgloss.Left, actViews...)

	bodyBox := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("#6C7086")).
		Padding(1, 2).
		Width(max(70, m.width-4)).
		Render(body)

	doc := lipgloss.JoinVertical(lipgloss.Left,
		title,
		sub,
		fmt.Sprintf("Seed: %d", m.seed),
		"",
		bodyBox,
		"",
		legend,
		controls,
	)

	if m.height > 0 {
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, doc)
	}

	return doc
}

func generateRun(seed int64) []act {
	rng := rand.New(rand.NewSource(seed))
	acts := make([]act, totalActs)
	for i := 0; i < totalActs; i++ {
		acts[i] = generateAct(i+1, rng)
	}
	return acts
}

func generateAct(index int, rng *rand.Rand) act {
	rows := make([][]node, rowsPerAct)
	for row := 0; row < rowsPerAct; row++ {
		count := minNodesPerRow + rng.Intn(maxNodesPerRow-minNodesPerRow+1)
		nodes := make([]node, count)
		for i := range nodes {
			nodes[i] = node{
				col:       i,
				kind:      nodeChallenge,
				challenge: newTestChallenge(),
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

func newTestChallenge() *challenge {
	return &challenge{
		id:      "test-challenge",
		name:    "TestChallenge",
		song:    "Eye of the Tiger",
		summary: "Play \"Eye of the Tiger\" to push through this encounter.",
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

func renderAct(a act) string {
	height := (len(a.rows) * 2) - 1
	maxCols := 0
	for _, row := range a.rows {
		if len(row) > maxCols {
			maxCols = len(row)
		}
	}
	width := maxCols*colSpacing + 1

	grid := make([][]rune, height)
	for i := range grid {
		grid[i] = make([]rune, width)
		for j := range grid[i] {
			grid[i][j] = ' '
		}
	}

	for rowIdx, row := range a.rows {
		y := rowIdx * 2
		for _, n := range row {
			x := n.col * colSpacing
			grid[y][x] = nodeGlyph(n)
			if rowIdx == len(a.rows)-1 {
				continue
			}
			for _, target := range n.edges {
				tx := target * colSpacing
				connY := y + 1
				connX := x
				if tx > x {
					connX = x + (tx-x)/2
					grid[connY][connX] = '\\'
				} else if tx < x {
					connX = x - (x-tx)/2
					grid[connY][connX] = '/'
				} else {
					grid[connY][connX] = '|'
				}
			}
		}
	}

	lines := make([]string, len(grid))
	for i, r := range grid {
		lines[i] = string(r)
	}

	title := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#B6EEA6")).
		Bold(true).
		Render(fmt.Sprintf("Act %d", a.index))

	panel := lipgloss.JoinVertical(lipgloss.Left, append([]string{title}, lines...)...)
	return panel
}

func nodeGlyph(n node) rune {
	switch n.kind {
	case nodeChallenge:
		return 'C'
	default:
		return 'o'
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func main() {
	m := newModel()
	if _, err := tea.NewProgram(m, tea.WithAltScreen()).Run(); err != nil {
		fmt.Println("could not start program:", err)
		os.Exit(1)
	}
}
