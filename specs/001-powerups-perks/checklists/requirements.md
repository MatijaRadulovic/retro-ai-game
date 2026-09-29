# Specification Quality Checklist: Run XP and Perks

**Purpose**: Check feature requirement completeness and clarity before implementation
**Created**: 2026-09-29
**Feature**: [spec.md](../spec.md)

## Content and scope

- [x] Requirements focus on run XP and the three retained perks.
- [x] The single orange Lucky pickup is explicitly scoped; all other collectible effects and timers are excluded.
- [x] Base game rules are referenced without being rewritten.
- [x] User scenarios are ordered and independently testable.

## Requirement quality

- [x] XP thresholds and multi-level point awards are specified numerically.
- [x] Extra XP and Luck costs, level caps, spawn chance formula, and award formula are explicit.
- [x] Life costs, held-charge cap, collision recovery, and retained fields are explicit.
- [x] Purchase status, invalid request, failure, and no-mutation behavior are defined.
- [x] Restart behavior distinguishes a new run from life recovery.
- [x] Snapshot validation and Hint boundary are included.
- [x] Success criteria map to concrete tests or manual scenarios.

## Notes

- All 11 items passed self-review on 2026-09-29. This checklist evaluates specification quality,
  not implementation completion.
