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
	acts           []act
	currentAct     int
	cursorRow      int
	cursorCol      int
	songs          []song
	allowed        []int
	allowedIdx     int
	committed      map[int]int
	runs           map[int]nodeRun
	selectingSongs bool
	selectionPool  []song
	selectionIdx   int
	selectedSongs  []song
	selectedStars  []int
	enteringStars  bool
	starEntryIdx   int
	starInput      string
	seed           int64
	width          int
	height         int
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
	acts := generateRun(seed, songs)
	return model{
		acts:       acts,
		currentAct: 0,
		cursorRow:  0,
		cursorCol:  0,
		songs:      songs,
		allowed:    initAllowed(acts[0]),
		allowedIdx: 0,
		committed:  make(map[int]int),
		runs:       make(map[int]nodeRun),
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
		if m.selectingSongs {
			switch msg.String() {
			case "up", "k":
				m.moveSongSelection(-1)
			case "down", "j":
				m.moveSongSelection(1)
			case "enter", " ":
				m.toggleSongSelection()
			case "esc":
				m.selectingSongs = false
				m.selectedSongs = nil
			}
			return m, nil
		}

		if m.enteringStars {
			switch msg.String() {
			case "backspace":
				if len(m.starInput) > 0 {
					m.starInput = m.starInput[:len(m.starInput)-1]
				}
			case "enter":
				m.submitStars()
			case "0", "1", "2", "3", "4", "5", "6":
				m.starInput = msg.String()
			}
			return m, nil
		}

		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit
		case "r":
			m.seed = time.Now().UnixNano()
			m.resetRun()
		case "left", "h":
			m.moveHorizontal(-1)
		case "right", "l":
			m.moveHorizontal(1)
		case "enter":
			m.commitSelection()
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
	navigation := "Navigation: ←/→ (h/l) move across row • enter commits and enters stars • [ ] switch act"
	legend := "Legend: C Challenge (preview hides song list until selected)"

	actView := renderAct(m.acts[m.currentAct], m.cursorRow, m.cursorCol)
	body := lipgloss.JoinVertical(lipgloss.Left, actView)

	preview := renderNodePreview(m.selectedNode(), &m)
	if m.enteringStars && len(m.selectedSongs) > 0 {
		preview += fmt.Sprintf("\nStars for song %d/%d [0-6]: %s", m.starEntryIdx+1, len(m.selectedSongs), m.starInput)
	}
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

func (m *model) nextAct() {
	if m.currentAct+1 >= len(m.acts) {
		return
	}
	m.currentAct++
	m.resetAct()
}

func (m *model) prevAct() {
	if m.currentAct == 0 {
		return
	}
	m.currentAct--
	m.resetAct()
}

func (m *model) resetAct() {
	m.cursorRow = 0
	m.cursorCol = 0
	m.allowed = initAllowed(m.acts[m.currentAct])
	m.allowedIdx = 0
	m.committed = make(map[int]int)
	m.runs = make(map[int]nodeRun)
	m.selectingSongs = false
	m.enteringStars = false
	m.selectionPool = nil
	m.selectionIdx = 0
	m.selectedSongs = nil
	m.selectedStars = nil
	m.starEntryIdx = 0
	m.starInput = ""
}

func (m *model) resetRun() {
	m.seed = time.Now().UnixNano()
	m.acts = generateRun(m.seed, m.songs)
	m.currentAct = 0
	m.resetAct()
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

func renderNodePreview(n *node, m *model) string {
	if n == nil {
		return "No node selected."
	}

	switch n.kind {
	case nodeChallenge:
		if n.challenge == nil {
			return "Challenge: unknown\nSummary: missing"
		}
		var b strings.Builder
		b.WriteString(fmt.Sprintf("Challenge: %s\n", n.challenge.name))
		b.WriteString(fmt.Sprintf("Summary: %s\n", n.challenge.summary))

		var songsToShow []song
		var stars []int
		var selecting bool
		var entering bool
		var currentStarIdx int
		var selectedIDs map[string]struct{}

		if m != nil {
			selecting = m.selectingSongs
			entering = m.enteringStars
			currentStarIdx = m.starEntryIdx
			selectedIDs = make(map[string]struct{})
			for _, s := range m.selectedSongs {
				selectedIDs[songKey(s)] = struct{}{}
			}

			if m.selectingSongs || m.enteringStars {
				songsToShow = m.selectionPool
				stars = m.selectedStars
			} else if run, ok := m.runs[m.cursorRow]; ok {
				songsToShow = run.songs
				stars = run.stars
			}
		}

		if len(songsToShow) == 0 {
			b.WriteString("\nSongs: ???")
			return b.String()
		}

		b.WriteString("\nSongs:\n")
		for i, s := range songsToShow {
			prefix := "- "
			if selecting {
				if _, ok := selectedIDs[songKey(s)]; ok {
					prefix = "[x] "
				} else {
					prefix = "[ ] "
				}
			} else if entering && i == currentStarIdx {
				prefix = "> "
			}
			line := fmt.Sprintf("%s%s — %s", prefix, s.title, s.artist)
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
			if i < len(stars) && stars[i] > 0 {
				line += fmt.Sprintf(" • stars %d", stars[i])
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
