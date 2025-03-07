package main

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

type LearningOutcome struct {
	ID          string
	Content     string
	SectionName string
}

func main() {
	if len(os.Args) != 3 {
		fmt.Println("Usage: program <input_file> <output_file>")
		os.Exit(1)
	}

	input := os.Args[1]
	output := os.Args[2]

	content, err := os.ReadFile(input)
	if err != nil {
		fmt.Printf("Error reading file: %v\n", err)
		os.Exit(1)
	}

	// Process the content
	processedContent := processDocument(string(content))

	// Write the processed content
	err = os.WriteFile(output, []byte(processedContent), 0644)
	if err != nil {
		fmt.Printf("Error writing file: %v\n", err)
		os.Exit(1)
	}
}

func processDocument(content string) string {
	lines := strings.Split(content, "\n")
	var processed []string
	var outcomes []LearningOutcome

	inTable := false
	inRelated := false
	tableLines := []string{}
	currentSection := ""

	for i := 0; i < len(lines); i++ {
		line := lines[i]

		// Track current section for outcomes
		if strings.HasPrefix(line, "### ") {
			currentSection = strings.TrimSpace(strings.TrimPrefix(line, "### "))
		}

		// Clean up special characters and formatting
		line = cleanFormatting(line)

		// Skip non-standard links in Related sections
		if strings.HasPrefix(line, "**Related**") || strings.HasPrefix(line, "## Related") {
			inRelated = true
			continue
		}

		if inRelated && (len(line) > 0 && (line[0] == '#' || strings.HasPrefix(line, "**"))) {
			inRelated = false
		}

		if inRelated {
			if strings.Contains(line, "[[") || strings.Contains(line, "]{.underline}") {
				continue
			}
		}

		// Handle tables
		if isASCIITableBorder(line) {
			if !inTable {
				inTable = true
				tableLines = append(tableLines, line)
			} else {
				tableLines = append(tableLines, line)
				processed = append(processed, convertToMarkdownTable(tableLines)...)
				inTable = false
				tableLines = []string{}
			}
			continue
		}

		if inTable {
			tableLines = append(tableLines, line)
			continue
		}

		// Extract learning outcomes
		if outcome := extractOutcome(line, currentSection); outcome != nil {
			outcomes = append(outcomes, *outcome)
		}

		processed = append(processed, line)
	}

	// Add learning outcomes summary section
	processed = append(processed, "\n## Learning Outcomes Summary\n")
	processed = append(processed, generateOutcomesSummary(outcomes)...)

	// Update outcome references in the document
	return addOutcomeLinks(strings.Join(processed, "\n"), outcomes)
}

func cleanFormatting(line string) string {
	// Remove LaTeX-style formatting
	line = regexp.MustCompile(`\$([^$]+)\$`).ReplaceAllString(line, "$1")

	// Clean up special characters
	line = strings.ReplaceAll(line, "'", "'")
	line = strings.ReplaceAll(line, "\"", "\"")
	line = strings.ReplaceAll(line, "--", "–")

	// Remove unnecessary formatting
	line = regexp.MustCompile(`\[\{\.underline\}\]`).ReplaceAllString(line, "")

	return line
}

func isASCIITableBorder(line string) bool {
	return strings.Count(line, "-") > 3 && strings.Count(line, "+") > 0
}

func convertToMarkdownTable(tableLines []string) []string {
	if len(tableLines) < 3 {
		return tableLines
	}

	var result []string

	// Process header
	headers := extractTableCells(tableLines[1])
	result = append(result, "|"+strings.Join(headers, "|")+"|")

	// Add markdown separator
	separator := []string{}
	for range headers {
		separator = append(separator, "---")
	}
	result = append(result, "|"+strings.Join(separator, "|")+"|")

	// Process data rows
	for i := 2; i < len(tableLines)-1; i++ {
		if !isASCIITableBorder(tableLines[i]) {
			cells := extractTableCells(tableLines[i])
			result = append(result, "|"+strings.Join(cells, "|")+"|")
		}
	}

	return result
}

func extractTableCells(line string) []string {
	// Split by pipe and clean each cell
	cells := strings.Split(line, "|")
	var cleanCells []string

	for _, cell := range cells {
		cell = strings.TrimSpace(cell)
		if cell != "" {
			cleanCells = append(cleanCells, cell)
		}
	}

	return cleanCells
}

func extractOutcome(line string, section string) *LearningOutcome {
	// Match patterns like "SC4-WS-01" or "SC5-WAM-02"
	re := regexp.MustCompile("(SC[45]-[A-Z]+-\\d{2})")

	matches := re.FindStringSubmatch(line)
	if len(matches) > 0 {
		id := matches[1]
		// Extract content after the ID
		content := strings.TrimSpace(strings.Split(line, id)[1])
		content = strings.Trim(content, "** ")

		return &LearningOutcome{
			ID:          id,
			Content:     content,
			SectionName: section,
		}
	}

	return nil
}

func generateOutcomesSummary(outcomes []LearningOutcome) []string {
	var summary []string

	// Group outcomes by section
	sectionMap := make(map[string][]LearningOutcome)
	for _, outcome := range outcomes {
		sectionMap[outcome.SectionName] = append(sectionMap[outcome.SectionName], outcome)
	}

	// Generate summary by section
	for section, sectionOutcomes := range sectionMap {
		if section != "" {
			summary = append(summary, fmt.Sprintf("\n### %s\n", section))
			for _, outcome := range sectionOutcomes {
				summary = append(summary, fmt.Sprintf("- [%s](#%s): %s\n",
					outcome.ID,
					strings.ToLower(outcome.ID),
					outcome.Content))
			}
		}
	}

	return summary
}

func addOutcomeLinks(content string, outcomes []LearningOutcome) string {
	// First, temporarily mark existing links
	re := regexp.MustCompile(`\[(SC[45]-[A-Z]+-\d{2})\]`)
	content = re.ReplaceAllString(content, "§§$1§§")

	// Replace all outcome IDs with links
	for _, outcome := range outcomes {
		pattern := regexp.QuoteMeta(outcome.ID)
		replacement := fmt.Sprintf("[%s](#%s)", outcome.ID, strings.ToLower(outcome.ID))
		re := regexp.MustCompile(pattern)
		content = re.ReplaceAllString(content, replacement)
	}

	// Restore original links
	content = strings.ReplaceAll(content, "§§", "[")
	return content
}
