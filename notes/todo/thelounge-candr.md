- [ ] In development: End of the IRCCloud trial: The Lounge takes `ChadF` with NickServ, channel order, cancel IRCCloud. The after-show DMs (#84) go to `ChadF33,ChadF,Reed` now; when `ChadF33` is gone, Claude removes it from `NOTIFY_NICKS` in `/opt/bots/env/cbb.env` and recreates candr-boost.

- [ ] Before merge: #86, `candr_boost_bot` keeps the show-note DMs from Chad and Reed. Review and merge. The deploy and `NOTES_ACCOUNTS=ChadF,reed` wait for Chad's yes.
  - [ ] After merge: Computer: after the deploy, DM `candr_boost_bot` a link from IRCCloud and look for the `saved note #N` reply.
