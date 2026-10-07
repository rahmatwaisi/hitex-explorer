# Complete your profile on HITEX Explorer

Startups and sponsors listed by HITEX can complete their profile on HITEX Explorer. You add or update it with
a pull request that contains **exactly one file**.

- **Startups**: team, products, open positions, how to apply and what they're looking for.
  Files go in `public/startups/`, from [`templates/startup-profile.yml`](templates/startup-profile.yml).
- **Sponsors**: what they offer startups, the partners they want, their leadership, booth activities and
  open positions. Files go in `public/sponsors/`, from [`templates/sponsor-profile.yml`](templates/sponsor-profile.yml).
  See [Sponsors](#sponsors) below.

This guide uses startups as the example; sponsors follow the same steps with their own folder, template and form.

> **Strict rule:** only startups already in HITEX's list
> ([`public/data/startups_list.json`](public/data/startups_list.json)) can have a profile, and only one each.
> New startups that are not in that list are not accepted. The same holds for sponsors and
> [`public/data/sponsors.json`](public/data/sponsors.json).

## The easy way: the form

Open the [profile form](https://hitex2026.netlify.app/contribution/form), pick your startup and answer the
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

1. Find your startup on the [Contribution page](https://hitex2026.netlify.app/contribution). It gives you
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
   - exactly one file, directly in `public/startups/` or `public/sponsors/`, no renames;
   - the file name format and that the name isn't taken;
   - `hitex.existing_profile` is a startup (or sponsor) listed by HITEX that has no other profile;
   - valid YAML that follows the template, with values from the lists;
   - you (the pull request author) are in `maintainers` (for edits: in the current `maintainers`).
3. Fix any ❌ and push again; the comment updates. A maintainer then reviews and merges.

To check your file before opening the pull request:

```bash
pnpm install
pnpm check:profiles
```

## Sponsors

Sponsors listed by HITEX use the [sponsor profile form](https://hitex2026.netlify.app/contribution/sponsor/form)
or write `public/sponsors/yyyymmdd_hhmmss_your_company.yml` from
[`templates/sponsor-profile.yml`](templates/sponsor-profile.yml). The
[sponsor Contribution page](https://hitex2026.netlify.app/contribution/sponsor) gives you your id, a file name
and the first lines of your file. Everything above applies, with these differences:

- `hitex.existing_profile` is your id in [`public/data/sponsors.json`](public/data/sponsors.json).
- Your tier and HITEX years come from HITEX's list; you don't write them in the file.
- Instead of founders, stage and funding, a sponsor profile has `company_size`, `leadership` (optional) and
  `for_startups`: what you offer startups (`offers`), the partners you want (`seeking`), a program link
  (`apply_url`) and who startups should talk to (`contact`). Their texts go in `i18n` as `offer_note` and
  `partnership_note`.
- Open positions use the same `hiring` section as startups and appear on the Jobs page.

Your page is `https://hitex2026.netlify.app/sponsors/your_company/`.

## Rules

- **Only startups and sponsors listed by HITEX, one profile each.** To change a profile, edit its existing file.
- **Only submit a startup or sponsor you represent**, and only list people who agreed to appear
  (founders, team members, leadership, partnership and hiring contacts). The `consent` section confirms this.
- **Keep hiring information current.** Positions are hidden automatically 90 days after
  `hiring.updated`; update the date when you review your openings.
- **No spam, no fake or paid "job offers".** Profiles that break this are removed.
- To remove your profile, open a pull request that deletes your file (as a maintainer), or ask us
  in the community group.

## License

- Profile text you submit is shared under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
  so others can reuse it with credit. You confirm you may publish your logo and text.
- The code of this project is not open source: it is public to read, and all rights are reserved
  (see [LICENSE](LICENSE)). Submitting a profile doesn't change that; you keep the rights to your own text.
- Data in `public/data/` was collected from the public HITEX website and belongs to HITEX and the
  listed organizations. This project is not affiliated with HITEX.
