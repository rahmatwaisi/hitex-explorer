# Complete your startup's profile on HITEX Explorer

Startups listed by HITEX can complete their profile on HITEX Explorer: team, open positions, how to apply
and what they're looking for. You add or update it with a pull request that contains **exactly one file**.

> **Strict rule:** only startups already in HITEX's list
> ([`public/data/startups_list.json`](public/data/startups_list.json)) can have a profile, and only one each.
> New startups that are not in that list are not accepted.

## The easy way: the form

Open the [profile form](https://hitex2026.netlify.app/#/contribution/form), pick your startup and answer the
steps. What HITEX publishes about your startup (name and description in four languages, founders) is
filled in for you, and your answers are saved in your browser as you go. The form checks everything with the
same rules as the bot below, then:

- **Submit on GitHub** opens GitHub with your file ready (or copied, for long files), so you only need to
  propose the change and open the pull request; or
- **Send without GitHub** sends your file to the project maintainer, who opens the pull request for you.
  Later changes to your profile then go through the maintainer too.

To update a published profile, use **Edit this profile** at the bottom of its page.

The rest of this guide is for writing the file by hand.

## 1. Create your file

1. Find your startup on the [Contribution page](https://hitex2026.netlify.app/#/contribution). It gives you
   your startup's id, a file name and the first lines of your file.
2. Copy [`templates/startup-profile.yml`](templates/startup-profile.yml) and put your id in
   `hitex.existing_profile`.
3. Name it `yyyymmdd_hhmmss_your_startup_name.yml`, using the current **UTC** time and your name in
   `snake_case` (lowercase letters, digits and `_`). Example:

   ```
   public/startups/20261005_171047_lyia_ai_company.yml
   ```

   The name part (`lyia_ai_company`) is your page address and must equal `slug` inside the file.
   Never rename the file later; edit it instead.
4. Fill it in. Fields marked `[required]` are needed; delete the optional ones you don't use.
   - **English (`en`) is required.** Arabic, Kurdish and Persian are optional and fall back to English.
   - Values written as `key` (industry, skills, benefits…) must come from the lists in the comments.
     Missing an option? Use `other` and the matching `*_other` field, and we'll consider adding it.
     Technologies and tools may be new keys; they are shown as written.
   - Put your GitHub username in `maintainers`. Only the people listed there can edit the file later.
   - No website yet? Use your page here as `website`:
     `https://hitex2026.netlify.app/startups/your_startup_name`.
   - Keep text in `"double quotes"`.

## 2. Open a pull request

1. Fork this repository, add your file to `public/startups/`, and open a pull request.
   You can do it all on github.com: **Add file → Create new file** in your fork.
2. A bot checks the file within a minute and comments with ✅ / ❌ for each rule:
   - exactly one file, directly in `public/startups/`, no renames;
   - the file name format and that the name isn't taken;
   - `hitex.existing_profile` is a startup listed by HITEX that has no other profile;
   - valid YAML that follows the template, with values from the lists;
   - you (the pull request author) are in `maintainers` (for edits: in the current `maintainers`).
3. Fix any ❌ and push again; the comment updates. A maintainer then reviews and merges.

To check your file before opening the pull request:

```bash
pnpm install
pnpm check:profiles
```

## Rules

- **Only startups listed by HITEX, one profile each.** To change a profile, edit its existing file.
- **Only submit a startup you represent**, and only list people who agreed to appear
  (founders, team members and hiring contacts). The `consent` section confirms this.
- **Keep hiring information current.** Positions are hidden automatically 90 days after
  `hiring.updated`; update the date when you review your openings.
- **No spam, no fake or paid "job offers".** Profiles that break this are removed.
- To remove your profile, open a pull request that deletes your file (as a maintainer), or ask us
  in the community group.

## License

- Profile text you submit is shared under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
  so others can reuse it with credit. You confirm you may publish your logo and text.
- The code of this project is under the [MIT License](LICENSE).
- Data in `public/data/` was collected from the public HITEX website and belongs to HITEX and the
  listed organizations. This project is not affiliated with HITEX.
