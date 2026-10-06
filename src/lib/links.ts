export const HITEX_URL = "https://hitex.tech/en"
export const HITEX_PASS_URL = "https://www.hitex.tech/en/getyourpass"
export const AUTHOR_NAME = "Rahmat Waisi"
export const AUTHOR_LINKEDIN_URL = "https://www.linkedin.com/in/rahmatwaisi/"
export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/rahmatwaisi"
export const GITHUB_URL = "https://github.com/rahmatwaisi/hitex-explorer"
export const TELEGRAM_URL = "https://t.me/hitexexplorer"
export const WHATSAPP_URL = "https://chat.whatsapp.com/FCRSivJGG7f3Vr2zISd2qG"
export const CONTRIBUTING_URL = `${GITHUB_URL}/blob/main/CONTRIBUTING.md`
export const TEMPLATE_URL = `${GITHUB_URL}/blob/main/templates/startup-profile.yml`
export const SITE_URL = "https://hitex2026.netlify.app"
/** the repository owner; looks after profiles of startups without a GitHub account */
export const PROJECT_MAINTAINER = "rahmatwaisi"
/** a startup's page on this site; also its website when it has none of its own */
export const profileUrl = (slug: string) => `${SITE_URL}/#/startups/${slug}`
export const isOnThisSite = (url: string | null | undefined) => !!url && url.startsWith(SITE_URL)
