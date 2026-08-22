import React from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Grid } from 'antd'
import { ChatContainer } from '../components/ChatContainer/ChatContainer'
import { DashboardRealtimeProvider } from '../context/DashboardRealtimeContext'
import { WhatsNewBanners } from '../components/WhatsNewBanners/WhatsNewBanners'

const DashboardChat = () => {
  const { pathname } = useLocation()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  if (!pathname.startsWith('/dashboard')) return null
  if (isMobile && pathname === '/dashboard/build') return null
  return <ChatContainer />
}

const DashboardLayout = () => (
  <DashboardRealtimeProvider>
    {/* Novedades: overlay visible en todas las rutas /dashboard/* hasta cerrarse */}
    <WhatsNewBanners />
    <Outlet />
  </DashboardRealtimeProvider>
)

import { InvitationsPage } from '../pages/Board/InvitationsPage'
import { PageNotFound } from '../pages/Extras/PageNotFound'
import { AdminHOC } from './AdminHOC'
import { RequireSalesOrAdmin } from './RequireSalesOrAdmin'
import { AdminPage } from '../pages/Admin/AdminPage'
import { TextureLabPage } from '../pages/Admin/TextureLabPage'
import { FontLabPage } from '../pages/Admin/FontLabPage'
import { FeaturesPage } from '../pages/FeatruesPage'
import { LegalPage } from '../pages/Extras/Legal/LegalPage'
import { LinkTree } from '../pages/Extras/LinkTree/LinkTree'
import { Success } from '../pages/Success/Success'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { PhotoWallPage } from '../pages/Dashboard/PhotoWallPage'
import { BuildPage } from '../modules/Invitation/Build/PageSections/BuildPage'
import GuestsPage from '../modules/GuestManagement/GuestsPage'
import GuestsImportPage from '../modules/GuestManagement/GuestsImportPage'
import { SideEvents } from '../modules/SideEvents/SideEvents'
import { Login } from '../components/Auth/Login'
import { ScannerPage } from '../pages/Scanner/ScannerPage'
import Lia from '../pages/Lia/Lia'
import { PreviewMoodPage } from '../pages/PreviewMood/PreviewMoodPage'
import { CheckoutPage } from '../pages/Checkout/CheckoutPage'
import { SalesApp } from '../modules/Sales/SalesApp'
import { ProspectosPage } from '../modules/Prospectos/ProspectosPage'



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
        <Route path="/dashboard/guests/import" element={<GuestsImportPage />} />
        <Route path="/dashboard/side" element={<SideEvents />} />
        <Route path="/dashboard/photowall" element={<PhotoWallPage />} />
        <Route path="/dashboard/success" element={<Success />} />
      </Route>

      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/linktree" element={<LinkTree />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/luma" element={<Lia />} />
      <Route path="/preview" element={<PreviewMoodPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/*" element={<PageNotFound />} />

      <Route path="/admin"
        element={
          <AdminHOC>
            <AdminPage />
          </AdminHOC>
        } />

      <Route path="/sales" element={<SalesApp />} />

      <Route path="/tablero"
        element={
          <RequireSalesOrAdmin>
            <ProspectosPage />
          </RequireSalesOrAdmin>
        } />

      <Route path="/admin/texture-lab"
        element={
          <AdminHOC>
            <TextureLabPage />
          </AdminHOC>
        } />

      <Route path="/admin/font-lab"
        element={
          <AdminHOC>
            <FontLabPage />
          </AdminHOC>
        } />

    </Routes>
    </>
  )
}
