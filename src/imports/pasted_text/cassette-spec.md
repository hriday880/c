# CASSETTE — UI/UX & Functional Update Specification

Please implement the following UI/UX and functional updates to the CASSETTE prototype. **Preserve the existing visual language, layout, typography, spacing, and interaction patterns wherever no change is explicitly requested.** These updates should feel native to the current design system rather than introducing a new visual direction.

## 1. Landing Page — Dark Mode Background Icons

### Objective

Update the background decorative icons/stickers on the dark-mode landing page to use the established beige color from the existing design system.

### Requirements

* Change the **fill and/or stroke color** of all background icons/stickers to the same beige currently used elsewhere in the dark-mode design system.
* Preserve the existing:

  * Shape
  * Size
  * Position
  * Rotation
  * Opacity, unless necessary for color consistency
  * Spacing
  * Layering
  * Overall composition
* **Do not redesign, resize, reposition, or replace any icons.**
* Only modify the color treatment.

### Expected Result

The decorative elements should remain visually identical in composition while appearing consistently beige and integrated with the existing dark-mode palette.

---

## 2. Landing Page — Dark Mode "Generate" Button

### Objective

Update the **Generate** button specifically for the dark-mode theme.

### Requirements

* Change the button background/fill to the established **beige** used throughout the dark-mode design system.
* Change the button text/font color to **white**.
* Preserve the existing:

  * Button dimensions
  * Border radius
  * Typography
  * Font weight
  * Position
  * Padding
  * Hover/interaction behavior, unless required to maintain accessibility
* Ensure sufficient contrast between the beige background and white text.
* Do not alter the light-mode version of the button unless required by shared component architecture.

### Expected Result

The Generate button should feel like a deliberate part of the dark-mode palette while maintaining the existing component design.

---

## 3. Audio Playback — Song Search & Loading Logic

### Objective

Improve CASSETTE's song retrieval and audio-preview behavior so that users can enter songs naturally and receive the **correct original track**, with playback beginning at a representative/catchy section rather than automatically starting from the beginning.

### A. Playback Timestamp

Instead of always starting the preview at `0:00`:

* Attempt to identify the **chorus, hook, or most recognizable/catchy section** of the song.
* Start playback from the most appropriate available timestamp.
* If reliable chorus/hook metadata is unavailable, implement a sensible fallback strategy rather than failing.
* The fallback should prioritize a musically meaningful portion of the track rather than blindly defaulting to the first few seconds.

The system should also ensure that:

* The timestamp is valid for the available preview duration.
* Playback never starts beyond the end of the preview.
* Existing loading, pause, play, and replay behavior remains functional.

### B. Flexible Song Search

Remove the dependency on the strict:

> `Artist Name - Song Name`

input format.

The search system should accept natural variations such as:

* `Frank Ocean Nights`
* `Nights by Frank Ocean`
* `Frank Ocean — Nights`
* `Nights`
* Variations in capitalization, punctuation, spacing, or ordering

### C. Search Accuracy

Improve query processing using a more robust search strategy, such as:

* Fuzzy matching
* Normalized search strings
* Artist/title separation where possible
* A music API's dedicated search endpoint
* Result ranking based on artist and track-title similarity
* Metadata matching

The primary objective is to retrieve the **original/official track**, rather than an incorrectly matched remix, cover, sped-up version, slowed version, live recording, or alternate version.

### Search Ranking Priority

When multiple results are returned, prioritize:

1. Exact or near-exact song title match
2. Exact or near-exact artist match
3. Original/official recording
4. Official/standard album version
5. Higher-confidence metadata match

Deprioritize results containing indicators such as:

* Remix
* Remastered, where a standard version is available
* Sped Up
* Slowed
* Reverb
* Nightcore
* Cover
* Live
* Acoustic
* Instrumental
* Edit
* Bootleg
* Mashup

Do not automatically exclude alternate versions if the user explicitly searches for one.

### Error Handling

If no high-confidence match is found:

* Do not silently load an unrelated track.
* Provide a graceful fallback or prompt the user to refine the search.
* Ensure the UI communicates loading and error states clearly.

---

## 4. Generated/Output Page — Header Overlap Fix

### Objective

Resolve the visual overlap between the **light/dark mode toggle** and the **cassette/vinyl music icon** in the top-right section of the generated/output page.

### Requirements

* Move the light/dark mode toggle **slightly to the left** to establish clear separation from the cassette/vinyl music icon.
* Maintain consistent horizontal and vertical padding with the rest of the header.
* Ensure neither component overlaps at any supported viewport size.
* Preserve the existing:

  * Toggle design
  * Icon design
  * Header height
  * Typography
  * Component sizing
  * Overall alignment
* Prefer adjusting the header's spacing/layout system rather than using arbitrary absolute positioning or hard-coded offsets, where possible.

### Responsive Behavior

Verify the header at:

* Desktop
* Laptop
* Tablet
* Narrow viewport widths

The components should maintain clear spacing and alignment across responsive breakpoints.

---

# Implementation Guidelines

### Preserve Existing Design

These are **targeted refinements**, not a redesign. Do not modify unrelated components, layouts, typography, animations, or color systems.

### Component Consistency

Where possible, update shared variables/design tokens rather than applying isolated styles. Reuse the existing beige color token instead of introducing a new beige value.

### Functional Integrity

After implementation, verify that:

* Dark mode remains visually consistent.
* Light mode is unaffected.
* The Generate button continues to function correctly.
* Song searches work with flexible natural-language input.
* The correct original track is prioritized.
* Audio playback begins at an appropriate timestamp.
* Loading and error states remain functional.
* The generated page header has no component overlap.
* Responsive layouts remain intact.

### Acceptance Criteria

The implementation is complete when:

* [ ] All dark-mode landing-page background icons use the established beige color without changing their geometry or placement.
* [ ] The dark-mode Generate button uses beige background + white text.
* [ ] Users are no longer required to enter songs using the exact `Artist - Song` format.
* [ ] Search reliably prioritizes the correct original track over remixes/alternate versions.
* [ ] Audio previews begin at a representative/catchy section whenever reliable timestamp information is available.
* [ ] Appropriate fallback behavior exists when timestamp or song metadata is unavailable.
* [ ] The light/dark toggle no longer overlaps the cassette/vinyl icon.
* [ ] Header spacing remains consistent and responsive.
* [ ] No unrelated UI or functionality is changed.

**Priority:** Preserve the existing CASSETTE aesthetic and interaction model while improving visual consistency, search robustness, and playback quality.
