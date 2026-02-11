import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { InvitationsPage } from '../pages/Board/InvitationsPage'
import { LoginPage } from '../pages/LoginPage'
import { PageNotFound } from '../pages/Extras/PageNotFound'
import { AdminHOC } from './AdminHOC'
import { Dashboard } from '../pages/Dashboard/Dashboard'
import { AdminPage } from '../pages/Admin/AdminPage'
import { FeaturesPage } from '../pages/FeatruesPage'
import { LegalPage } from '../pages/Extras/Legal/LegalPage'
import { LinkTree } from '../pages/Extras/LinkTree/LinkTree'



export const AppRouter = () => {


  return (
    <Routes>
      <Route path="/" element={<InvitationsPage />} />
      <Route path="/invitations" element={<InvitationsPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/linktree" element={<LinkTree />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/*" element={<PageNotFound />} />


      <Route path="/admin"
        element={
          <AdminHOC>
            <AdminPage />
          </AdminHOC>
        } />

    </Routes>
  )
}
