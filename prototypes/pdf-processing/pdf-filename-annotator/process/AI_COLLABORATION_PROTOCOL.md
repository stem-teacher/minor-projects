# AI Collaboration Protocol

This document outlines the protocols and best practices for collaboration between different AI models during the software development lifecycle.

## AI Collaboration Model

The structured AI collaboration model involves:

1. **Claude Desktop** (Claude 3.7 Sonnet):
   - Orchestration of the software development lifecycle
   - Task assignment and monitoring
   - Context management and documentation
   - High-level planning and decision-making
   - Integration of feedback across different AI systems

2. **Claude Code**:
   - Implementation of code-specific tasks
   - Direct file access through MCP tools
   - Execution of build and test commands
   - Detailed code analysis and debugging

3. **Support AI Services** (via ai_router):
   - **OpenAI-Reasoning**: Algorithm optimization and complex reasoning tasks
   - **Gemini**: Alternative perspective on implementation challenges
   - **Claude 3 Opus**: Detailed analysis of complex documentation or specifications

## Role-Specific Responsibilities

### Claude Desktop (Orchestrator)
- Maintain high-level project context
- Manage the structured SDLC process
- Document progress and decisions
- Monitor context window usage
- Initiate controlled context resets when needed
- Generate task documentation
- Coordinate AI collaborations

### Claude Code (Implementer)
- Execute specific coding tasks
- Interface with filesystem via MCP
- Run compilation and test commands
- Generate code-specific documentation
- Report implementation progress back to Claude Desktop

### Support AI Services (Specialists)
- Provide specific expertise when requested
- Review code and design proposals
- Offer alternative approaches to problems
- Help resolve complex implementation challenges

## Collaboration Workflow

### Task Assignment Protocol
1. Claude Desktop creates task specifications using the standard templates
2. Task is assigned to appropriate AI system based on nature of work
3. Clear handoff documentation is created for task transitions
4. Results are reported back in standardized format

### Code Review Protocol
1. Implementer submits code for review
2. Reviewer model (determined by complexity) analyzes code
3. Standardized review report is generated
4. Feedback is incorporated or documented with rationales

### Task Escalation Procedure
When issues require specialized attention:
1. Originating AI documents specific question/problem
2. Claude Desktop routes to appropriate specialist model
3. Response is integrated into task documentation
4. Credit for contribution is documented

## AI Task Assignment Template

```markdown
## AI Task Assignment

### Task Description
[Clear description of what needs to be done]

### Expected Output
[Format and content expectations]

### Context
[Relevant information for this specific task]

### Success Criteria
[How to evaluate task completion]

### Token Usage Considerations
[Any context window concerns or limitations]
```

## Cross-Model Communication Standards

To ensure consistent understanding across models:

1. **Standardized Formats**:
   - Use consistent Markdown formatting
   - Structure code with standardized comments
   - Use common terminology per lexicon document

2. **Knowledge Sharing**:
   - Document API discrepancies and inconsistencies
   - Create centralized references for project-specific patterns
   - Maintain cross-referenced documentation

3. **Feedback Loop**:
   - Document success and failure patterns
   - Analyze causes of miscommunication
   - Update protocols based on outcomes

## Model Selection Guidelines

Select the appropriate AI model based on:

1. **Task Complexity**:
   - Simple, well-defined tasks: Claude Code
   - Complex analysis: OpenAI-Reasoning or Claude 3 Opus
   - Architectural decisions: Claude Desktop + support from specialist models

2. **Context Requirements**:
   - High context needs: Models with larger context windows
   - Implementation focus: Models with direct tool access
   - Design focus: Models with stronger reasoning capabilities

3. **Task History**:
   - New approach: Use multiple models for diverse perspectives
   - Continuing established pattern: Use model with relevant history

## Communication Artifacts

All cross-model collaboration should generate:

1. **Assignment Record**: Documentation of what was requested and why
2. **Result Summary**: Concise overview of output and findings
3. **Integration Notes**: How the output was incorporated into the project
4. **Learning Record**: What worked well or challenges encountered

## Continuous Improvement

To improve collaboration over time:

1. Review collaboration patterns after project milestones
2. Document effective collaboration strategies
3. Identify recurring issues in cross-model communication
4. Update this protocol regularly based on project experience
