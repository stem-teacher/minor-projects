package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Global variables
var chunkSizeBytes int

// AnthropicRequest represents the request structure for the Anthropic API
type AnthropicRequest struct {
	Model     string    `json:"model"`
	Messages  []Message `json:"messages"`
	MaxTokens int       `json:"max_tokens"`
}

// Message represents a message in the conversation with Claude
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AnthropicResponse represents the response from the Anthropic API
type AnthropicResponse struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"`
	Role         string    `json:"role"`
	Content      []Content `json:"content"`
	Model        string    `json:"model"`
	StopReason   string    `json:"stop_reason,omitempty"`
	StopSequence string    `json:"stop_sequence,omitempty"`
}

// Content represents the content in the response from Claude
type Content struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

func main() {
	// Define command-line flags
	inputPath := flag.String("input", "", "Path to the TypeScript file or directory")
	outputPath := flag.String("output", "", "Path to the output Go file or directory")
	apiKey := flag.String("api-key", "", "Anthropic API key")
	model := flag.String("model", "claude-3-7-sonnet-20250219", "Anthropic model to use")
	recursive := flag.Bool("recursive", false, "Recursively process directories")
	verbose := flag.Bool("verbose", false, "Enable verbose output")
	debug := flag.Bool("debug", false, "Print detailed debug information")
	chunkSize := flag.Int("chunk-size", 15, "Maximum chunk size in KB (default: 15)")
	resume := flag.Bool("resume", false, "Resume a previously interrupted conversion")
	timeout := flag.Int("timeout", 180, "API request timeout in seconds (default: 180)")
	flag.Parse()
	
	// Print banner
	fmt.Println("╔══════════════════════════════════════════╗")
	fmt.Println("║          TypeScript to Go Converter      ║")
	fmt.Println("╚══════════════════════════════════════════╝")

	// Set global chunk size
	chunkSizeBytes = *chunkSize * 1024
	
	// Validate input
	if *inputPath == "" {
		fmt.Println("Error: Input path is required")
		fmt.Println("Usage: ts2go -input <typescript-file-or-dir> -output <go-file-or-dir> -api-key <anthropic-api-key>")
		os.Exit(1)
	}

	if *apiKey == "" {
		// Try to get API key from environment variable
		*apiKey = os.Getenv("ANTHROPIC_API_KEY")
		if *apiKey == "" {
			fmt.Println("Error: Anthropic API key is required")
			fmt.Println("Set it with -api-key flag or ANTHROPIC_API_KEY environment variable")
			os.Exit(1)
		}
	}

	// Check if input is a file or directory
	fileInfo, err := os.Stat(*inputPath)
	if err != nil {
		fmt.Printf("Error accessing input path: %v\n", err)
		os.Exit(1)
	}

	if fileInfo.IsDir() {
		// Process directory
		if *outputPath == "" {
			// Use the input directory name as output directory if not specified
			*outputPath = *inputPath + "_go"
			fmt.Printf("Output directory not specified, using: %s\n", *outputPath)
		}

		// Create output directory if it doesn't exist
		err = os.MkdirAll(*outputPath, 0755)
		if err != nil {
			fmt.Printf("Error creating output directory: %v\n", err)
			os.Exit(1)
		}

		// Process directory
		err = processDirectory(*inputPath, *outputPath, *apiKey, *model, *recursive, *verbose, *debug, *resume, *timeout)
		if err != nil {
			fmt.Printf("Error processing directory: %v\n", err)
			os.Exit(1)
		}
	} else {
		// Process single file
		if *outputPath == "" {
			// Use the input filename with .go extension if output file is not specified
			*outputPath = strings.TrimSuffix(filepath.Base(*inputPath), filepath.Ext(*inputPath)) + ".go"
			fmt.Printf("Output file not specified, using: %s\n", *outputPath)
		}

		// Create output directory if it doesn't exist
		err = os.MkdirAll(filepath.Dir(*outputPath), 0755)
		if err != nil {
			fmt.Printf("Error creating output directory: %v\n", err)
			os.Exit(1)
		}

		// Process single file
		err = processFile(*inputPath, *outputPath, *apiKey, *model, *verbose, *debug, *resume, *timeout)
		if err != nil {
			fmt.Printf("Error processing file: %v\n", err)
			os.Exit(1)
		}
	}

	fmt.Println("Conversion completed successfully")
}

