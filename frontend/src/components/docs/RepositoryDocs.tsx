import DocsSection from "./DocsSection"

export default function RepositoryDocs() {
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
          name, description, visibility, and default branch.
        </Step>

        <Step
          number="2"
          title="Open your project in VS Code"
        >
          Open the project folder you want to connect to your repository.
        </Step>

        <Step
          number="3"
          title="Initialize Git"
        >
          <CodeBlock>
{`git init
git add .
git commit -m "Initial commit"`}
          </CodeBlock>
        </Step>

        <Step
          number="4"
          title="Connect the remote repository"
        >
          <CodeBlock>
{`git remote add origin <repository-url>
git branch -M main
git push -u origin main`}
          </CodeBlock>
        </Step>

        <div className="rounded-lg bg-green-600/5 p-4 text-sm text-muted-foreground">
          You can replace these commands later with the exact FastRepo
          repository connection instructions.
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
    <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
      <code>{children}</code>
    </pre>
  )
}