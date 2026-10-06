// The form's steps after "Startup": what a profile says, grouped like the profile page.
import { useState, type ReactNode } from "react"
import { InfoIcon } from "lucide-react"

import { Chips, Confirm, Grid, Group, NumberInput, Repeater, Select, TextArea, TextInput, TextList, YesNo, useForm } from "@/components/profile-form/fields"
import { uid } from "@/components/profile-form/draft"
import type { Profile } from "@/lib/profile-rules"

const en = (field: string) => `i18n.en.${field}`

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export function CompanyStep() {
  const { get } = useForm()
  return (
    <>
      <Group title="About" hint="In English. You can add Arabic, Kurdish and Persian in the Translations step.">
        <Grid>
          <TextInput path={en("name")} label="Name" required maxLength={80} />
          <TextInput path={en("tagline")} label="Tagline" required maxLength={90} placeholder="One line about what you do" />
        </Grid>
        <TextArea path={en("description")} label="Description" required maxLength={700} rows={5} hint="Two to four sentences: the problem, your product, who uses it." />
        <TextInput path={en("area_of_work")} label="Area of work" maxLength={120} placeholder="Payments for small shops in Kurdistan" />
        <TextArea path={en("aim")} label="Aim" maxLength={700} placeholder="Where you want to be in three years" />
      </Group>

      <Group title="Basics">
        <Grid>
          <TextInput
            path="website"
            label="Website"
            type="url"
            placeholder="https://example.com"
            hint="No website yet? Leave it empty: we link to your page here."
          />
          <LogoInput />
          <TextInput path="founded" label="Founded" required placeholder="2024 or 2024-03" hint="Year, or year and month." />
          <Select path="stage" label="Stage" required list="stages" />
          <Select path="industry" label="Industry" required list="industries" />
          {get("industry") === "other" && <TextInput path="industry_other" label="Which industry?" required maxLength={120} />}
          <Select path="business_model" label="Business model" list="business_models" />
          <Select path="team_size" label="Team size" required list="team_sizes" />
          <Select path="engineering_team_size" label="Engineering team size" list="engineering_team_sizes" />
          <Select path="work_mode" label="Work mode" required list="work_modes" />
          <Select path="work_week" label="Work week" list="work_weeks" />
        </Grid>
      </Group>

      <Group title="Location">
        <Grid>
          <Select path="location.city" label="City" required list="cities" />
          {get("location.city") === "other" && <TextInput path="location.city_other" label="Which city?" required maxLength={120} />}
          <TextInput path="location.country" label="Country" required maxLength={2} placeholder="IQ" hint="Two-letter code: IQ, TR, AE…" mono />
          <TextInput path="location.office_maps_url" label="Office on Google Maps" type="url" placeholder="https://maps.app.goo.gl/…" />
        </Grid>
        <Chips path="location.other_offices" label="Other offices" list="cities" />
        <YesNo path="location.wheelchair_accessible" label="Step-free (wheelchair) access to the office" />
      </Group>
    </>
  )
}

function LogoInput() {
  const { get } = useForm()
  const url = (get("logo_url") as string | undefined) ?? ""
  const [failed, setFailed] = useState<string | null>(null)
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <TextInput path="logo_url" label="Logo" required type="url" hint="https link to a square png, svg or webp, e.g. from your website." />
      </div>
      {url.startsWith("https://") && failed !== url && (
        <img src={url} alt="" onError={() => setFailed(url)} className="mt-6 size-12 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-foreground/10" />
      )}
    </div>
  )
}

