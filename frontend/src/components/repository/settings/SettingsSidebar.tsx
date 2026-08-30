import type { SettingsTab } from "@/pages/RepositorySettingsPage"

interface SettingsTabItem {
  id: SettingsTab
  label: string
  description: string
  icon: React.ElementType
}

interface SettingsSidebarProps {
  tabs: SettingsTabItem[]
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

export default function SettingsSidebar({
  tabs,
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  return (
    <aside className="w-full shrink-0 border-b md:w-64 md:border-b-0 md:border-r">
      <nav className="space-y-1 p-3">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`
                flex w-full items-start gap-3 rounded-lg
                px-3 py-2.5 text-left transition-colors
                ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />

              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {tab.label}
                </span>

                <span className="mt-0.5 block text-xs opacity-70">
                  {tab.description}
                </span>
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}