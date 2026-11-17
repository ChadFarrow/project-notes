- [ ] In development: End of the IRCCloud trial: The Lounge takes `ChadF` with NickServ, channel order, cancel IRCCloud. The after-show DMs (#84) go to `ChadF33,ChadF,Reed` now; when `ChadF33` is gone, Claude removes it from `NOTIFY_NICKS` in `/opt/bots/env/cbb.env` and recreates candr-boost.

- [ ] Before merge: #89, `!note` and `!title` in `#candr`: anyone suggests a show-note link or an episode title, and `candr_boost_bot` answers with its number. Review and merge. The deploy and `PICK_CHANNELS=#candr` wait for Chad's yes.
  - [ ] After merge: Computer: after the deploy, type `!title test idea` in `#candr` and look for the answer `ChadF: title idea #1 saved`.
