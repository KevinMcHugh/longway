package main

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func songKey(s song) string {
	if s.id != "" {
		return s.id
	}
	return s.title + "|" + s.artist
}
