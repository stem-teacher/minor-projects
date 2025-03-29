# Software Requirements Specification Documents

## Overview

This document consolidates the software requirements specification documents from the agentic-software-process repository.

## _index.md

---
title: "Specification Process"
description: "Overview of Specification Process"
draft: false
images: []
weight: 1
toc: true
---
## **Specification Process Overview**

The **specification process** is a critical phase in software engineering that focuses on defining, documenting, and managing the requirements for a software system. Guided by industry standards such as **SWEBOK v3** (Software Engineering Body of Knowledge) and the **IEEE 830-1998 Requirements Standard**, this process involves gathering functional, non-functional, and security requirements to create a clear, detailed Software Requirements Specification (SRS). An effective specification process ensures that all stakeholders have a shared understanding of the system's goals, features, and constraints, laying the foundation for successful design, development, and validation. In this section, you will explore best practices and methodologies to produce comprehensive, traceable, and modifiable specifications that align with user needs and project objectives.


## rationale.md

---
title: "Specification Rationale"
description: "Overvs"
lead: "Requirements specification rationale"
draft: false
images: []
weight: 1
toc: true
---
# Problem

In large-scale software projects, tracking requirements, ensuring test coverage, and verifying implementation across the entire system can be extremely challenging. Multiple systems are often used to implement different aspects of the software development lifecycle (SDLC), but these systems are not seamlessly integrated. This lack of integration makes it difficult for project members to understand how various components fit together or to identify their current status.

As a result, teams frequently resort to manually creating traceability models using Excel spreadsheets, which is time-consuming, prone to errors, and lacks robustness.

# Solution Approach

A previously implemented solution uses a REST-based architecture where every deliverable is assigned a unique URI, and a web-based overlay spans the entire project. This allows anyone involved in the project to access and navigate relevant sections through a web browser.

Traceability is achieved using URLs across various work items, facilitating both manual and automated workflows for different deliverables. Examples include using GitHub Projects for tracking tickets and GitHub Actions for automated processes.

To implement this approach, a static website generator is recommended, utilizing Markdown for content, which is stored alongside code in a Git repository, such as GitHub. The website generator, Hugo, appears to be a viable starting point for this methodology.

Using the SWEBOK and IEEE Software Requirements Specifications (Std 830-1998) as guidelines, each discrete requirement should be represented on its unique page. Essential fields for each requirement include:

- ID
- Type
- Short Name
- Description
- Necessity
- Project References
- Test References
- System References

## Questions

1. **Overview Pages in Hugo**: What are the available options for creating overview pages in Hugo?
2. **Automated Backlinks**: When implementing or testing requirements, what options exist for automatically generating backlinks from a requirement to the corresponding implementation, test cases, or project artifacts?
3. **Taxonomy Implementation**: Should a taxonomy be implemented for different page types? If so, what structure would be most effective?
4. **Query Mechanisms**: What would be the most efficient method to enable queries across the deliverable model?

### Software Process Context

The program website is divided into categories: Process, Product, Project, Workbooks, and Production. The Workbooks subdirectory contains deliverables from various stages of the SDLC. An example directory structure is outlined below:

- process
  - process/tooling
  - process/specification
    - process/specification/rationale.md
  - process/automation
- product
- project
- workbooks
  - workbooks/design
    - workbooks/design/system
    - workbooks/design/system/design-decisions
  - workbooks/test
    - workbooks/test/system
    - workbooks/test/acceptance
  - workbooks/specification
    - workbooks/specification/non-functional
    - workbooks/specification/security
    - workbooks/specification/system
    - workbooks/specification/functional
  - workbooks/construction
  - workbooks/standards
- production



### **1. Overview Pages in Hugo**

**Options for Creating Overview Pages:**

- **Section List Pages**: Hugo automatically generates list pages for each content section (directory). By organizing your content into sections like `workbooks/specification/functional`, Hugo will create overview pages that list all the content within these sections.

- **Custom `_index.md` Files**: You can create an `_index.md` file within any section to add content or metadata to that section's list page. This allows you to include introductions, summaries, or custom layouts for your overview pages.

- **Taxonomies and Terms Pages**: Define custom taxonomies (e.g., `type`, `status`, `component`) in your `config.toml` file. Hugo will generate terms pages for each taxonomy, providing automatic overview pages that list all content tagged with a specific term.

- **Custom Templates**: Create custom list templates (`layouts/_default/list.html`) to control how overview pages are rendered. You can tailor these templates to display specific metadata fields, such as requirement IDs or summaries.

