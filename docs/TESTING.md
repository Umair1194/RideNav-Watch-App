# Testing

Run:

```bash
npm test
npm run validate
npm run build
```

The Node tests cover geographic math, formatting, maneuver progression, noisy GPS, off-route confirmation/cooldown, provider normalization, oversize geometry, and protocol validation/timeouts.

For simulation, run `zeus dev`, select a 480×480 round target, enable demo mode in Settings, and start **Demo ride**. `fixtures/simulated-gps.json` describes the reproducible sequence: waiting, straight, right turns, roundabout, three off-route samples, reroute, and arrival. Feed those locations using the simulator location controls. Simulator BLE/settings support depends on the installed Zeus/Zepp simulator version.

On hardware, verify display cleanup by ending normally, backing out, forcing an error, covering the screen, lowering the wrist, and waking it. Confirm the watch returns to normal screen-off behavior in every case.
