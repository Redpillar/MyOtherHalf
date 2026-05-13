import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Admin } from './pages/Admin'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminInquiriesList } from './pages/AdminInquiriesList'
import { AdminInquiryDetail } from './pages/AdminInquiryDetail'
import { AdminManagerEdit } from './pages/AdminManagerEdit'
import { AdminManagerRegister } from './pages/AdminManagerRegister'
import { AdminManagersList } from './pages/AdminManagersList'
import { AdminMenuSettings } from './pages/AdminMenuSettings'
import { AdminRecommendations } from './pages/AdminRecommendations'
import { AdminMemberDetail } from './pages/AdminMemberDetail'
import { AdminSettings } from './pages/AdminSettings'
import { AdminSiteHeaderNavSettings } from './pages/AdminSiteHeaderNavSettings'
import { InquiryDetail } from './pages/InquiryDetail'
import { InquiryList } from './pages/InquiryList'
import { InquiryNew } from './pages/InquiryNew'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { ManagerIntro } from './pages/ManagerIntro'
import { MemberEdit } from './pages/MemberEdit'
import { Signup } from './pages/Signup'
import { SignupComplete } from './pages/SignupComplete'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/me/edit" element={<MemberEdit />} />
        <Route path="/managers" element={<ManagerIntro />} />
        <Route path="/inquiry/complete" element={<Navigate to="/inquiry" replace />} />
        <Route path="/inquiry/new" element={<InquiryNew />} />
        <Route path="/inquiry/:id" element={<InquiryDetail />} />
        <Route path="/inquiry" element={<InquiryList />} />
        <Route path="/join/complete" element={<SignupComplete />} />
        <Route path="/join" element={<Signup />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/managers/register" element={<AdminManagerRegister />} />
        <Route path="/admin/managers/:id/edit" element={<AdminManagerEdit />} />
        <Route path="/admin/managers" element={<AdminManagersList />} />
        <Route path="/admin/members/:id" element={<AdminMemberDetail />} />
        <Route path="/admin/inquiries/:id" element={<AdminInquiryDetail />} />
        <Route path="/admin/inquiries" element={<AdminInquiriesList />} />
        <Route path="/admin/recommendations" element={<AdminRecommendations />} />
        <Route path="/admin/menu-settings" element={<AdminMenuSettings />} />
        <Route path="/admin/site-header-nav" element={<AdminSiteHeaderNavSettings />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