export function ProductStep() {
  return (
    <>
      <Repeater<Profile>
        path="products"
        label="Products"
        hint="What you ship."
        max={10}
        addLabel="Add a product"
        newItem={() => ({ _uid: uid(), _texts: {} })}
        itemTitle={(x, i) => x._texts?.en || `Product ${i + 1}`}
      >
        {(at) => (
          <>
            <TextInput path={`${at}._texts.en`} label="Product, in one line" required maxLength={200} placeholder="Point-of-sale app for small shops" />
            <TextInput path={`${at}.url`} label="Link" type="url" />
            <Chips path={`${at}.platforms`} label="Platforms" list="platforms" />
          </>
        )}
      </Repeater>

      <Group title="Tech">
        <Chips path="tech_stack" label="Tech stack" list="technologies" open hint="Missing one? Type it and press Enter." />
        <Chips path="tools" label="Tools the team uses" list="tools" open />
      </Group>

      <Repeater<Profile>
        path="traction"
        label="Traction"
        hint="Numbers you're happy to share publicly, with the month they're from."
        max={6}
        addLabel="Add a number"
        newItem={() => ({})}
        itemTitle={(_, i) => `Number ${i + 1}`}
      >
        {(at) => (
          <Grid cols={3}>
            <Select path={`${at}.metric`} label="What" required list="traction_metrics" />
            <TextInput path={`${at}.value`} label="Value" required placeholder="5000" />
            <TextInput path={`${at}.as_of`} label="As of" required type="month" />
          </Grid>
        )}
      </Repeater>

      <Repeater<Profile>
        path="recognition"
        label="Recognition"
        hint="Awards, programs and press."
        max={10}
        addLabel="Add recognition"
        newItem={() => ({})}
        itemTitle={(x, i) => x.name || `Recognition ${i + 1}`}
      >
        {(at) => (
          <Grid cols={3}>
            <TextInput path={`${at}.name`} label="Name" required maxLength={120} placeholder="HITEX Startup Competition – finalist" />
            <NumberInput path={`${at}.year`} label="Year" min={1990} max={2100} />
            <TextInput path={`${at}.url`} label="Link" type="url" />
          </Grid>
        )}
      </Repeater>

      <Group title="Impact">
        <Chips path="impact.sdgs" label="UN Sustainable Development Goals you work on" list="sdgs" numeric />
        <TextArea path={en("impact")} label="Impact" maxLength={700} placeholder="The social or economic impact you aim for" />
      </Group>
    </>
  )
}

export function PeopleStep() {
  const { get } = useForm()
  const seeking = (get("seeking") as string[] | undefined) ?? []
  return (
    <>
      <Note>Only list people who agreed to appear on your profile.</Note>
      <Repeater<Profile>
        path="founders"
        label="Founders"
        hint="Names from HITEX are filled in; set each founder's role."
        min={1}
        max={8}
        addLabel="Add a founder"
        newItem={() => ({ role: "founder" })}
        itemTitle={(x, i) => x.name || `Founder ${i + 1}`}
      >
        {(at) => <PersonFields at={at} roles="founder_roles" />}
      </Repeater>

      <Repeater<Profile>
        path="core_team"
        label="Core team"
        hint="Key people besides the founders."
        max={12}
        addLabel="Add a person"
        newItem={() => ({})}
        itemTitle={(x, i) => x.name || `Person ${i + 1}`}
      >
        {(at) => <PersonFields at={at} roles="team_roles" />}
      </Repeater>

      <Group title="Looking for" hint="Besides hires, what would help you most?">
        <Chips path="seeking" label="We're looking for" list="seeking" />
        {seeking.includes("co_founder") && <Select path="co_founder_role" label="Co-founder role" required list="co_founder_roles" />}
        <TextArea path={en("seeking_note")} label="Tell them more" maxLength={700} placeholder="What kind of investors, partners or mentors you want, and why" />
      </Group>
    </>
  )
}

function PersonFields({ at, roles }: { at: string; roles: string }) {
  const { get } = useForm()
  return (
    <Grid cols={3}>
      <TextInput path={`${at}.name`} label="Name" required maxLength={80} hint="As written on LinkedIn." />
      <Select path={`${at}.role`} label="Role" required list={roles} />
      {get(`${at}.role`) === "other" && roles === "team_roles" && <TextInput path={`${at}.role_other`} label="Which role?" required maxLength={120} />}
      <TextInput path={`${at}.linkedin`} label="LinkedIn" type="url" placeholder="https://www.linkedin.com/in/…" />
    </Grid>
  )
}

