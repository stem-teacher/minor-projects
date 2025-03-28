<prompt>
1. CONTEXT
I am a Science teacher also undertaking a Masters of Teaching who regularly processes large sets of PDF documents. I have a directory of PDF files stored on disk and wish to annotate these files with a specific task: stamping each page of every PDF file with its filename, placed in the top-right corner of each page in 12-point Calibri font. I plan to expand upon this functionality later by adding optical character recognition (OCR) and automated exam marking features, but for now I need a working Rust program to perform the file labelling task.

Through a command line approach, I plan to incorporate JSON configuration files, iterate through all PDF files in a specified directory, and perform certain operations, including naming stamps. My immediate desire is a Rust program that:
• Finds all PDF files in a given directory (and possibly its subdirectories),
• Identifies each file’s name,
• Opens each PDF file,
• Writes/stamps the filename in the top-right corner on every page using Calibri size-12 font,
• Saves each stamped PDF to an output directory with adequate error handling.

A typical directory structure for this project is:
/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/test-examples/label-exam-pages-with-filename
- orig (contains input PDFs)
- update-example (contains updated/stamped PDFs)

I require a highly detailed Rust code sample that meets these requirements, including references to any necessary crates, troubleshooting instructions, and a sample JSON configuration snippet for controlling aspects such as:
• Directory paths for input and output,
• Font style and size,
• Any other relevant parameters that may prove useful later.

2. ROLE
You are an industry-leading Rust software engineer with over two decades of experience in PDF processing, OCR, systems programming, and command line tool chaining. You have authored multiple open-source Rust libraries and are internationally recognised for your expertise in PDF manipulation. You design solutions that anticipate edge cases, produce robust error handling, and comply with best coding practices in Rust. Feel free to reference library documentation and provide suggestions for best practice approaches for novices and advanced Rust developers alike.

3. ACTION
Below is a numbered list of sequential steps that you, as the LLM, must follow to generate the solution:

1) Provide an overview of the recommended Rust libraries (e.g., “printpdf”, “lopdf”, “pdfium-rs”, or others) with justification for your choices, including pros and cons.
2) Offer instructions on how to configure the development environment, listing any dependencies that need to be installed beforehand.
3) Present a comprehensive Rust code snippet that:
   a) Reads a JSON configuration file (with an example of this file).
   b) Iterates through all PDF files in a specified directory (and optionally subdirectories).
   c) For each PDF, retrieves its filename and stamps the filename in 12-point Calibri font at the top-right corner of each page.
   d) Handles possible errors gracefully (missing files, fonts, etc.).
   e) Outputs the modified PDFs to a specified output folder.
4) Provide a commented explanation of how each part of the code works, highlighting advanced Rust features and best practice patterns.
5) Include problem-solving suggestions for potential errors (e.g., missing font file) and recommended solutions or fallback strategies.
6) Summarise testing strategies to ensure correct stamping of filenames on multi-page PDF documents.

4. FORMAT
When you generate the response, please use a structured approach in your answer. Offer sections for each of the steps above, clearly labelled. Provide code snippets in Rust using fenced code blocks (```rust ... ```). Where relevant, consider including a short JSON example in fenced code blocks (```json ... ```). The final content should be readable in plain text and hence well-suited for direct insertion into a Rust code base or terminal environment.

5. TARGET AUDIENCE

• End Consumers: Advanced AI models (ChatGPT 4.5, ChatGPT o1, Anthropic Claude 3.7, etc.).
• Human Readers: Educators or software developers (with either novice or moderate Rust experience) who require a robust command line tool to label PDF pages with filename text.
• Language Requirement: Please produce the answer in formal academic British English, ensuring clarity and correctness in grammar and usage.

</prompt>
