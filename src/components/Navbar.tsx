import { SidebarTrigger } from "@/components/ui/sidebar"
import Logo from "@/assets/img/logo-circle.png"

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex lg:hidden md:hidden border-b border-border bg-sidebar h-14 items-center px-6 justify-between">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 mr-2" />
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
          <img src={Logo} alt="" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <h1 className="truncate font-semibold text-xl">CRyptonite</h1>
        </div>
      </div>
    </nav>
  )
}
