# 🗺️ Roadmap: Phase 6 / V2 Features

This document tracks upcoming high-level features and security hardening requirements for the PitchSide platform.

## 👥 Multi-Host Management
Current MVP only supports a singular primary host for event display and contact.
- [ ] **Multi-Host Management UI**: Build an interface in the Admin Dashboard to allow primary hosts to invite co-hosts to a game.
- [ ] **Co-Host Invitations**: Implement an invite system where co-hosts must accept the responsibility before being added to `host_ids`.
- [ ] **Shared Dashboard**: Ensure all users in `host_ids` have access to the match management portal.

## 🔐 Security & RBAC (Role-Based Access Control)
Hardening the platform against unauthorized edge-case modifications.
- [ ] **Strict Edit Locking**: Implement server-side check to lock game editing exclusively to the `host_ids` array.
- [ ] **Master Admin Overrides**: Ensure Master Admins (`role === 'admin'`) maintain a "God View" and can override any host restrictions.
- [ ] **Action Authorization**: Audit all match-level server actions (Finalize, Cancel, Update) to ensure the `currentUser.id` exists in the `host_ids` list.

---
*Created: 2026-04-13*
