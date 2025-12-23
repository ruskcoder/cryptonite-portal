"use client"

import * as React from "react"
import {
  LayoutDashboard,
  MessageSquare,
  Clock,
  Trophy,
  Users,
  Book as LogBook,
  Calendar,
  Monitor,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavAdmin } from "@/components/nav-admin"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useUserProfileStore } from "../store/userProfileStore"
import Logo from "@/assets/img/logo-circle.png"

const userNavData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Discord",
      url: "/discord",
      icon: MessageSquare,
    },
  ],
}

const adminNavData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Discord",
      url: "/discord",
      icon: MessageSquare,
    },
    {
      title: "Leaderboard",
      url: "/leaderboard",
      icon: Trophy,
    },
  ],
  adminSection: [
    {
      title: "Desktop Mode",
      url: "/admin/desktop-mode",
      icon: Monitor,
    },
    {
      title: "User Details",
      url: "/admin/user-details",
      icon: Users,
    },
    {
      title: "Hours Log",
      url: "/admin/hours-log",
      icon: LogBook,
    },
    {
      title: "Event Types",
      url: "/admin/event-types",
      icon: Calendar,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const profile = useUserProfileStore((state) => state.profile) || undefined
  const isAdmin = profile?.role === 'admin'

  const userProfile = {
    name: profile?.fullName || "User",
    email: profile?.email || "user@example.com",
    avatar: "/avatars/shadcn.jpg",
  }

  const handleDesktopModeClick = () => {
    window.open(
      '/admin/desktop-mode',
      'DesktopMode',
      'width=800,height=700,toolbar=no,location=no,status=no,menubar=no'
    )
  }

  // Add onClick handler to Desktop Mode item
  const adminNavDataWithHandlers = isAdmin
    ? {
        ...adminNavData,
        adminSection: adminNavData.adminSection.map((item) =>
          item.title === 'Desktop Mode'
            ? { ...item, onClick: handleDesktopModeClick }
            : item
        ),
      }
    : adminNavData

  const navData = isAdmin ? adminNavDataWithHandlers : userNavData

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-14">
        <div className="flex items-center gap-2 h-full justify-center">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
            <img src={Logo} alt="" />
          </div>
          <div className="grid text-left text-sm leading-tight">
            <h1 className="truncate font-semibold text-xl">CRyptonite 624</h1>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div>
          <NavMain items={navData.navMain} />
        </div>
        {isAdmin && navData.adminSection && (
          <NavAdmin items={navData.adminSection} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userProfile} />
      </SidebarFooter>
      {/* <SidebarRail /> */}
    </Sidebar>
  )
}
