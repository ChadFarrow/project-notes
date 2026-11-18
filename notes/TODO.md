# To do

#todo

The To do list is the folder `notes/todo/`: one Obsidian note per repo. This page holds the rules for those notes. An item written on this page still shows on the web page, but put new items in the folder.

Things Chad started and must finish himself later, by running something or by testing further. Add a line when a task stops for that reason, and delete the line when it is done. Bugs, ideas and findings do not go here. This repo is public, so write nothing private here: no addresses, no keys, and no detail from a private repo.

1. One note per repo: `notes/todo/<repo>.md`, named exactly as the repo on GitHub. Add to the note that exists, and do not make a second note that differs only in case. A second note for one repo is named `<repo> <anything>.md`, for example `boostmebitch - playlist tests.md`. A note in a subfolder of `notes/todo/` stays off the web page.
2. Give one PR one line, and put each test on its own indented line under it, so each test has its own box. The box on a line deletes that line. The box on the PR line deletes it and the lines under it. A blank line ends the group.
3. Start each item with its group: `Before merge:` (a PR needs it before Chad merges), `After merge:` (a follow-up check on merged or deployed work), or `In development:` (work in progress, a decision, a question to someone). Start each test with where Chad does it: `Phone:`, `Computer:` or `On air:`. A test without one takes the place of its item.
4. A heading in a note can carry the words for the items under it, for example `## Before merge: Phone: 1. The playlist maker (#538)`. An item's own words win.
5. Only a line with a box is an item. Plain bullets and callouts stay text.
6. Write a PR or an issue of the note's repo as `#N`, and one of another repo as `owner/repo#N`. The web page links each one and shows its title.
7. A tick in Obsidian is Chad's report that the line is done. The session that comes next acts on it and deletes the line. A session never ticks a box for Chad. A session that finishes an item itself deletes the line. Keep the lines under a record heading such as `Already works`. Delete a note that has no open line and no record.
8. Add a `Phone:` test only for what Chrome with phone emulation cannot test: iOS audio, the lock screen, the Home Screen app, a real touch on iOS, the Zapstore app, or an Android signer such as Amber. Name that gap in the line. For boostmebitch, put the phone tests of open PRs under one `Before merge: Phone pass on beta` item, one test for each PR.
9. Edit these notes straight on `main`: pull first, and the push asks Chad.
10. The note of a private repo is not published. `.gitignore` lists every private repo, so its note stays in Obsidian and on the Mac mini, and never goes to GitHub or the web page. Tick it in Obsidian as usual. Write its lines in `~/Vibe/project-notes/notes/todo/` on the Mac mini, do not commit them, and never `git add -f` it. Do not write a private repo's lines on this page or in a public repo's note. When a repo turns private, add it to `.gitignore` first. The web page hides a private repo's lines that slip through, and names the file under Note problems.
