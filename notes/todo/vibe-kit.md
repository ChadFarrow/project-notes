- [ ] After merge: Computer: On the Linux laptop, run `git pull` in `~/Vibe/vibe-kit`, so the laptop gets the rules of 2026-11-17 and 2026-11-18: disk, branches, the hold lock (#9), no box for a plain feature push (#12), the usage on the status line (#11) and the protected-repo lock (#16). Then run `~/Vibe/vibe-kit/install.sh` there (#9, #12 and #16 need it): every line it prints must start with `ok` or `WARN`. Then run `node ~/Vibe/vibe-kit/merged-branches.mjs` there: it lists the local branches of merged PRs, and `--apply` deletes them.

## Already works

- The on-device AI of Chrome is off on the Mac mini (2026-11-17, computer): Local State has `optimization_guide.on_device_foundational_model_user_settings` = `false`, and `OptGuideOnDeviceModel` (4.0 GB) is deleted. Chrome then ran for 16 minutes: the folder did not come back, and the setting stayed off.