**Recommendation:**

- **Leverage Section Structures**: Utilize Hugo's inherent section-based organization by structuring your directories to reflect the hierarchy of your project.

- **Implement Taxonomies**: Define taxonomies for attributes like requirement types or project phases. This enables the generation of dynamic overview pages based on these categories.

- **Customize Templates**: Develop custom templates to display the required information prominently on overview pages, enhancing navigation and usability.


### **2. Automated Backlinks**

**Options for Automatically Creating Backlinks:**

- **Front Matter Relationships**: In your Markdown files, include references to related items using front matter parameters. For example:

  ```yaml
  ---
  title: "Implement Login Feature"
  related_requirements:
    - "REQ-001"
    - "REQ-005"
  ---
  ```

- **Shortcodes for Links**: Create Hugo shortcodes to simplify linking to other pages. This ensures consistency and makes it easier to manage links.

- **Data Files**: Maintain a central data file (YAML/JSON/TOML) that maps relationships between requirements, implementations, and tests. Use Hugo's data templates to generate backlinks.

- **Custom Output Formats**: Use Hugo's templating system to scan content files for references and automatically generate backlinks on the corresponding pages.

**Recommendation:**

- **Use Front Matter References**: Implement a consistent schema in your front matter to reference related content. Then, in your templates, iterate over these references to generate backlinks.

- **Automate with Templates**: Customize your single content templates to display backlinks based on the front matter data, ensuring that each requirement page lists all related implementations and test cases.

---

### **3. Taxonomy Implementation**

**Should a Taxonomy Be Implemented?**

Yes, implementing a taxonomy is beneficial for organizing content and facilitating navigation.

**Suggested Taxonomy Structure:**

- **Taxonomies:**

  - `type`: Classify content as `requirement`, `design-decision`, `test-case`, `implementation`, etc.
  - `component`: Identify the system component related to the content.
  - `status`: Indicate the development status such as `draft`, `in-progress`, `completed`.
  - `priority`: Set the importance level like `high`, `medium`, `low`.

- **Example in `config.toml`:**

  ```toml
  [taxonomies]
    type = "types"
    component = "components"
    status = "statuses"
    priority = "priorities"
  ```

**Recommendation:**

- **Define Clear Taxonomies**: Establish taxonomies that reflect the key attributes of your project deliverables.

- **Tag Content Appropriately**: In each content file's front matter, include the relevant taxonomy terms.

  ```yaml
  ---
  title: "User Authentication Requirement"
  type: "requirement"
  component: "authentication-module"
  status: "approved"
  priority: "high"
  ---
  ```

- **Utilize Taxonomy Pages**: Hugo will automatically generate pages for each taxonomy term, providing organized overviews.

---

### **4. Enabling Queries Across the Deliverable Model**

**Options for Querying:**

- **Hugo's Built-in Functions**: Use Hugo's powerful templating functions like `where`, `range`, and `index` to filter and display content based on front matter parameters.

- **Custom Search Pages**: Create custom pages that display content based on specific queries. For example, a page that lists all requirements not yet implemented.

