# V9.6 Signal Results Test Report

## Changes verified
- New signal form uses TP1, TP2 and TP3 only.
- Admin status modal requires manual pips/points for TP1, TP2, TP3, SL, Breakeven and Manual Close.
- Move SL to Breakeven and Cancel do not require a result.
- TP3 is labelled as final and closes the signal through SQL 09.
- Student Signals page contains separate Active Signals and History tabs.
- Active signals exclude final states.
- History includes TP3, SL, Breakeven, Manual Close and Cancelled states.
- Active groups use publish date; History groups use close/status date.
- TP hit cards show the manual result recorded in signal_updates.
- JavaScript syntax checks passed for Admin and Student files.
- Required HTML IDs are unique and referenced assets exist.

## Live test required after deployment
Run SQL 09, then test one signal through TP1 → TP2 → TP3 and confirm it moves from Active to History.