export function HiringStep() {
  return (
    <>
      <Group title="Status" hint="Leave the status empty if you don't want a hiring section. Hiring info is dated today and hides after 90 days unless you update it.">
        <Grid>
          <Select path="hiring.status" label="Hiring status" list="hiring_status" empty="No hiring section" />
          <TextInput path="hiring.careers_page" label="Careers page" type="url" placeholder="https://example.com/careers" />
        </Grid>
        <TextArea path={en("looking_for")} label="Who you want on the team" maxLength={700} />
      </Group>

      <Repeater<Profile>
        path="hiring.contacts"
        label="Who candidates should talk to"
        max={5}
        addLabel="Add a contact"
        newItem={() => ({})}
        itemTitle={(x, i) => x.name || `Contact ${i + 1}`}
      >
        {(at) => (
          <Grid cols={3}>
            <TextInput path={`${at}.name`} label="Name" required maxLength={80} />
            <Select path={`${at}.role`} label="Role" required list="contact_roles" />
            <Select path={`${at}.preferred_contact`} label="Best way to reach them" list="preferred_contact" />
            <TextInput path={`${at}.linkedin`} label="LinkedIn" type="url" />
            <TextInput path={`${at}.email`} label="Email" type="email" hint="Shown publicly." />
          </Grid>
        )}
      </Repeater>

      <Group title="How you hire" hint="Helps candidates prepare.">
        <Chips path="hiring.process.steps" label="Steps, in order" list="process_steps" ordered hint="Click the steps in the order they happen." />
        <Grid>
          <NumberInput path="hiring.process.typical_duration_days" label="Days from application to offer" min={1} max={365} />
          <NumberInput path="hiring.process.reply_within_days" label="You answer every applicant within (days)" min={1} max={90} />
          <YesNo path="hiring.process.paid_take_home" label="Take-home tasks are paid" />
          <YesNo path="hiring.process.remote_interviews" label="Interviews can be by video call" />
        </Grid>
      </Group>

      <Group title="Who can apply">
        <Chips path="hiring.open_to.languages.work" label="Languages used at work" list="languages" />
        <Chips path="hiring.open_to.languages.required" label="Every candidate must speak" list="languages" />
        <Chips path="hiring.open_to.languages.welcome" label="A plus" list="languages" />
        <Chips path="hiring.open_to.languages.interview" label="You can interview in" list="languages" />
        <Grid>
          <Select path="hiring.open_to.languages.english_level" label="Minimum English (CEFR)" list="english_levels" />
        </Grid>
        <Grid>
          <YesNo path="hiring.open_to.fresh_graduates" label="Fresh graduates" />
          <YesNo path="hiring.open_to.internships" label="Internships" />
          <YesNo path="hiring.open_to.international_candidates" label="International candidates" hint="Without Iraqi residency or work permit." />
          <YesNo path="hiring.open_to.visa_support" label="Visa support" />
          <YesNo path="hiring.open_to.relocation_support" label="Relocation support" />
        </Grid>
      </Group>
    </>
  )
}

export function WorkingStep() {
  const { get } = useForm()
  return (
    <>
      <Group title="Culture">
        <TextArea path={en("culture")} label="How the team works" maxLength={700} placeholder="Values, rituals, what a normal week looks like" />
        <TextArea path={en("why_join")} label="Why join you" maxLength={700} placeholder="Three honest reasons someone should join you" />
      </Group>

      <Group title="Contract">
        <Grid cols={3}>
          <YesNo path="hiring.contract.written_contract" label="Every hire signs a written contract" />
          <YesNo path="hiring.contract.social_security" label="Staff are registered for social security" />
          <NumberInput path="hiring.contract.probation_months" label="Probation (months)" min={0} max={12} />
          <NumberInput path="hiring.contract.hours_per_week" label="Hours per week" min={1} max={80} />
          <Select path="hiring.contract.overtime" label="Overtime" list="overtime" />
          <Select path="hiring.contract.payment_method" label="Salary paid by" list="payment_methods" />
        </Grid>
      </Group>

      <Group title="Growth">
        <Grid>
          <YesNo path="hiring.growth.mentorship" label="New people get a mentor" />
          <YesNo path="hiring.growth.conference_support" label="You pay for events like HITEX" />
          <NumberInput path="hiring.growth.training_budget_usd_per_year" label="Training budget per person (USD a year)" min={0} />
          <Select path="hiring.growth.promotion_review" label="Promotion reviews" list="promotion_review" />
        </Grid>
      </Group>

      <Group title="Internships" hint={get("hiring.open_to.internships") === true ? undefined : 'Shown when "Internships" is Yes in the Hiring step.'}>
        {get("hiring.open_to.internships") === true && (
          <Grid>
            <YesNo path="hiring.internship.paid" label="Paid" />
            <NumberInput path="hiring.internship.duration_months" label="Length (months)" min={1} max={24} />
            <YesNo path="hiring.internship.certificate" label="Certificate at the end" />
            <YesNo path="hiring.internship.path_to_full_time" label="Good interns can be hired" />
          </Grid>
        )}
      </Group>

      <Group title="Benefits">
        <Chips path="hiring.benefits" label="Benefits" list="benefits" />
      </Group>
    </>
  )
}

export function PositionsStep() {
  const { get } = useForm()
  const status = get("hiring.status") as string | undefined
  return (
    <>
      {(!status || status === "not_hiring") && (
        <Note>Positions are shown only while your hiring status (in the Hiring step) is open or always open.</Note>
      )}
      <Repeater<Profile>
        path="hiring.positions"
        label="Open positions"
        max={20}
        addLabel="Add a position"
        newItem={() => ({ _uid: uid(), employment: "full_time", seniority: "mid", _texts: {} })}
        itemTitle={(x, i) => x._texts?.en?.title || `Position ${i + 1}`}
      >
        {(at) => <PositionFields at={at} />}
      </Repeater>
    </>
  )
}

