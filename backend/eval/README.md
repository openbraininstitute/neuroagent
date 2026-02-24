# Eval UI

Run a local static server from `backend/eval`:

```bash
python -m http.server 8765
```

Then open:

`http://localhost:8765/ui/index.html`

The UI reads data from `output/detailed.json` on each load (or via the **Reload** button).