func processDirectory(inputDir, outputDir, apiKey, model string, recursive, verbose, debug, resume bool, timeout int) error {
	// Walk through the directory
	return filepath.Walk(inputDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories unless recursive is true
		if info.IsDir() {
			if path != inputDir && !recursive {
				return filepath.SkipDir
			}
			return nil
		}

		// Only process TypeScript files
		if !strings.HasSuffix(path, ".ts") && !strings.HasSuffix(path, ".tsx") {
			return nil
		}

		// Calculate relative path from input directory
		relPath, err := filepath.Rel(inputDir, path)
		if err != nil {
			return fmt.Errorf("error calculating relative path: %v", err)
		}

		// Determine output file path
		outputFile := filepath.Join(outputDir, strings.TrimSuffix(relPath, filepath.Ext(relPath))+".go")

		// Create output directory if it doesn't exist
		err = os.MkdirAll(filepath.Dir(outputFile), 0755)
		if err != nil {
			return fmt.Errorf("error creating output directory: %v", err)
		}

		// Process the file
		return processFile(path, outputFile, apiKey, model, verbose, debug, resume, timeout)
	})
}

func processFile(inputFile, outputFile, apiKey, model string, verbose, debug, resume bool, timeout int) error {
	if verbose {
		fmt.Printf("Processing %s -> %s\n", inputFile, outputFile)
	}

	// Read the TypeScript file
	tsCode, err := os.ReadFile(inputFile)
	if err != nil {
		return fmt.Errorf("error reading input file: %v", err)
	}

	// Check file size and warn if it's large
	fileSizeKB := len(tsCode) / 1024
	if fileSizeKB > chunkSizeBytes/1024 && verbose {
		fmt.Printf("Warning: Large file detected (%d KB). Processing in chunks.\n", fileSizeKB)
	}

	// For large files, we'll try to process in chunks
	if len(tsCode) > chunkSizeBytes {
		if verbose {
			fmt.Println("File is large, processing in chunks...")
		}
		return processLargeFile(string(tsCode), outputFile, apiKey, model, verbose, debug, resume, timeout)
	}

	// Convert TypeScript to Go using Anthropic API for small files
	startTime := time.Now()
	goCode, err := convertToGo(string(tsCode), apiKey, model, debug, timeout)
	if err != nil {
		return fmt.Errorf("error converting TypeScript to Go: %v", err)
	}

	if verbose {
		fmt.Printf("Conversion took %v\n", time.Since(startTime))
	}

	// Write the Go code to the output file
	err = os.WriteFile(outputFile, []byte(goCode), 0644)
	if err != nil {
		return fmt.Errorf("error writing output file: %v", err)
	}

	if verbose {
		fmt.Printf("Successfully converted %s to %s\n", inputFile, outputFile)
	}

	return nil
}

