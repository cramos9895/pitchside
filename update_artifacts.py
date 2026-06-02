import re

with open('/Users/christianramos/.gemini/antigravity/brain/12d5e932-6668-47bd-865f-6e21a2f19235/task.md', 'r') as f:
    task_content = f.read()

task_content = task_content.replace(
    "- `[ ]` **Phase 3: Admin Visibility**",
    "- `[x]` **Phase 3: Admin Visibility**"
).replace(
    "  - `[ ]` Update Admin Roster to display requested team/teammate names by reading from the new `requested_team_id`, `requested_teammate_ids`, and `requested_team_name` columns.",
    "  - `[x]` Update Admin Roster to display requested team/teammate names by reading from the new `requested_team_id`, `requested_teammate_ids`, and `requested_team_name` columns."
).replace(
    "  - `[ ]` Modify the rendering logic to query and display the `requested_team_name` and resolve the names associated with `requested_teammate_ids` from the profiles table.",
    "  - `[x]` Modify the rendering logic to query and display the `requested_team_name` and resolve the names associated with `requested_teammate_ids` from the profiles table."
).replace(
    "- `[ ]` **Phase 4: Build Verification**",
    "- `[x]` **Phase 4: Build Verification**"
).replace(
    "  - `[ ]` Run `npm run build` to confirm all types and paths resolve correctly.",
    "  - `[x]` Run `npm run build` to confirm all types and paths resolve correctly."
)

with open('/Users/christianramos/.gemini/antigravity/brain/12d5e932-6668-47bd-865f-6e21a2f19235/task.md', 'w') as f:
    f.write(task_content)

