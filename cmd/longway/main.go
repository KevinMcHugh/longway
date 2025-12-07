package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"math/rand"
	"os"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"strconv"
)

type model struct {
	acts       []act
	currentAct int
	cursorRow  int
	cursorCol  int
	songs      []song
	seed       int64
	width      int
	height     int
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

type challengeType int

const (
	challengeTest challengeType = iota
	challengeDecade
	challengeLongSong
)

type challenge struct {
	id      string
	name    string
	summary string
	songs   []song
}

type song struct {
	id         string
	title      string
	artist     string
	album      string
	difficulty string
	length     string
	year       int
	seconds    int
}

var (
	nodeStyle         = lipgloss.NewStyle().Foreground(lipgloss.Color("#B6EEA6")).Bold(true)
	selectedNodeStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#1E1E2E")).
				Background(lipgloss.Color("#F0D94A")).
				Bold(true)
)

const (
	totalActs      = 3
	rowsPerAct     = 8
	minNodesPerRow = 2
	maxNodesPerRow = 5
	colSpacing     = 4
	songsFile      = "songs.csv"
)

func newModel(songs []song) model {
	seed := time.Now().UnixNano()
	return model{
		acts:       generateRun(seed, songs),
		currentAct: 0,
		cursorRow:  0,
		cursorCol:  0,
		songs:      songs,
		seed:       seed,
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
			m.acts = generateRun(m.seed, m.songs)
			m.currentAct = 0
			m.cursorRow = 0
			m.cursorCol = 0
		case "left", "h":
			m.moveHorizontal(-1)
		case "right", "l":
			m.moveHorizontal(1)
		case "down", "j", "enter":
			m.moveDown()
		case "up", "k":
			m.moveUp()
		case "]":
			m.nextAct()
		case "[":
			m.prevAct()
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
	navigation := "Navigation: ←/→ (h/l) move across row • ↓/↵ (j/enter) follow edge • ↑ (k) backtrack • [ ] switch act"
	legend := "Legend: C Challenge (TestChallenge: Eye of the Tiger)"

	actView := renderAct(m.acts[m.currentAct], m.cursorRow, m.cursorCol)
	body := lipgloss.JoinVertical(lipgloss.Left, actView)

	preview := renderNodePreview(m.selectedNode())
	previewBox := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("#6C7086")).
		Padding(1, 2).
		Width(max(70, m.width-4)).
		Render(preview)

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
		fmt.Sprintf("Act %d/%d", m.currentAct+1, len(m.acts)),
		"",
		bodyBox,
		"",
		previewBox,
		"",
		navigation,
		legend,
		controls,
	)

	if m.height > 0 {
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, doc)
	}

	return doc
}

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

func newTestChallenge(songs []song) *challenge {
	s := fallbackSong()
	if found, ok := findSongByTitle(songs, "Eye of the Tiger"); ok {
		s = found
	}

	summary := "Play \"Eye of the Tiger\" to push through this encounter."
	if s.artist != "" && s.title != "" {
		summary = fmt.Sprintf("Play \"%s\" by %s to push through this encounter.", s.title, s.artist)
	}

	return &challenge{
		id:      "test-challenge",
		name:    "TestChallenge",
		summary: summary,
		songs:   []song{s},
	}
}

func fallbackSong() song {
	return song{
		id:      "song-001",
		title:   "Eye of the Tiger",
		artist:  "Survivor",
		year:    1982,
		length:  "4:05",
		seconds: 245,
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
		if len(rec) < 3 {
			return nil, fmt.Errorf("invalid song record (need at least id,title,artist): %v", rec)
		}

		songs = append(songs, song{
			id:         strings.TrimSpace(rec[0]),
			title:      strings.TrimSpace(rec[1]),
			artist:     strings.TrimSpace(rec[2]),
			album:      field(rec, 3),
			difficulty: field(rec, 4),
			length:     field(rec, 5),
			year:       parseYear(field(rec, 6)),
			seconds:    parseDurationToSeconds(field(rec, 5)),
		})
	}

	if len(songs) == 0 {
		return nil, fmt.Errorf("no songs loaded from %s", path)
	}

	return songs, nil
}

