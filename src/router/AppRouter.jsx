import React from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Grid } from 'antd'
import { ChatContainer } from '../components/ChatContainer/ChatContainer'
import { DashboardRealtimeProvider } from '../context/DashboardRealtimeContext'

const DashboardChat = () => {
  const { pathname } = useLocation()
  const screens = Grid.useBreakpoint()
  if (!pathname.startsWith('/dashboard')) return null
  if (screens.xs) return null
  return <ChatContainer />
}

const DashboardLayout = () => (
  <DashboardRealtimeProvider>
    <Outlet />
  </DashboardRealtimeProvider>
)

import { InvitationsPage } from '../pages/Board/InvitationsPage'
import { PageNotFound } from '../pages/Extras/PageNotFound'
import { AdminHOC } from './AdminHOC'
import { AdminPage } from '../pages/Admin/AdminPage'
import { FeaturesPage } from '../pages/FeatruesPage'
import { LegalPage } from '../pages/Extras/Legal/LegalPage'
import { LinkTree } from '../pages/Extras/LinkTree/LinkTree'
import { Success } from '../pages/Success/Success'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { BuildPage } from '../modules/Invitation/Build/PageSections/BuildPage'
import GuestsPage from '../modules/GuestManagement/GuestsPage'
import { SideEvents } from '../modules/SideEvents/SideEvents'
import { Login } from '../components/Auth/Login'
import { ScannerPage } from '../pages/Scanner/ScannerPage'
import Lia from '../pages/Lia/Lia'
import { PreviewMoodPage } from '../pages/PreviewMood/PreviewMoodPage'



export const AppRouter = () => {


  return (
    <>
    <DashboardChat />
    <Routes>
      <Route path="/" element={<InvitationsPage />} />
      <Route path="/scanner" element={<ScannerPage />} />
      <Route path="/invitations" element={<InvitationsPage />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/build" element={<BuildPage />} />
        <Route path="/dashboard/guests" element={<GuestsPage />} />
        <Route path="/dashboard/side" element={<SideEvents />} />
        <Route path="/dashboard/success" element={<Success />} />
      </Route>

      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/linktree" element={<LinkTree />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/luma" element={<Lia />} />
      <Route path="/preview-mood" element={<PreviewMoodPage />} />
      <Route path="/*" element={<PageNotFound />} />

      <Route path="/admin"
        element={
          <AdminHOC>
            <AdminPage />
          </AdminHOC>
        } />

    </Routes>
    </>
  )
}
