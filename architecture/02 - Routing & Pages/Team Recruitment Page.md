# 📄 Team Recruitment Page

**Path:** `src/app/invite/[id]/page.tsx` (Team Invite Portal)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Invitation Branding:** A high-fidelity card (`bg-pitch-card`) featuring the "Official Invitation" header, team name, and the specific tournament context.
    - **Payment Structure Notice:** A dynamic information block that identifies the payment model chosen by the captain:
        - **Full-Pay Mode:** Notifies the user that the captain has already covered the entry fee.
        - **Split-Pay Mode:** Notifies the user that costs will be divided equally among rostered players.
    - **Split-Pay Price Estimator:** A specialized UI fragment that displays an **Estimated Split Range** (Min/Max) based on the total team price and the tournament's roster constraints.
    - **Liability Trap:** A prominent, orange-tinted agreement section requiring a digital signature (checkbox) of the platform's liability waiver.
    - **Secure Stripe Vault:** (Conditional) An embedded `PaymentElement` used specifically for Split-Pay teams to authorize card vaulting without immediate charging.
- **Imported Custom Components:**
    
    - [[InviteClient]]: The primary orchestration component for the invite flow.
    - [[SetupIntentForm]]: A specialized child component for handling Stripe authentication and card verification.
- **Icons (lucide-react):**
    
    - `Trophy`, `CheckCircle2`, `ArrowRight`, `ShieldCheck`, `Info`, `Loader2`, `CreditCard`, `Lock`
- **Buttons / Clickable Elements:**
    
    - **"Accept & Join" Button:** Primarily used for free-to-join or Full-Pay invites.
    - **"Authorize Card" Button:** A high-security button for Split-Pay users to verify their payment method.

## 🎛️ State & Variables

- **React State (Client-Side):**
    
    - `waiverAccepted`: A boolean gatekeeper for all registration actions.
    - `clientSecret`: Powers the Stripe **SetupIntent** for card vaulting.
    - `error`: Surfacing validation or connectivity issues (e.g., card declined).
- **Core Business Logic:**
    
    - **Dynamic Split Logic:** Automatically calculates `minSplit` and `maxSplit` by dividing the `totalFee` by the `max_players_per_team` and `min_players_per_team` respectively.
    - **Authentication persistence:** If the user is unauthenticated, they are redirected to `/login` with a `callbackUrl` that returns them directly to the invite after successful sign-in.
    - **Payment Branching:**
        - **Branch A (Free):** Skips Stripe and calls [[acceptTeamInvite]] immediately.
        - **Branch B (Vaulting):** Requires Stripe `confirmSetup` before calling the registration action.
- **Database Queries (Server-Side):**
    
    - **Team Context:** [[supabase.from('teams').select(...) ]] to resolve competition IDs.
    - **Tournament Normalization:** A serial lookup to `games` or `leagues` to retrieve pricing and registration rules.
    - **Captain & Roster Logic:** Resolves the captain's identity and current `rosterCount` to calculate team capacity.

## 🔗 Links & Routing (Outbound)

- `/login?callbackUrl=/invite/[teamId]` (Intelligent redirection flow)
- `/dashboard?success=team-joined` (Post-success destination)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the server-side Supabase connection)
- [[acceptTeamInvite]]: Performs the final database insert once all gates (Auth, Waiver, Payment) are cleared.
- [[createSetupIntent]]: Communicates with Stripe to prepare a secure card-vaulting session.