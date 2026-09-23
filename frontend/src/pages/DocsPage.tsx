import { useEffect } from "react"
import DocsSidebar from "@/components/docs/DocsSidebar"
import DocsHero from "@/components/docs/DocsHero"
import IntroductionDocs from "@/components/docs/IntroductionDocs"
import RepositoryDocs from "@/components/docs/RepositoryDocs"
import CollaboratorDocs from "@/components/docs/CollaboratorDocs"
import TeamDocs from "@/components/docs/TeamDocs"
import PermissionDocs from "@/components/docs/PermissionDocs"
import IssueDocs from "@/components/docs/IssueDocs"

export default function DocsPage() {
  useEffect(() => {
    document.title = "Docs · FastRepo"
  }, [])

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl">
        <DocsSidebar />

        <main className="min-w-0 flex-1 px-5 py-10 sm:px-8 lg:px-12">
          <DocsHero />

          <div className="mt-12 space-y-20">
            <IntroductionDocs />
            <RepositoryDocs />
            <CollaboratorDocs />
            <TeamDocs />
            <PermissionDocs />
            <IssueDocs />
          </div>
        </main>
      </div>
    </div>
  )
}