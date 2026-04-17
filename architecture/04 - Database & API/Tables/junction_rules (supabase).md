# 🧩 Logic: junction_rules

**Domain:** #database #logic  **Context:** Relationship Management

## 📖 Overview

The PitchSide database relies heavily on junction tables to manage many-to-many relationships (e.g., Facility ↔ Activity). This document outlines the consistency rules for these intersections.

## 📄 Junction Registry

| Table | Left Side | Right Side | Logical Purpose |
|---|---|---|---|
| **facility_activities** | `facility_id` | `activity_type_id` | Defines which sports a venue supports. |
| **resource_activities** | `resource_id` | `activity_type_id` | Defines sport compatibility for specific courts/fields. |
| **league_resources** | `league_id` | `resource_id` | Designates specific fields for competition use. |
| **team_players** | `team_id` | `user_id` | Manages rosters and squad memberships. |

## 🛡️ RLS & Cascade Rules

1.  **Deletion**: Most junctions use `ON DELETE CASCADE` to prevent orphaned records.
2.  **Uniqueness**: Primary keys are typically composite `(id_a, id_b)` to prevent duplicate mapping.
3.  **Governance**: Insertion into junctions usually requires "Owner" permissions on the Left Side entity (e.g. Facility Admin for `facility_activities`).

---

**Maintaining strict junction logic prevents "Dead Scheduling" and ensures that games are only created on compatible resources.**