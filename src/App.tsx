import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Admin } from './pages/Admin'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminInquiriesList } from './pages/AdminInquiriesList'
import { AdminInquiryDetail } from './pages/AdminInquiryDetail'
import { AdminManagerEdit } from './pages/AdminManagerEdit'
import { AdminManagerRegister } from './pages/AdminManagerRegister'
import { AdminManagersList } from './pages/AdminManagersList'
import { AdminMenuSettings } from './pages/AdminMenuSettings'
import { AdminNoticeDetail } from './pages/AdminNoticeDetail'
import { AdminNoticeCreate } from './pages/AdminNoticeCreate'
import { AdminNotices } from './pages/AdminNotices'
import { AdminReviewDetail } from './pages/AdminReviewDetail'
import { AdminReviewCreate } from './pages/AdminReviewCreate'
import { AdminReviews } from './pages/AdminReviews'
import { AdminRecommendations } from './pages/AdminRecommendations'
import { AdminRecommendationCreate } from './pages/AdminRecommendationCreate'
import { AdminMemberDetail } from './pages/AdminMemberDetail'
import { AdminLandingKpi } from './pages/AdminLandingKpi'
import { AdminLandingMemberStats } from './pages/AdminLandingMemberStats'
import { AdminSettings } from './pages/AdminSettings'
import { AdminSiteHeaderNavSettings } from './pages/AdminSiteHeaderNavSettings'
import { NoticeDetail } from './pages/NoticeDetail'
import { Notices } from './pages/Notices'
import { ReviewDetail } from './pages/ReviewDetail'
import { Reviews } from './pages/Reviews'
import { InquiryDetail } from './pages/InquiryDetail'
import { InquiryList } from './pages/InquiryList'
import { InquiryNew } from './pages/InquiryNew'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { ManagerIntro } from './pages/ManagerIntro'
import { MemberEdit } from './pages/MemberEdit'
import { Signup } from './pages/Signup'
import { SignupComplete } from './pages/SignupComplete'
import { Consult } from './pages/Consult'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/me/edit" element={<MemberEdit />} />
        <Route path="/managers" element={<ManagerIntro />} />
        <Route path="/reviews/:id" element={<ReviewDetail />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/notices/:id" element={<NoticeDetail />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/inquiry/complete" element={<Navigate to="/inquiry" replace />} />
        <Route path="/inquiry/new" element={<InquiryNew />} />
        <Route path="/inquiry/:id" element={<InquiryDetail />} />
        <Route path="/inquiry" element={<InquiryList />} />
        <Route path="/consult" element={<Consult />} />
        <Route path="/join/complete" element={<SignupComplete />} />
        <Route path="/join" element={<Signup />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/managers/register" element={<AdminManagerRegister />} />
        <Route path="/admin/managers/:id/edit" element={<AdminManagerEdit />} />
        <Route path="/admin/managers" element={<AdminManagersList />} />
        <Route path="/admin/members/:id" element={<AdminMemberDetail />} />
        <Route path="/admin/inquiries/:id" element={<AdminInquiryDetail />} />
        <Route path="/admin/inquiries" element={<AdminInquiriesList />} />
        <Route path="/admin/notices/:id" element={<AdminNoticeDetail />} />
        <Route path="/admin/notices/new" element={<AdminNoticeCreate />} />
        <Route path="/admin/notices" element={<AdminNotices />} />
        <Route path="/admin/reviews/:id" element={<AdminReviewDetail />} />
        <Route path="/admin/reviews/new" element={<AdminReviewCreate />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/recommendations/new" element={<AdminRecommendationCreate />} />
        <Route path="/admin/recommendations" element={<AdminRecommendations />} />
        <Route path="/admin/landing-kpi" element={<AdminLandingKpi />} />
        <Route path="/admin/landing-member-stats" element={<AdminLandingMemberStats />} />
        <Route path="/admin/menu-settings" element={<AdminMenuSettings />} />
        <Route path="/admin/site-header-nav" element={<AdminSiteHeaderNavSettings />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