func isHeader(rec []string) bool {
	if len(rec) < 3 {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(rec[0]), "id") &&
		strings.EqualFold(strings.TrimSpace(rec[1]), "title") &&
		strings.EqualFold(strings.TrimSpace(rec[2]), "artist")
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

func newChallenge(songs []song, rng *rand.Rand) *challenge {
	creators := []func([]song, *rand.Rand) (*challenge, bool){
		newDecadeChallenge,
		newLongSongChallenge,
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
	selected := sampleSongs(pool, 3, rng)

	summary := fmt.Sprintf("Play three tracks from the %ds.", decade)

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

	selected := sampleSongs(longSongs, 3, rng)

	return &challenge{
		id:      "long-song",
		name:    "LongSongChallenge",
		summary: "Play three long tracks (over 5 minutes) back-to-back.",
		songs:   selected,
	}, true
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

func (m model) selectedNode() *node {
	if m.currentAct < 0 || m.currentAct >= len(m.acts) {
		return nil
	}
	act := m.acts[m.currentAct]
	if m.cursorRow < 0 || m.cursorRow >= len(act.rows) {
		return nil
	}
	row := act.rows[m.cursorRow]
	if m.cursorCol < 0 || m.cursorCol >= len(row) {
		return nil
	}
	return &row[m.cursorCol]
}

func (m *model) moveHorizontal(delta int) {
	act := m.acts[m.currentAct]
	if len(act.rows) == 0 {
		return
	}
	row := act.rows[m.cursorRow]
	newCol := m.cursorCol + delta
	if newCol < 0 {
		newCol = 0
	} else if newCol >= len(row) {
		newCol = len(row) - 1
	}
	m.cursorCol = newCol
}

func (m *model) moveDown() {
	act := m.acts[m.currentAct]
	if m.cursorRow >= len(act.rows)-1 {
		return
	}
	n := act.rows[m.cursorRow][m.cursorCol]
	if len(n.edges) == 0 {
		return
	}
	targetCol := n.edges[0]
	nextRow := act.rows[m.cursorRow+1]
	if targetCol >= len(nextRow) {
		targetCol = len(nextRow) - 1
	}
	m.cursorRow++
	m.cursorCol = targetCol
}

func (m *model) moveUp() {
	act := m.acts[m.currentAct]
	if m.cursorRow == 0 {
		return
	}
	targetCol := m.cursorCol
	prevRow := act.rows[m.cursorRow-1]
	for col, n := range prevRow {
		for _, e := range n.edges {
			if e == targetCol {
				m.cursorRow--
				m.cursorCol = col
				return
			}
		}
	}
}

func (m *model) nextAct() {
	if m.currentAct+1 >= len(m.acts) {
		return
	}
	m.currentAct++
	m.cursorRow = 0
	m.cursorCol = 0
}

func (m *model) prevAct() {
	if m.currentAct == 0 {
		return
	}
	m.currentAct--
	m.cursorRow = 0
	m.cursorCol = 0
}

func renderAct(a act, selectedRow, selectedCol int) string {
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
		var b strings.Builder
		for j, ch := range r {
			if selectedRow >= 0 && selectedCol >= 0 &&
				i == selectedRow*2 && j == selectedCol*colSpacing && ch != ' ' {
				b.WriteString(selectedNodeStyle.Render(string(ch)))
			} else {
				if ch == 'C' {
					b.WriteString(nodeStyle.Render(string(ch)))
				} else {
					b.WriteRune(ch)
				}
			}
		}
		lines[i] = b.String()
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

func renderNodePreview(n *node) string {
	if n == nil {
		return "No node selected."
	}

	switch n.kind {
	case nodeChallenge:
		if n.challenge == nil {
			return "Challenge: unknown\nSong: unknown\nSummary: missing"
		}
		var b strings.Builder
		b.WriteString(fmt.Sprintf("Challenge: %s\n", n.challenge.name))
		b.WriteString(fmt.Sprintf("Summary: %s\n", n.challenge.summary))
		b.WriteString("Songs:\n")
		for _, s := range n.challenge.songs {
			line := fmt.Sprintf("- %s — %s", s.title, s.artist)
			if s.year != 0 {
				line += fmt.Sprintf(" (%d)", s.year)
			}
			if s.length != "" {
				line += fmt.Sprintf(" [%s]", s.length)
			}
			if s.difficulty != "" {
				line += fmt.Sprintf(" • %s", s.difficulty)
			}
			b.WriteString(line + "\n")
		}
		return strings.TrimRight(b.String(), "\n")
	default:
		return "Unknown node."
	}
}

func main() {
	songs, err := loadSongs(songsFile)
	if err != nil {
		fmt.Println("could not load songs:", err)
		os.Exit(1)
	}

	m := newModel(songs)
	if _, err := tea.NewProgram(m, tea.WithAltScreen()).Run(); err != nil {
		fmt.Println("could not start program:", err)
		os.Exit(1)
	}
}
