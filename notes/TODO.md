# To do

#todo

The To do list is the folder `notes/todo/`: one Obsidian note per repo. This page holds the rules for those notes. An item written on this page still shows on the web page, but put new items in the folder.

Things Chad must do himself: a decision, a setting (a Vercel variable, a token, a key), a command that only he can run, a merge or a release that stays his, or a step that only he can do on air. Add a line when a task stops for such a step, and delete the line when it is done. A line that asks Chad to test work that is shipped does not go here (rule 8). Bugs, ideas and findings do not go here. This repo is public, so write nothing private here: no addresses, no keys, and no detail from a private repo.

1. One note per repo: `notes/todo/<repo>.md`, named exactly as the repo on GitHub. Add to the note that exists, and do not make a second note that differs only in case. A second note for one repo is named `<repo> <anything>.md`, for example `boostmebitch - playlist tests.md`. A note in a subfolder of `notes/todo/` stays off the web page.
2. Give one PR one line, and put each step on its own indented line under it, so each step has its own box. The box on a line deletes that line. The box on the PR line deletes it and the lines under it. A blank line ends the group.
3. Start each item with its group: `Before merge:` (a step that blocks a merge or a release that Chad does himself), `After merge:` (a step for Chad on merged or deployed work, such as a setting), or `In development:` (work in progress, a decision, a question to someone). A step can say where Chad does it: `Phone:`, `Computer:` or `On air:`. A step without one takes the place of its item.
4. A heading in a note can carry the words for the items under it, for example `## After merge: Computer: Vercel settings (#605)`. An item's own words win.
5. Only a line with a box is an item. Plain bullets and callouts stay text.
6. Write a PR or an issue of the note's repo as `#N`, and one of another repo as `owner/repo#N`. The web page links each one and shows its title.
7. A tick in Obsidian is Chad's report that the line is done. The session that comes next acts on it and deletes the line. A session never ticks a box for Chad. A session that finishes an item itself deletes the line. Keep the lines under a record heading such as `Already works`. Delete a note that has no open line and no record.
8. No "please test" lines (Chad, 2026-11-21). An agent tests its work in a browser before the PR, and again before its own merge. It names in the PR body what it did not test, with the reason. It does not add a line that asks Chad to test work that it ships: the live site and its users find the rest. It adds no phone test line: Chad uses the iOS app himself and tells an agent when something fails. A real-phone test happens only when Chad asks for one.
9. Edit these notes straight on `main`: pull first, and the push asks Chad.
10. The note of a private repo is not published. `.gitignore` lists every private repo, so its note stays in Obsidian and on the Mac mini, and never goes to GitHub or the web page. Tick it in Obsidian as usual. Write its lines in `~/Vibe/project-notes/notes/todo/` on the Mac mini, do not commit them, and never `git add -f` it. Do not write a private repo's lines on this page or in a public repo's note. When a repo turns private, add it to `.gitignore` first. The web page hides a private repo's lines that slip through, and names the file under Note problems.
