# Architecture rules

- EventForm uses an opt-in accordion presentation for event detail; creation keeps its existing layout so visual changes do not alter other workflows.
- Read-only event fields are disabled inside section content, not around accordion triggers, so every section remains accessible for consultation.
- Financial formulas, state updates and save payloads remain independent of section order so presentation changes preserve business behavior.