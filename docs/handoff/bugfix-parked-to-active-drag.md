# CC Prompt: Fix Parked→Active Drag & Drop for Manual Projects

## Bug
Manually created projects cannot be dragged from "Parked" to "Active". The evaluate gate blocks them because `evaluated` is `undefined` (never set), and the check uses `!== true` which catches `undefined`.

## Root Cause
Two places in `public/app.js` use `dragged.evaluated !== true` — this blocks any project where `evaluated` is not explicitly `true`, including manually created projects that were never imported.

## Fix
Change the condition from `!== true` to `=== false` in both locations. This means:
- `evaluated === false` (imported, not evaluated) → **blocked** ✓
- `evaluated === true` (evaluated) → **allowed** ✓
- `evaluated === undefined/null` (manually created) → **allowed** ✓

### Location 1: `handleDrop()` function (~line 1250-1255)

**Before:**
```javascript
if (targetGroup === 'Active' && dragged.evaluated !== true) {
```

**After:**
```javascript
if (targetGroup === 'Active' && dragged.evaluated === false) {
```

### Location 2: Edit modal validation (~line 2903-2907)

**Before:**
```javascript
if (group === 'Active' && project.evaluated !== true) {
```

**After:**
```javascript
if (group === 'Active' && project.evaluated === false) {
```

## Rules
- Change ONLY these two conditions
- Do NOT modify any other logic
- Do NOT change the warning message
- Do NOT change backend code
- Test: create a manual project, park it, drag to Active — should work
- Test: import a project (evaluated: false), try drag to Active — should still be blocked
