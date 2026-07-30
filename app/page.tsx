import WorldMount from '@/components/world/WorldMount'
import { loadProjects } from '@/lib/content'

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

export default async function Page() {
  const projects = await loadProjects()
  return <WorldMount projects={projects} />
}
