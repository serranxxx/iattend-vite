import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ChatContainer } from '../components/ChatContainer/ChatContainer'

const DashboardChat = () => {
  const { pathname } = useLocation()
  if (!pathname.startsWith('/dashboard')) return null
  return <ChatContainer />
}
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
import Luma from '../pages/Luma/Luma'



export const AppRouter = () => {


  return (
    <>
    <DashboardChat />
    <Routes>
      <Route path="/" element={<InvitationsPage />} />
      <Route path="/scanner" element={<ScannerPage />} />
      <Route path="/invitations" element={<InvitationsPage />} />
      <Route path="/dashboard" element={<DashboardPage />} /> 
      <Route path="/dashboard/build" element={<BuildPage />} /> 
      <Route path="/dashboard/guests" element={<GuestsPage />} />
      <Route path="/dashboard/side" element={<SideEvents />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/linktree" element={<LinkTree />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/luma" element={<Luma />} />
      <Route path="/*" element={<PageNotFound />} />
      <Route path="/dashboard/success" element={<Success />} />


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
