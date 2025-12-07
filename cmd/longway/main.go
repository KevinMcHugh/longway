package main

import (
	"fmt"
	"os"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
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

var (
	nodeStyle         = lipgloss.NewStyle().Foreground(lipgloss.Color("#B6EEA6")).Bold(true)
	selectedNodeStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#1E1E2E")).
				Background(lipgloss.Color("#F0D94A")).
				Bold(true)
)

const songsFile = "songs.csv"

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
	legend := "Legend: C Challenge (see preview for details)"

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
			if s.difficulty > 0 {
				line += fmt.Sprintf(" • diff %d/6", s.difficulty)
			}
			if s.genre != "" {
				line += fmt.Sprintf(" • %s", s.genre)
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
