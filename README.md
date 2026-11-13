# Gbese!

**▶ Play the test version: https://digiself-creator.github.io/go-naija-go/**

It opens on any phone or computer, no sign-in. Add it to your home screen to open it like an app.

A free, light, one-tap running game set on Nigerian streets. Build a hero that looks like you, run through the city, eat Nigerian food for power-ups, and beat bosses that are everyday problems like traffic, power cuts and bad roads.

Tap anywhere to jump. Tap again in the air for a second jump. Hold to jump higher. On a computer, Space or the up arrow jumps too. The game is small, keeps your saves on your phone, and plays offline after your first visit.

## Run it on your computer

You need Node 22.

```sh
npm ci          # get the tools (once)
npm run dev     # start the game, then open the link it prints
npm test        # run the quick tests
npm run e2e     # play the built game in a pretend phone and check it works
```

Other helpers: `npm run build` makes the files players get in `dist/`, and `npm run check-size` fails if the first load is 3 MB or more.

## Put it online (GitHub Pages)

1. Make a new repo on GitHub. Any name works.
2. Push this code to the `main` branch.
3. On GitHub, open the repo's Settings, then Pages. Under "Build and deployment", set Source to "GitHub Actions".
4. Push to `main` again, or open the Actions tab and run "Test and deploy" by hand.

The workflow in `.github/workflows/deploy.yml` runs the quick tests, builds the game, checks the size, plays it in a pretend phone, and then puts it online, in about 15 minutes. If any of those checks fails, nothing goes online. The slow real-time and frame-rate tests run after, in their own job; if one fails, it gets fixed in the next update. When it is done, the game lives at `https://YOUR-NAME.github.io/REPO-NAME/`.

## More

- Full plan for the game: `docs/brief.md`
- How work is shared out: `docs/plan.md`
