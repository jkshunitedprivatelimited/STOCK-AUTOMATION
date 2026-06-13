# Implement Disable Profile Feature

This plan outlines the steps to add a "Disable" toggle button in the Central Profiles page, allowing administrators to prevent specific users from logging in, without deleting their accounts.

## User Review Required

> [!IMPORTANT]
> **Database Update Required**
> Since we need a way to store whether a user is disabled or not, we will need to add a new column to the database. You will need to run a small SQL query in your Supabase Dashboard's SQL Editor to add the `is_active` column:
> ```sql
> ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
> ```
> 
> **RLS Policies**
> We must ensure that Central Admins are allowed to update the `is_active` column in the `profiles` table. If Row Level Security blocks this, the toggle button will fail.

## Open Questions

> [!WARNING]
> 1. **Visual Indicator:** I will add a small "INACTIVE" badge to disabled profiles in the UI.
> 2. **Staff Specific Toggling:** Currently, this cascaded architecture will automatically disable all Store Staff if their parent Franchise is disabled. Do you also want a UI to disable *individual* Store Staff members independently? (If yes, we will need to add `is_active` to `staff_profiles` too).

## Proposed Changes

---

### Database Schema (Manual Step)

#### [NEW] Supabase SQL Editor
You will need to run the following command in Supabase to add the new field. This should be run **before** deploying the frontend code:
```sql
ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
```

---

### Authentication

#### [MODIFY] [Login.jsx](file:///Users/surojuhomsaisantosh/Desktop/SANTOSH/PROJECTS/5%20JKSH/stock-automation/src/pages/landing/Login.jsx)
- After fetching `finalProfileData`, add a check for `finalProfileData.is_active === false`.
- **Cascading Feature:** Because `Login.jsx` constructs the staff profile by spreading the `franchiseInfo` (`{ ...staffProfile, role: "staff", ...franchiseInfo }`), if a Franchise is disabled, its staff will inherently receive `is_active: false` and be blocked from logging in automatically.
- **Safety Check:** Ensure we don't crash for `office_staff` by safely checking `if (userRole !== "office_staff" && finalProfileData.is_active === false)`.
- If inactive, sign them out and throw a custom error: `"Your account has been disabled. Please contact the administrator."` to display in the login error box.

#### [MODIFY] [AuthContext.jsx](file:///Users/surojuhomsaisantosh/Desktop/SANTOSH/PROJECTS/5%20JKSH/stock-automation/src/context/AuthContext.jsx)
- Update the `hydrate` function to check if `finalProfile.is_active === false`.
- If the user is inactive, clear local session state immediately, call `supabase.auth.signOut()`, and smoothly redirect to `/login` to avoid infinite reload loops.

---

### Central Profiles UI

#### [MODIFY] [central_franchise_profiles.jsx](file:///Users/surojuhomsaisantosh/Desktop/SANTOSH/PROJECTS/5%20JKSH/stock-automation/src/pages/central/central_franchise_profiles.jsx)
- **State Management:** Add a loading state for the specific button being toggled to prevent multiple clicks.
- **Action Function:** Add a robust `handleToggleStatus(profile)` function wrapped in a `try...catch` block. It will send a Supabase update: `supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id)` and refresh profiles.
- **Desktop Table View:** Add an "Enable/Disable" icon/button in the action column. If `is_active` is true, show a red Lock/Disable icon. If false, show a green Unlock/Enable icon.
- **Mobile Card View:** Add a third action button next to Update and Delete for toggling status.
- **Visual Feedback:** For disabled profiles, show a subtle "DISABLED" tag or dim their row so it's easy to spot them in the list.

## Verification Plan

### Manual Verification
1. **Check Database:** Verify the `is_active` column exists in Supabase.
2. **Toggle Feature:** In the Central Profiles page, try disabling a user. Confirm the UI updates and no RLS errors occur.
3. **Login Prevention:** Attempt to log in with the credentials of the disabled user. Verify that the login is rejected with the "disabled" error message.
4. **Cascading Staff Prevention:** Log in as a Store Staff member of a disabled franchise. Verify they are blocked automatically.
5. **Session Revocation:** Log in with an active user, then in another window (or the admin panel), disable that user. Refresh the page for the disabled user and confirm they are redirected to the login page.
6. **Re-enabling:** Enable the user again and confirm they can successfully log back in.
