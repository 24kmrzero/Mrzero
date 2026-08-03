# V7 Test Checklist

## SQL
- [ ] Run only `06_SIGNAL_AUTOMATION_AND_HISTORY.sql`
- [ ] Verification shows `signals upgraded`
- [ ] Verification shows `signal_updates ready`

## Admin Signals
- [ ] Pair search opens and Gold/Silver/BTC are first
- [ ] USD pairs appear before crosses
- [ ] BUY validation rejects SL above entry
- [ ] SELL validation rejects SL below entry
- [ ] TP order validation works
- [ ] New signal publishes once
- [ ] Normal edit does not send a new-signal notification
- [ ] Move SL to BE keeps signal active
- [ ] TP1 progress is 33% for 3 TP / 25% for 4 TP
- [ ] TP2 progress is 66% for 3 TP / 50% for 4 TP
- [ ] TP3 closes 3-TP signal
- [ ] TP3 keeps 4-TP signal active at 75%
- [ ] TP4 closes 4-TP signal at 100%
- [ ] SL Hit closes the signal
- [ ] Breakeven Hit closes at zero by default
- [ ] Manual Close accepts close price or manual result
- [ ] Cancel does not count in performance
- [ ] History modal shows every event

## Student Signals
- [ ] Signal appears after Admin publish
- [ ] Progress bar updates in Realtime
- [ ] SL Moved to BE badge appears
- [ ] Active and Closed History filters work
- [ ] Total/weekly/monthly performance updates only after final close
- [ ] Signal History opens
- [ ] No Copy/WhatsApp Copy button exists
- [ ] Browser alert permission button works

## Regression
- [ ] Student login
- [ ] Admin login
- [ ] Payment receipt upload
- [ ] Admin payment approval
- [ ] Course unlock
- [ ] Google Meet link access
- [ ] Charts, Articles and Announcements
- [ ] Mobile menu
- [ ] Logout
