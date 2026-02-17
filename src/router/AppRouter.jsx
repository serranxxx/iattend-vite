import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { InvitationsPage } from '../pages/Board/InvitationsPage'
import { LoginPage } from '../pages/LoginPage'
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



export const AppRouter = () => {


  return (
    <Routes>
      <Route path="/" element={<InvitationsPage />} />
      <Route path="/invitations" element={<InvitationsPage />} />
      <Route path="/dashboard" element={<DashboardPage />} /> 
      <Route path="/dashboard/build" element={<BuildPage />} /> 
      <Route path="/dashboard/guests" element={<GuestsPage />} />
      <Route path="/dashboard/side" element={<SideEvents />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/linktree" element={<LinkTree />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/*" element={<PageNotFound />} />
      <Route path="/dashboard/success" element={<Success />} />


      <Route path="/admin"
        element={
          <AdminHOC>
            <AdminPage />
          </AdminHOC>
        } />

    </Routes>
  )
}