function PositionFields({ at }: { at: string }) {
  const { get } = useForm()
  const salaryType = get(`${at}.salary.type`) as string | undefined
  const tx = `${at}._texts.en`
  return (
    <div className="flex flex-col gap-5">
      <Grid>
        <TextInput path={`${tx}.title`} label="Title" required maxLength={80} placeholder="Backend Developer" />
        <TextInput path={`${tx}.summary`} label="Summary" maxLength={300} placeholder="One or two lines about the role" />
      </Grid>
      <Grid cols={3}>
        <Select path={`${at}.employment`} label="Employment" required list="employment" />
        <Select path={`${at}.seniority`} label="Seniority" required list="seniority" />
        <Select path={`${at}.work_mode`} label="Work mode" list="work_modes" />
        <NumberInput path={`${at}.experience_years`} label="Years of experience (minimum)" min={0} max={40} />
        <Select path={`${at}.education`} label="Education" list="education" />
        <NumberInput path={`${at}.count`} label="People you hire" min={1} max={100} />
        <TextInput path={`${at}.start`} label="Start" placeholder="asap or 2026-11" />
        <TextInput path={`${at}.deadline`} label="Apply by" type="date" />
        <TextInput path={`${at}.apply_url`} label="Apply link" type="url" hint="Empty: your careers page." />
      </Grid>

      <div className="flex flex-col gap-4 rounded-lg bg-muted/50 p-3">
        <Grid cols={3}>
          <Select path={`${at}.salary.type`} label="Salary" list="salary_types" />
          {(salaryType === "range" || salaryType === "fixed") && (
            <>
              <Select path={`${at}.salary.currency`} label="Currency" required list="currencies" />
              <Select path={`${at}.salary.period`} label="Per" required list="salary_periods" />
              <NumberInput path={`${at}.salary.min`} label={salaryType === "range" ? "From" : "Amount"} required min={0} />
              {salaryType === "range" && <NumberInput path={`${at}.salary.max`} label="To" required min={0} />}
            </>
          )}
        </Grid>
      </div>

      <Chips path={`${at}.skills`} label="Skills" list="technologies" open />
      <Chips path={`${at}.soft_skills`} label="Soft skills" list="soft_skills" />
      <Chips path={`${at}.languages`} label="Languages needed" list="languages" />
      <div className="grid gap-4 lg:grid-cols-3">
        <TextList path={`${tx}.responsibilities`} label="Responsibilities" max={12} />
        <TextList path={`${tx}.requirements`} label="Requirements" max={12} />
        <TextList path={`${tx}.nice_to_have`} label="Nice to have" max={12} />
      </div>
    </div>
  )
}

const LINKS: [string, string][] = [
  ["linkedin", "LinkedIn"],
  ["instagram", "Instagram"],
  ["x", "X"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["github", "GitHub"],
  ["engineering_blog", "Engineering blog"],
]

export function MoreStep() {
  return (
    <>
      <Group title="Links">
        <Grid>
          {LINKS.map(([key, label]) => (
            <TextInput key={key} path={`links.${key}`} label={label} type="url" />
          ))}
        </Grid>
      </Group>

      <Group title="Media" hint="Links only; nothing is uploaded here.">
        <Grid cols={3}>
          <TextInput path="media.demo_video" label="Demo video" type="url" />
          <TextInput path="media.pitch_deck" label="Pitch deck (public PDF)" type="url" />
          <TextInput path="media.press_kit" label="Press kit" type="url" />
        </Grid>
        <TextList path="media.photos" label="Office or team photos" type="url" max={6} placeholder="https://…" addLabel="Add a photo" />
      </Group>

      {(["clients", "partners"] as const).map((kind) => (
        <Repeater<Profile>
          key={kind}
          path={kind}
          label={kind === "clients" ? "Clients" : "Partners"}
          hint="Only those who agreed to be named publicly."
          max={20}
          addLabel={kind === "clients" ? "Add a client" : "Add a partner"}
          newItem={() => ({})}
          itemTitle={(x, i) => x.name || `${kind === "clients" ? "Client" : "Partner"} ${i + 1}`}
        >
          {(at) => (
            <>
              <Grid>
                <TextInput path={`${at}.name`} label="Name" required maxLength={80} />
                <TextInput path={`${at}.url`} label="Link" type="url" />
              </Grid>
              <Confirm path={`${at}.public_permission`} label="They agreed to be named on this page" />
            </>
          )}
        </Repeater>
      ))}

      <Group title="Funding">
        <Grid cols={3}>
          <Select path="funding.raising" label="Raising now?" list="funding_raising" />
          <Select path="funding.amount" label="Amount (USD)" list="funding_amounts" />
          <Select path="funding.stage" label="Funding stage" list="funding_stages" />
        </Grid>
      </Group>
    </>
  )
}