- **External Search Tools**:

  - **Lunr.js**: Implement client-side search functionality using [Lunr.js](https://lunrjs.com/), allowing users to perform full-text searches.
  - **Algolia**: Use [Algolia](https://www.algolia.com/) for a more advanced hosted search solution.

- **JSON Indexes**: Generate JSON files during the build process that contain metadata about your content. These can be used by client-side scripts to perform dynamic queries.

**Recommendation:**

- **Use Hugo's Templating for Static Queries**: For predefined queries (e.g., lists of incomplete tasks), use Hugo's templates to generate these pages at build time.

- **Implement Client-Side Search for Dynamic Queries**: If you require users to perform ad-hoc searches, integrate Lunr.js to provide a responsive search experience without needing a server.

---

### **Additional Considerations**

**Content Organization:**

- **Consistent Naming Conventions**: Use consistent file and directory naming to simplify navigation and automated processing.

- **Modular Content**: Break down content into modular pieces (e.g., one requirement per file) to enhance reusability and maintainability.

**Automation:**

- **Build Scripts**: Create scripts to automate repetitive tasks, such as updating indexes or validating front matter metadata.

- **Continuous Integration**: Set up continuous integration pipelines using GitHub Actions to automate the build and deployment of your Hugo site.

**Documentation Standards:**

- **Adopt Established Standards**: Continue using standards like SWEBOK and IEEE Std 830-1998 to guide the structure and content of your documentation.

- **Metadata Schemas**: Define clear schemas for your front matter metadata to ensure consistency across all content files.

**Collaboration Tools:**

- **Git Workflows**: Utilize Git branching strategies to manage changes and collaboration among team members.

- **Issue Tracking Integration**: Link documentation with issue tracking systems (e.g., GitHub Issues) by including issue references in your content.


### **Summary**

By leveraging Hugo's features and following a structured approach:

- **Overview Pages**: Use sections, taxonomies, and custom templates to create informative overview pages.

- **Automated Backlinks**: Implement front matter relationships and use templates to generate backlinks automatically.

- **Taxonomy Implementation**: Define and apply taxonomies to organize content and facilitate navigation.

- **Query Mechanisms**: Utilize Hugo's templating functions and client-side search tools to enable efficient querying.

This approach will create a unified, transparent, and navigable software development process, enhancing collaboration and efficiency across your project.

---

# Ask
1. Content type
2. Example

Security
https://github.com/AustralianCyberSecurityCentre/ism-oscal

### Control: ism-0027; Revision: 4; Updated: Jan-21; Applicability: ALL; Essential Eight: N/A
<p>System owners obtain authorisation to operate each system from its authorising officer based on the acceptance of the security risks associated with its operation.</p>


•	Taxonomies:
	•	type: Classify content as requirement, design-decision, test-case, implementation, etc.
	•	component: Identify the system component related to the content.
	•	status: Indicate the development status such as draft, in-progress, completed.
	•	priority: Set the importance level like high, medium, low.


## req-template.md

---
title: "System Requirement Template"
draft: false
images: []
weight: 2
toc: true
---

The following markdown is an example

```markdown
---
id: "REQ-XXX"
title: "Requirement Title"
description: "Detailed description of the requirement."
type: "Functional/Non-Functional/Security/System"
priority: "High/Medium/Low"
status: "Planned/In Progress/Implemented/Tested"
author: "Your Name"
creation_date: "YYYY-MM-DD"
rationale: "Explanation of why this requirement is necessary."
dependencies: [List of related requirement IDs]
acceptance_criteria:
  - "Condition 1 that must be met."
  - "Condition 2 that must be met."
verification_method: "Testing/Inspection/Analysis"
references:
  - "Relevant documents, links, or sources."

# Traceability fields
implementation_ref: "/implementation/IMPL-REQ-001"
test_ref: "/tests/TEST-REQ-001"
status_progress:
  planned: "2024-09-28"
  implemented: "2024-10-05"
   tested: "2024-10-10"
---

# Requirement Title
Provide a detailed description of the requirement here...

## Rationale
Explanation of why this requirement is necessary.

## Acceptance Criteria
- List the specific conditions that must be fulfilled for this requirement to be considered complete.

## Dependencies
- List other related requirement IDs.

```


## srs-process-overview.md

---
title: "SRS Process Overview"
description: "Overview of Specification Process"
draft: false
images: []
weight: 2
toc: true
---
## Skill Pre-requisite

[GitHub Skills](https://skills.github.com)

Given the structure of your project, the goal is to create a well-organized **Requirements Workbook** within the `/workbooks/specification` directory in the GitHub repository. We will also add a **Training Workbook** for student guidance.

### 1. Setting Up the Requirements Workbook
Login to the courses github repo.
Then either clone the https://github.com/stem-teacher/brokenhill-h.github.io.git or simply create a new branch (e.g. srs-update).

Access the workbook is simplest using associated codespaces onn the branch.

#### Directory Structure for Requirements
The full path for the requirements would be under:
```
/content/workbooks/specification/functional
/content/workbooks/specification/non-functional
/content/workbooks/specification/security
/content/workbooks/specification/system
```

### 2. Requirements Template
Create a Markdown file named `REQ-TEMPLATE.md` inside each of the specification directories (e.g., `/workbooks/specification/functional/REQ-TEMPLATE.md`). This template will provide a standard format for writing requirements.

#### **`REQ-TEMPLATE.md`**
```markdown
---
id: "REQ-XXX"
title: "Requirement Title"
description: "Detailed description of the requirement."
type: "Functional/Non-Functional/Security/System"
priority: "High/Medium/Low"
status: "Planned/In Progress/Implemented/Tested"
author: "Your Name"
creation_date: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
rationale: "Explanation of why this requirement is necessary."
dependencies: [List of related requirement IDs]
acceptance_criteria:
  - "Condition 1 that must be met."
  - "Condition 2 that must be met."
verification_method: "Testing/Inspection/Analysis"
references:
  - "Relevant documents, links, or sources."
---

# Requirement Title
Provide a detailed description of the requirement here...

## Rationale
Explanation of why this requirement is necessary.

## Acceptance Criteria
- List the specific conditions that must be fulfilled for this requirement to be considered complete.

## Dependencies
- List other related requirement IDs.
```

- **Instructions:** Whenever a new requirement is created, copy this template, rename it (e.g., `REQ-001.md`), and fill in the details.

### 3. Requirements Example

Here’s an example of a functional requirement using the template, to be placed in `./workbooks/specification/functional/REQ-001.md`:

#### **`REQ-001.md`**
```markdown
---
id: "REQ-001"
title: "User Authentication"
description: "The system must allow users to authenticate using a username and password."
type: "Functional"
priority: "High"
status: "Planned"
author: "John Doe"
creation_date: "2024-09-28"
last_updated: "2024-09-28"
rationale: "To ensure only authorized users can access the system, enhancing security."
dependencies: []
acceptance_criteria:
  - "Users can log in with valid credentials."
  - "Invalid login attempts are logged and rejected."
verification_method: "Testing"
references:
  - "School Event Management System Overview"
  - "https://example.com/authentication-guidelines"
---

# User Authentication
The system must allow users to authenticate using a username and password.

## Rationale
To ensure only authorized users can access the system, enhancing security.

## Acceptance Criteria
- Users can log in with valid credentials.
- Invalid login attempts are logged and rejected.

## Dependencies
None.
```

### 4. Requirements Workbook Index

Create or edit a `README.md` file inside the `./workbooks/specification/` directory to serve as an index for all requirements:

#### **`/workbooks/specification/README.md`**
```markdown
# Requirements Workbook

This workbook contains all the system requirements for the School Event Management System (SEMS). The requirements are categorized into functional, non-functional, security, and system requirements.

## List of Requirements

### Functional Requirements
- [REQ-001: User Authentication](functional/REQ-001.md)

### Non-Functional Requirements
- [REQ-TEMPLATE: Non-Functional Requirement Template](non-functional/REQ-TEMPLATE.md)

### Security Requirements
- [REQ-TEMPLATE: Security Requirement Template](security/REQ-TEMPLATE.md)

### System Requirements
- [REQ-TEMPLATE: System Requirement Template](system/REQ-TEMPLATE.md)
```

### 5. Creating the Training Workbook

To support students, add a **Training Workbook** in the root `/workbooks` directory. This will provide guidance on how to use the templates and create new requirements.

#### Directory Path
```
./workbooks/training
```

#### **`/workbooks/training/README.md`**
```markdown
# Training Workbook

Welcome to the Training Workbook for the Software Engineering Course. This workbook provides guidelines and instructions for creating software requirement specifications (SRS) and using the version control system (Git) to manage these specifications.

## How to Create a New Requirement

1. Navigate to the relevant category in the `./workbooks/specification/` directory (functional, non-functional, security, or system).
2. Copy the template file (`REQ-TEMPLATE.md`) and rename it (e.g., `REQ-002.md`).
3. Fill in the required fields in the front matter and the main body of the document.

### Example Workflow

1. Copy the [`req-template.md`](/process/specification/req-template):
   ```bash
   cp ./workbooks/specification/functional/REQ-TEMPLATE.md ./workbooks/specification/functional/REQ-002.md
   ```

2. Open the newly created `REQ-002.md` file in your text editor and complete the fields.

3. Save the file, add it to Git, commit, and push to the repository:
   ```bash
   git add ./workbooks/specification/functional/REQ-002.md
   git commit -m "Add new functional requirement: REQ-002"
   git push origin main
   ```

## Additional Resources

- [Git Basics](https://git-scm.com/docs/gittutorial) - Learn how to use Git for version control.
- [Markdown Guide](https://www.markdownguide.org/) - Learn Markdown syntax for creating structured documents.
```

### Summary

- **Templates**: Create `REQ-TEMPLATE.md` in each subdirectory under `./workbooks/specification` for different requirement types (functional, non-functional, security, system).
- **Examples**: Create example requirement files using the templates, such as `REQ-001.md`.
- **Index**: Use a `README.md` file in `./workbooks/specification` to link all requirements.
- **Training Workbook**: Place a `README.md` file in `./workbooks/training` to guide students through the process of creating requirements.

This structure will help your team and students systematically create, manage, and track software requirements, all within the organized workbook system on the GitHub-hosted Hugo site.