func convertToGo(tsCode string, apiKey string, model string, debug bool, timeout int) (string, error) {
	// Variables for retry logic
	verbose := debug // Use debug setting for verbose retry output
	
	// Handle very large chunks by splitting them further if needed
	if len(tsCode) > 30*1024 {
		fmt.Printf("Warning: Large chunk detected (%.2f KB), splitting further...\n", 
			float64(len(tsCode))/1024)
		
		// Split at a more aggressive threshold
		subChunks := splitCodeIntoChunks(tsCode, 20*1024)
		if len(subChunks) > 1 {
			fmt.Printf("Split into %d sub-chunks for processing\n", len(subChunks))
			
			var combinedResults []string
			for i, subChunk := range subChunks {
				fmt.Printf("Processing sub-chunk %d/%d...\n", i+1, len(subChunks))
				subResult, err := convertToGo(subChunk, apiKey, model, debug, timeout)
				if err != nil {
					return "", fmt.Errorf("error converting sub-chunk %d: %v", i+1, err)
				}
				combinedResults = append(combinedResults, subResult)
			}
			
			// Combine the results
			return combineGoCode(combinedResults), nil
		}
	}
	
	// Prepare the API request
	prompt := fmt.Sprintf("I have a TypeScript program that I want to convert to Go. Please translate it while keeping the same functionality. Make sure to handle TypeScript-specific features appropriately in Go.\n\nHere's the TypeScript code:\n\n```typescript\n%s\n```\n\nPlease provide ONLY the Go equivalent code without any explanations or markdown formatting. The response should be valid Go code that can be compiled directly.", tsCode)

	request := AnthropicRequest{
		Model: model,
		Messages: []Message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		MaxTokens: 4000,
	}

	requestBody, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("error marshaling request: %v", err)
	}

	// Make the API request with retry
	var resp *http.Response
	var body []byte
	
	maxRetries := 3
	retryDelay := 2 * time.Second
	
	for i := 0; i <= maxRetries; i++ {
		if i > 0 && verbose {
			fmt.Printf("Retry attempt %d after error...\n", i)
		}
		
		// Create a new request for each attempt
		req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(requestBody))
		if err != nil {
			return "", fmt.Errorf("error creating request: %v", err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-api-key", apiKey)
		req.Header.Set("anthropic-version", "2023-06-01")
		
		if debug {
			fmt.Println("DEBUG: API Request:")
			fmt.Printf("  URL: %s\n", req.URL.String())
			fmt.Printf("  Headers: %v\n", req.Header)
			fmt.Printf("  Model: %s\n", model)
			requestSize := len(prompt)
			fmt.Printf("  Request Size: %d bytes (%.2f KB)\n", requestSize, float64(requestSize)/1024)
			if requestSize > 100000 {
				fmt.Printf("  WARNING: Large request size (%.2f MB) may exceed API limits\n", float64(requestSize)/1024/1024)
			}
		}

		// Create HTTP client with configurable timeout
		client := &http.Client{
			Timeout: time.Duration(timeout) * time.Second,
		}
		
		// Make the request with detailed error handling
		resp, err = client.Do(req)
		if err != nil {
			if i == maxRetries {
				return "", fmt.Errorf("error making request to Anthropic API after %d retries: %v", maxRetries, err)
			}
			
			// Check if it's a timeout error
			if strings.Contains(err.Error(), "timeout") || strings.Contains(err.Error(), "deadline exceeded") {
				fmt.Printf("Request timed out (attempt %d/%d). This might be due to a large chunk size or network issues.\n", 
					i+1, maxRetries+1)
				
				// For timeouts, use a longer retry delay
				retryDelay = time.Duration(10*(i+1)) * time.Second
			} else {
				retryDelay *= 2 // Exponential backoff for other errors
			}
			
			fmt.Printf("Request attempt %d failed: %v. Retrying in %v...\n", i+1, err, retryDelay)
			time.Sleep(retryDelay)
			continue
		}
		
		// Read the response
		body, err = io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			if i == maxRetries {
				return "", fmt.Errorf("error reading response body after %d retries: %v", maxRetries, err)
			}
			fmt.Printf("Reading response attempt %d failed: %v. Retrying in %v...\n", i+1, err, retryDelay)
			time.Sleep(retryDelay)
			retryDelay *= 2
			continue
		}
		
		// If we got a successful response, break out of the retry loop
		if resp.StatusCode == http.StatusOK {
			break
		}
		
		// If we're at the last retry, return the error
		if i == maxRetries {
			// Print response details if debug mode is enabled
			if debug {
				fmt.Println("\nDEBUG: API Response:")
				fmt.Printf("  Status Code: %d\n", resp.StatusCode)
				fmt.Printf("  Headers: %v\n", resp.Header)
				fmt.Printf("  Body: %s\n", string(body))
			}
			
			// Try to parse error response for more details
			var errorResponse struct {
				Error struct {
					Type    string `json:"type"`
					Message string `json:"message"`
				} `json:"error"`
			}
			
			if err := json.Unmarshal(body, &errorResponse); err == nil && errorResponse.Error.Message != "" {
				return "", fmt.Errorf("API error (%d): %s - %s", 
					resp.StatusCode, errorResponse.Error.Type, errorResponse.Error.Message)
			}
			
			// If we can't parse the error response, return the raw body
			if debug {
				return "", fmt.Errorf("API request failed with status %d after %d retries. Full response details above.", resp.StatusCode, maxRetries)
			} else {
				return "", fmt.Errorf("API request failed with status %d after %d retries. Run with --debug for more details.", resp.StatusCode, maxRetries)
			}
		}
		
		// Wait before retrying
		time.Sleep(retryDelay)
		retryDelay *= 2 // Exponential backoff
	}

	// Parse the response
	var response AnthropicResponse
	err = json.Unmarshal(body, &response)
	if err != nil {
		return "", fmt.Errorf("error unmarshaling response: %v", err)
	}

	// Extract the Go code from the response
	goCode := ""
	for _, content := range response.Content {
		if content.Type == "text" {
			goCode += content.Text
		}
	}

	// Extract just the code part (remove any markdown or explanations)
	goCode = extractGoCode(goCode)

	return goCode, nil
}

func extractGoCode(text string) string {
	// Try to extract code between ```go and ``` markers
	parts := strings.Split(text, "```go")
	if len(parts) > 1 {
		codePart := strings.Split(parts[1], "```")[0]
		return strings.TrimSpace(codePart)
	}

	// If that fails, try to extract code between ```golang and ``` markers
	parts = strings.Split(text, "```golang")
	if len(parts) > 1 {
		codePart := strings.Split(parts[1], "```")[0]
		return strings.TrimSpace(codePart)
	}

	// If no markdown code blocks are found, return the entire text
	return strings.TrimSpace(text)
}

