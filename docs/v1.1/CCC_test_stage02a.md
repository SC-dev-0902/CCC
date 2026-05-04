# Stage 02a Test Checklist - Treeview: Parent/Sub-Project Hierarchy

Test URL: `http://172.16.10.6/CCC/design-preview/`

- [x] Orion parent row renders in Active group - chevron, running status dot, name, COD badge
- [x] Orion progress bar shows: fill at 25% (2/8), label reads "Stage 2 / 8"
- [x] Orion expands to show orion-api (running) and orion-web (unknown) with v1.0 version badges
- [x] Nexus parent row renders in Active group - chevron, completed status dot, name, COD badge
- [x] Nexus progress bar shows: fill at ~16% (1/6), label reads "Stage 1 / 6"
- [x] Nexus collapsed by default (sub-projects hidden)
- [x] Vertex parent row renders in Parked group - chevron, unknown status dot, name, COD badge
- [x] Vertex progress bar shows: fill at 0% (0/5), label reads "Stage 0 / 5"
- [x] Each sub-project row shows: status dot, name, type badge, version badge (v1.0)
- [x] Clicking chevron collapses and expands sub-projects correctly
- [x] LeadSieve and CCC still render without visual breakage
- [x] Dark theme renders correctly (uses theme tokens)
- [x] Light theme renders correctly (uses theme tokens)
- [x] No console errors on load
