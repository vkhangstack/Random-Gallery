<!--
Sync Impact Report
Version change: unversioned scaffold → 1.0.0
Modified principles: unnamed template slots →
  I. Think Before Coding
  II. Simplicity First
  III. Surgical Changes
  IV. Goal-Driven Execution
Added sections: Scope and Constraints; Development Workflow; Governance
Removed sections: unused fifth principle template slot
Follow-up TODOs: none
Review note: remove this temporary report before committing the constitution.
-->
# my-project-sdd Constitution

## Core Principles

### I. Think Before Coding

Contributors MUST state implementation assumptions explicitly and surface material tradeoffs
before making changes. When multiple interpretations affect the outcome, contributors MUST
present them and ask for clarification instead of silently choosing. Unresolved ambiguity that
blocks correct implementation MUST be resolved before dependent work proceeds. Contributors
MUST identify a simpler approach when one satisfies the requirements. This prevents hidden
assumptions from becoming implementation defects.

### II. Simplicity First

Changes MUST contain only the code needed to satisfy the requested behavior. Contributors MUST
NOT add speculative features, single-use abstractions, unrequested configuration, or error
handling for impossible scenarios. Before completing a change, contributors MUST check whether
a smaller implementation satisfies the same requirements and simplify when it does. This keeps
maintenance costs proportional to the problem being solved.

### III. Surgical Changes

Every changed line MUST trace to the requested outcome. Contributors MUST preserve surrounding
style and MUST NOT refactor, reformat, or improve unrelated code or comments. Imports, variables,
and functions made unused by the change MUST be removed. Pre-existing dead code discovered
during the work MUST be reported rather than deleted without authorization. Narrow changes make
review and regression analysis reliable.

### IV. Goal-Driven Execution

Contributors MUST define observable success criteria before implementation. Multi-step work MUST
have a brief plan pairing each step with a verification check. Bug fixes MUST reproduce the bug
with a regression test before the fix; validation changes MUST cover invalid inputs; refactors
MUST pass relevant checks before and after the change. Contributors MUST run checks appropriate
to the change and continue until the criteria pass or a concrete blocker is reported. Trivial,
reversible edits MAY use direct inspection instead of new tests when it verifies the outcome.

## Scope and Constraints

Work MUST remain within the user's requested scope. Specifications and plans MUST distinguish
requirements from assumptions and MUST NOT introduce product features or technology constraints
without a requirement or repository evidence. These principles apply to code, documentation,
and project artifacts; the depth of planning and verification MUST match the change's risk.

## Development Workflow

1. Identify the requested outcome, applicable project instructions, and unresolved ambiguity.
2. State assumptions and define success criteria. For multi-step work, record the steps and
   their verification checks before editing.
3. Implement the smallest change that satisfies those criteria, preserving existing conventions.
4. Review the diff for unrelated changes, unnecessary complexity, and newly unused code.
5. Run the relevant verification and report the outcome, remaining limitations, and blockers.

Reviews MUST check compliance with all four core principles. A failing required check or an
unresolved requirement MUST be reported explicitly; work MUST NOT be described as complete while
its success criteria remain unmet.

## Governance

This constitution governs project specifications, plans, implementation, and reviews. Project
artifacts MUST conform to it. Any conflict MUST be surfaced and resolved explicitly rather than
silently bypassing a principle.

Amendments MUST document the proposed rule, its rationale, the affected principles, and any
migration required for existing work. The project owner MUST approve an amendment before it is
adopted as governing policy. Each amendment MUST update the version and last amended date while
preserving the original ratification date.

Versions MUST follow semantic versioning: MAJOR for incompatible principle removals or
redefinitions, MINOR for new principles or materially expanded guidance, and PATCH for wording
clarifications that do not change obligations. Every specification, plan, and change review MUST
check the applicable principles; any exception MUST include its rationale and explicit project
owner approval.

**Version**: 1.0.0 | **Ratified**: 2026-10-25 | **Last Amended**: 2026-10-25