func processLargeFile(tsCode string, outputFile string, apiKey string, model string, verbose bool, debug bool, resume bool, timeout int) error {
	// Split the code into smaller chunks based on function/class boundaries
	chunks := splitCodeIntoChunks(tsCode, chunkSizeBytes)
	
	fmt.Printf("Split file into %d chunks for processing\n", len(chunks))
	fmt.Println("Progress: [                                        ] 0%")
	
	// Create a temporary directory for saving intermediate results
	tempDir, err := os.MkdirTemp("", "ts2go-chunks")
	if err != nil {
		return fmt.Errorf("error creating temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)
	
	// Process each chunk
	var goChunks []string
	var lastCompletedChunk int = -1
	
	// Check if resuming from previous run
	if resume {
		// Check if any results were previously saved
		for i := 0; i < len(chunks); i++ {
			chunkFile := filepath.Join(tempDir, fmt.Sprintf("chunk_%d.go", i))
			if _, err := os.Stat(chunkFile); err == nil {
				// Previously saved chunk found
				chunkCode, err := os.ReadFile(chunkFile)
				if err == nil {
					goChunks = append(goChunks, string(chunkCode))
					lastCompletedChunk = i
					fmt.Printf("Loaded previously completed chunk %d/%d\n", i+1, len(chunks))
				}
			}
		}
		
		if lastCompletedChunk >= 0 {
			fmt.Printf("Resuming from chunk %d/%d\n", lastCompletedChunk+2, len(chunks))
		}
	} else {
		lastCompletedChunk = -1
	}
	
	// Variables for progress bar
	var progressBar string
	var percentComplete float64
	
	// Continue from the last completed chunk
	for i := lastCompletedChunk + 1; i < len(chunks); i++ {
		chunk := chunks[i]
		
		// Print progress bar
		percentComplete = float64(i) / float64(len(chunks)) * 100
		progressBar = fmt.Sprintf("Progress: [")
		barWidth := 40
		for j := 0; j < barWidth; j++ {
			if float64(j) < float64(barWidth)*float64(i)/float64(len(chunks)) {
				progressBar += "="
			} else if float64(j) == float64(barWidth)*float64(i)/float64(len(chunks)) {
				progressBar += ">"
			} else {
				progressBar += " "
			}
		}
		progressBar += fmt.Sprintf("] %.1f%%", percentComplete)
		fmt.Printf("\r%s", progressBar)
		
		// Show detailed chunk info
		fmt.Printf("\nProcessing chunk %d/%d (%.1f KB)...\n", 
			i+1, len(chunks), float64(len(chunk))/1024)
		
		// Convert chunk to Go
		startTime := time.Now()
		goCode, err := convertToGo(chunk, apiKey, model, debug, timeout)
		if err != nil {
			// Save progress info
			progressFile := filepath.Join(tempDir, "progress.txt")
			progressInfo := fmt.Sprintf("lastChunk=%d\ntotal=%d\n", i-1, len(chunks))
			os.WriteFile(progressFile, []byte(progressInfo), 0644)
			
			return fmt.Errorf("error converting chunk %d/%d: %v", i+1, len(chunks), err)
		}
		
		// Save the result
		chunkFile := filepath.Join(tempDir, fmt.Sprintf("chunk_%d.go", i))
		err = os.WriteFile(chunkFile, []byte(goCode), 0644)
		if err != nil {
			fmt.Printf("Warning: Failed to save intermediate result for chunk %d: %v\n", i+1, err)
		}
		
		goChunks = append(goChunks, goCode)
		
		// Report conversion time
		fmt.Printf("Chunk %d/%d completed in %.1f seconds\n", 
			i+1, len(chunks), time.Since(startTime).Seconds())
		
		// Sleep between chunks to avoid rate limiting
		if i < len(chunks)-1 {
			fmt.Println("Waiting before processing next chunk...")
			time.Sleep(2 * time.Second)
		}
	}
	
	// Final progress update
	fmt.Printf("\rProgress: [========================================] 100%%\n")
	
	// Combine the converted chunks
	combinedGoCode := combineGoCode(goChunks)
	
	// Write the result to the output file
	err = os.WriteFile(outputFile, []byte(combinedGoCode), 0644)
	if err != nil {
		return fmt.Errorf("error writing output file: %v", err)
	}
	
	if verbose {
		fmt.Printf("Successfully converted and combined %d chunks to %s\n", len(chunks), outputFile)
	}
	
	return nil
}

// Split TypeScript code into manageable chunks
func splitCodeIntoChunks(code string, customMaxSize ...int) []string {
	// Maximum chunk size in characters (default around 15KB)
	maxChunkSize := 15 * 1024
	
	// If a custom max size is provided, use it
	if len(customMaxSize) > 0 && customMaxSize[0] > 0 {
		maxChunkSize = customMaxSize[0]
	}
	
	// If code is small enough, return it as a single chunk
	if len(code) <= maxChunkSize {
		return []string{code}
	}
	
	// Split on logical boundaries: classes, functions, or imports
	lines := strings.Split(code, "\n")
	
	var chunks []string
	var currentChunk strings.Builder
	var currentSize int
	
	for _, line := range lines {
		lineSize := len(line) + 1 // +1 for newline
		
		// If adding this line would exceed the max size, 
		// and we already have some content, start a new chunk
		if currentSize+lineSize > maxChunkSize && currentSize > 0 {
			// Complete the current chunk if it's not empty
			if currentSize > 0 {
				chunks = append(chunks, currentChunk.String())
				currentChunk.Reset()
				currentSize = 0
			}
		}
		
		// Add the line to the current chunk
		currentChunk.WriteString(line)
		currentChunk.WriteString("\n")
		currentSize += lineSize
	}
	
	// Add the last chunk if it's not empty
	if currentSize > 0 {
		chunks = append(chunks, currentChunk.String())
	}
	
	return chunks
}

// Combine Go code chunks into a single file
func combineGoCode(chunks []string) string {
	if len(chunks) == 1 {
		return chunks[0]
	}
	
	// Process the chunks to remove duplicate package declarations, imports etc.
	var packageStmt string
	var imports []string
	var hasFoundPackage bool
	var hasFoundImports bool
	var firstChunkImports string
	var codeBlocks []string
	
	for i, chunk := range chunks {
		lines := strings.Split(chunk, "\n")
		var nonPackageImportLines []string
		
		// Extract package and imports from each chunk
		inImportBlock := false
		
		for _, line := range lines {
			trimmedLine := strings.TrimSpace(line)
			
			// Identify package declaration
			if strings.HasPrefix(trimmedLine, "package ") && !hasFoundPackage {
				packageStmt = line
				hasFoundPackage = true
				continue
			} else if strings.HasPrefix(trimmedLine, "package ") {
				// Skip duplicate package declarations
				continue
			}
			
			// Identify import statements
			if strings.HasPrefix(trimmedLine, "import ") && strings.Contains(trimmedLine, "\"") {
				// Single line import
				if !hasFoundImports {
					imports = append(imports, trimmedLine)
				}
				continue
			} else if trimmedLine == "import (" {
				// Start of import block
				inImportBlock = true
				if !hasFoundImports {
					// Save start of import block for first chunk
					if i == 0 {
						firstChunkImports = "import (\n"
					}
				}
				continue
			} else if inImportBlock && trimmedLine == ")" {
				// End of import block
				inImportBlock = false
				if !hasFoundImports {
					if i == 0 {
						firstChunkImports += ")"
					}
				}
				continue
			} else if inImportBlock {
				// Import within block
				if !hasFoundImports {
					imports = append(imports, trimmedLine)
				}
				continue
			}
			
			// Keep all other code lines
			nonPackageImportLines = append(nonPackageImportLines, line)
		}
		
		if i == 0 {
			hasFoundImports = true
		}
		
		// Add the non-package/import code
		codeBlocks = append(codeBlocks, strings.Join(nonPackageImportLines, "\n"))
	}
	
	// Deduplicate imports
	uniqueImports := make(map[string]bool)
	var finalImports []string
	
	for _, imp := range imports {
		trimmedImp := strings.TrimSpace(imp)
		if !uniqueImports[trimmedImp] && trimmedImp != "" {
			uniqueImports[trimmedImp] = true
			finalImports = append(finalImports, imp)
		}
	}
	
	// Build final combined code
	var combined strings.Builder
	
	// Add package declaration
	if packageStmt != "" {
		combined.WriteString(packageStmt + "\n\n")
	}
	
	// Add imports
	if len(finalImports) > 0 {
		if firstChunkImports != "" {
			// Multi-line import block
			combined.WriteString("import (\n")
			for _, imp := range finalImports {
				combined.WriteString("\t" + strings.TrimSpace(imp) + "\n")
			}
			combined.WriteString(")\n\n")
		} else {
			// Single-line imports
			for _, imp := range finalImports {
				combined.WriteString(imp + "\n")
			}
			combined.WriteString("\n")
		}
	}
	
	// Add code blocks
	for _, block := range codeBlocks {
		combined.WriteString(block + "\n\n")
	}
	
	return combined.String()
}
