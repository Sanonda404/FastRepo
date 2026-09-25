import { useAuth } from "@/lib/auth/use-auth"
import DocsSection from "./DocsSection"

export default function RepositoryDocs() {
  const auth = useAuth();
  return (
    <DocsSection
      id="repositories"
      title="Creating repositories"
      description="Create a repository and connect it with your local project."
    >
      <div className="space-y-8">
        <Step
          number="1"
          title="Create a repository"
        >
          Go to the repository creation page and enter your repository
          name, description, visibility, and default branch. If you want to push
          your existing repository you may not want to create a default branch(as you already
          have one and it will also create an empty commit)
        </Step>

        <Step
          number="2"
          title="Open your project"
        >
          Open the project folder you want to push.
        </Step>

        <Step
          number="4"
          title="Connect the remote repository"
        >
         <CodeBlock>
{`git clone http://${auth?.username ?? "username"}:YOUR_PASSWORD@localhost:8000/ownerName/repoName
cd repoName
git config user.name "${auth?.username ?? "username"}"`}
        </CodeBlock>
        </Step>

        <div className="rounded-xl bg-green-600/5 p-4 text-sm text-muted-foreground">
          You can also clone a created empty repository and start working from there.
          The clone url is also shown under the about section.
        </div>
      </div>
    </DocsSection>
  )
}

function Step({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-semibold text-white">
        {number}
      </div>

      <div className="min-w-0">
        <h3 className="font-semibold">
          {title}
        </h3>

        <div className="mt-2 text-sm leading-6 text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  )
}

function CodeBlock({
  children,
}: {
  children: string
}) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-4 text-xs text-foreground">
      <code>{children}</code>
    </pre>
  )
}
