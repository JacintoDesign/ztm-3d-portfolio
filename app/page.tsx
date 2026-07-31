import WorldMount from '@/components/world/WorldMount'
import { loadAbout, loadContact, loadProjects } from '@/lib/content'

/**
 * Stays a Server Component so `metadata` in layout.tsx keeps working. The `ssr: false`
 * flag the Canvas needs cannot live here — see WorldMount.
 *
 * §2.1 — it is also where `CONTENT.md` is read. Parsing on the server and passing a plain
 * array down means no markdown and no parser ships to the browser, and §17's *a project
 * added to `CONTENT.md` appears with no component edited* holds by construction: the only
 * thing any component knows is that it is handed some projects.
 */

/** Static: the content is a file in the repo, so the read belongs to the build. */
export const dynamic = 'force-static'

/**
 * All three payloads, read on the server and passed down as plain props.
 *
 * §17's *adding a project changes the world with no component edited* now covers §2.2's
 * stats and §2.3's channels too: every count in the world below this line — projects,
 * stats, story panels, mailboxes — is the length of an array that came out of `CONTENT.md`.
 */
export default async function Page() {
  const [projects, about, contact] = await Promise.all([
    loadProjects(),
    loadAbout(),
    loadContact(),
  ])
  return <WorldMount projects={projects} about={about} contact={contact} />
}
