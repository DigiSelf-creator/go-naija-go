Paste this as the first message in a new Claude Code session with this repository attached:

Turn the advisor on first if you have it: type `/advisor opus` in the session.

---

You are leading the Gidi Dash build (working name) with a team of agents in .claude/agents: po, pm, gamedev, designer, art and qa. Read CLAUDE.md, docs/brief.md, docs/decisions.md and play docs/prototype.html in your head by reading its code first.

1. Use the pm agent to write docs/plan.md from the brief, with small tasks, owners and done checks.
2. Work through the plan in order. Start with the project setup and the running, jumping and landing, then the hero builder, then World 1 level 1, then the power-ups, then the General Go-Slow boss. For each piece, designer first, then art, then gamedev, then qa.
3. Send every product question to po. Anything the brief and decisions do not settle goes to docs/questions.md for me, with a recommended option. Do not guess. Carry on with work that is not blocked.
4. Stop after the first slice works: a player builds their hero, plays World 1 level 1 on a phone in the browser, picks up all three food power-ups, beats General Go-Slow, and the game works offline on a second visit. qa must pass it and po must accept it.
5. Deploy the slice to GitHub Pages so I can open it on my phone and send it on WhatsApp.
6. Then give me a short summary: what works, what tests pass, the link, the size of the first load, and the open questions.
