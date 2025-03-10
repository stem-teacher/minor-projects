# HSC Chapter Template for OpenAI Generation

This template provides a structured format for creating HSC Chemistry and Physics textbook chapters. It's designed to help you craft effective prompts for the OpenAI API, ensuring consistent, high-quality content that meets educational standards.

## Chapter Structure

Each chapter should follow this general structure:

```
\chapter{Module Title}

\section{Introduction}
[Overview of the module, real-world relevance, and connections to prior knowledge]

\section{Key Concept 1}
\subsection{Sub-concept 1.1}
[Main content with appropriate margin notes]

\begin{keyconcept}{Title}
[Core concept explanation]
\end{keyconcept}

\begin{stopandthink}
[Conceptual question to check understanding]
\end{stopandthink}

\subsection{Sub-concept 1.2}
[Further development with examples]

\begin{example}
[Worked example with step-by-step solution]
\end{example}

\begin{tieredquestions}{Basic}
[Fundamental practice questions]
\end{tieredquestions}

\FloatBarrier

\section{Key Concept 2}
[Similar structure as above]

\section{Practical Investigations}
\begin{investigation}{Title}
[Step-by-step procedure with clear safety guidelines]
\end{investigation}

\begin{tieredquestions}{Advanced}
[Higher-level application questions]
\end{tieredquestions}

\FloatBarrier

\section{Chapter Summary}
[Concise summary of key points]

\section{Review Questions}
[Comprehensive chapter review questions with tiered difficulty]
```

## Special Elements

### Margin Notes

Use these custom commands for margin content:

- `\keyword{term}` - For introducing key terms with definitions in the margin
- `\challenge{text}` - For advanced extension content
- `\mathlink{text}` - For mathematical connections
- `\historylink{text}` - For historical context or scientist profiles

### Environments

Use these custom environments throughout the chapter:

1. **Key Concept Boxes**
   ```latex
   \begin{keyconcept}{Title}
   [Essential concept explanation with clear, concise language]
   \end{keyconcept}
   ```

2. **Stop and Think Questions**
   ```latex
   \begin{stopandthink}
   [Conceptual question that encourages deeper thinking]
   \end{stopandthink}
   ```
   Note: Do NOT include a title parameter for stopandthink environments.

3. **Investigation Activities**
   ```latex
   \begin{investigation}{Investigation Title}
   [Structured practical activity with clear procedure]
   \end{investigation}
   ```

4. **Tiered Questions**
   ```latex
   \begin{tieredquestions}{Basic}
   [Level-appropriate questions]
   \end{tieredquestions}
   ```
   Use "Basic," "Intermediate," or "Advanced" as the parameter.

5. **Examples**
   ```latex
   \begin{example}
   [Worked examples with clear explanations]
   \end{example}
   ```

## Subject-Specific Elements

### Chemistry

For chemical formulas and equations, use the mhchem package:
```latex
\ce{H2O}                 % Simple formula
\ce{H+ + OH- -> H2O}     % Chemical equation
\ce{CaCO3 ->[900\,°C] CaO + CO2}  % Reaction with conditions
```

### Physics

For physics equations, use the equation environment:
```latex
\begin{equation}
F = ma
\end{equation}
```

For vector notation:
```latex
\vec{F} = m\vec{a}
```

## Float Management

To avoid LaTeX compilation issues:

1. Add `\FloatBarrier` after sections with multiple figures or margin notes
2. Limit margin figures to 3-4 per page
3. Use `[0pt]` offset for margin figures: `\begin{marginfigure}[0pt]`
4. For critical figures, use `[H]` placement: `\begin{figure}[H]`

## Differentiation Strategies

Throughout each chapter, incorporate:

1. **Visual aids** - Described in LaTeX for later addition of actual images
2. **Real-world applications** - Contextualizing abstract concepts
3. **Historical contexts** - Understanding the development of scientific ideas
4. **Extension material** - Challenging content for gifted students
5. **Scaffolded learning** - Building concepts systematically
6. **Varied question types** - Catering to different learning preferences

## Prompt Template

When requesting chapter content from OpenAI, structure your prompt like this:

```
Create Chapter X: [Module Title] for an HSC [Chemistry/Physics] textbook designed for gifted and neurodiverse students following the NSW curriculum. This is a [Preliminary (Year 11)/HSC (Year 12)] module.

Chapter details from the curriculum plan:
[Paste relevant section from plan-hsc.md]

The chapter should include:
1. A clear introduction to the topic with real-world relevance
2. Properly structured sections with headings and subheadings that follow logical development
3. Key concepts explained with clarity and depth appropriate for HSC level
4. Margin notes for definitions, extensions, and historical context
5. 'Stop and Think' questions throughout to check understanding
6. Investigation activities that develop scientific and practical skills
7. Tiered questions (basic, intermediate, advanced) at the end of each main section
8. Visual elements described in LaTeX (figures will be added later)
9. Extension material for gifted students through margin notes and advanced question sections
10. Clear and systematic explanations of [chemical/physical] principles with mathematical rigor
11. References to current research or applications where relevant

Format the content in LaTeX using the Tufte-book class with appropriate section headings, margin notes, and custom environments as described in the HSC chapter template.

Add \FloatBarrier commands after sections that contain multiple figures or margin notes.
Use the mhchem package (\ce{}) for chemical formulas or equations.
Remember to structure the content with diverse learners in mind, providing clear scaffolding while also challenging gifted students.
```

## Reviewing Generated Content

After generating each chapter, check for:

1. **Content accuracy** - Alignment with NSW HSC syllabus
2. **Completeness** - All key concepts covered with appropriate depth
3. **LaTeX issues** - Common problems that need fixing
4. **Pedagogical approach** - Effectiveness for diverse learners
5. **Difficulty level** - Appropriate challenge with necessary support

Use the fixing scripts to automatically address common LaTeX issues before compilation.
