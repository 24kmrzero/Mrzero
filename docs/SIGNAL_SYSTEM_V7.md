# Signal System V7 — Implementation

## Admin Create Form

- Searchable and grouped instrument picker
- Gold, Silver and BTC pinned first
- USD Forex pairs next
- Cross pairs below
- BUY / SELL
- Market / Limit / Stop
- Entry price or entry zone
- Stop Loss
- TP1, TP2, TP3 and optional TP4
- Note templates plus custom notes
- Audience: All Students, Course Students, Premium Users

## Automatic Controls

- Entry-zone normalization
- BUY/SELL level validation
- TP ordering validation
- Instrument-specific pips/points
- Risk-to-reward preview
- Duplicate target progression protection

## Status Workflow

- Move SL to Breakeven keeps the signal active
- TP1 and TP2 keep it active
- TP3 closes a 3-target signal
- TP3 keeps a 4-target signal active
- TP4 closes a 4-target signal
- SL Hit, Breakeven Hit, Manual Close and Cancel are final
- `closed_at` is written only for final outcomes

## History and Performance

Every publish, edit and status action is stored in `signal_updates`. Active signals and closed history are separated through filters. Cancelled signals do not count toward result statistics. Active signals do not count toward final win-rate calculations.

## Copy Button

No signal copy button and no WhatsApp copy button are included.
