import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"

import Footer from "@/components/footer"
import RepositoryForm from "@/components/repository/repository-form"

import { newRepositorySchema } from "@/lib/schemas/repository"
import { getErrorMessage } from "@/lib/apis/api"
import { createRepository } from "@/lib/apis/repository_apis"

type RepositoryFormInput = z.input<typeof newRepositorySchema>
type RepositoryFormOutput = z.output<typeof newRepositorySchema>

export default function RepositoryCreatePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<RepositoryFormInput, unknown, RepositoryFormOutput>({
    resolver: zodResolver(newRepositorySchema),
    defaultValues: {
      name: "",
      description: "",
      is_private: false,
      default_branch: "main",
    },
  })

  const onSubmit = async (values: RepositoryFormOutput) => {
    setLoading(true)
    setErrorMessage(null)

    try {
      await createRepository(values)
      navigate("/")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:py-10">
          <RepositoryForm
            form={form}
            loading={loading}
            errorMessage={errorMessage}
            onSubmit={onSubmit}
            onCancel={() => navigate(-1)}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}