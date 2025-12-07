package main

func initAllowed(a act) []int {
	cols := make([]int, len(a.rows[0]))
	for i := range cols {
		cols[i] = i
	}
	return cols
}

func (m *model) setAllowedForRow(row int) {
	if row == 0 {
		m.allowed = initAllowed(m.acts[m.currentAct])
		m.allowedIdx = 0
		m.cursorCol = m.allowed[0]
		return
	}

	prevCol, ok := m.committed[row-1]
	if !ok {
		m.allowed = initAllowed(m.acts[m.currentAct])
		m.allowedIdx = 0
		m.cursorCol = m.allowed[0]
		return
	}

	prevRow := m.acts[m.currentAct].rows[row-1]
	if prevCol >= len(prevRow) {
		prevCol = len(prevRow) - 1
	}
	edges := prevRow[prevCol].edges
	if len(edges) == 0 {
		m.allowed = initAllowed(m.acts[m.currentAct])
		m.allowedIdx = 0
		m.cursorCol = m.allowed[0]
		return
	}

	m.allowed = make([]int, len(edges))
	copy(m.allowed, edges)
	m.allowedIdx = 0
	m.cursorCol = m.allowed[0]
}

func (m *model) moveHorizontal(delta int) {
	if m.selectingSongs || m.enteringStars {
		m.moveSongSelection(delta)
		return
	}
	if len(m.allowed) == 0 {
		return
	}
	m.allowedIdx += delta
	if m.allowedIdx < 0 {
		m.allowedIdx = 0
	} else if m.allowedIdx >= len(m.allowed) {
		m.allowedIdx = len(m.allowed) - 1
	}
	m.cursorCol = m.allowed[m.allowedIdx]
}

func (m *model) commitSelection() {
	if m.selectingSongs || m.enteringStars {
		return
	}
	m.committed[m.cursorRow] = m.cursorCol
	n := m.selectedNode()
	if n == nil || n.challenge == nil {
		return
	}
	m.selectingSongs = true
	m.selectionPool = n.challenge.songs
	m.selectionIdx = 0
	m.selectedSongs = nil
	m.selectedStars = nil
	m.starInput = ""
	m.runs[m.cursorRow] = nodeRun{col: m.cursorCol}
}

func (m *model) submitStars() {
	if !m.enteringStars {
		return
	}
	val := clampDifficulty(parseDifficulty(m.starInput))
	m.selectedStars[m.starEntryIdx] = val
	m.starInput = ""

	m.starEntryIdx++
	if m.starEntryIdx >= len(m.selectedSongs) {
		m.enteringStars = false
		run := m.runs[m.cursorRow]
		run.songs = append([]song{}, m.selectedSongs...)
		run.stars = append([]int{}, m.selectedStars...)
		m.runs[m.cursorRow] = run

		if m.cursorRow < len(m.acts[m.currentAct].rows)-1 {
			m.cursorRow++
			m.setAllowedForRow(m.cursorRow)
			m.cursorCol = m.allowed[m.allowedIdx]
		}
		m.selectingSongs = false
		m.selectedSongs = nil
		m.selectedStars = nil
		m.selectionPool = nil
		m.starEntryIdx = 0
	} else {
		// continue entering stars for next song
	}
}

func (m *model) moveSongSelection(delta int) {
	if len(m.selectionPool) == 0 {
		return
	}
	m.selectionIdx += delta
	if m.selectionIdx < 0 {
		m.selectionIdx = 0
	} else if m.selectionIdx >= len(m.selectionPool) {
		m.selectionIdx = len(m.selectionPool) - 1
	}
}

func (m *model) toggleSongSelection() {
	if m.enteringStars || !m.selectingSongs {
		return
	}
	if m.selectionIdx < 0 || m.selectionIdx >= len(m.selectionPool) {
		return
	}
	sel := m.selectionPool[m.selectionIdx]

	// check if already selected
	for i, s := range m.selectedSongs {
		if songKey(s) == songKey(sel) {
			m.selectedSongs = append(m.selectedSongs[:i], m.selectedSongs[i+1:]...)
			return
		}
	}

	if len(m.selectedSongs) >= 3 {
		return
	}

	m.selectedSongs = append(m.selectedSongs, sel)
	if len(m.selectedSongs) == 3 {
		m.startStarEntry()
	}
}

func (m *model) startStarEntry() {
	m.selectingSongs = false
	m.enteringStars = true
	m.selectedStars = make([]int, len(m.selectedSongs))
	m.starEntryIdx = 0
	m.starInput = ""
}
