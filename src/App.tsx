import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { ScrollToTop } from '@/components/common/ScrollToTop'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RequireAdmin } from '@/components/admin/RequireAdmin'
import { TenantProvider } from '@/contexts/TenantContext'
import { ToastProvider } from '@/components/admin/Toast'
import { ThemeEditor } from '@/pages/admin/settings/ThemeEditor'
import { PlatformSchools } from '@/pages/platform/PlatformSchools'
import { PlatformDashboard } from '@/pages/platform/PlatformDashboard'
import { PlatformSchoolCreate } from '@/pages/platform/PlatformSchoolCreate'
import { PlatformSchoolDetail } from '@/pages/platform/PlatformSchoolDetail'
import { PlatformDomains } from '@/pages/platform/PlatformDomains'
import { PlatformUsers } from '@/pages/platform/PlatformUsers'
import { PlatformLayout } from '@/layouts/PlatformLayout'
import { RequireSuperAdmin } from '@/components/admin/RequireSuperAdmin'
import { Home } from '@/pages/Home'
import { About } from '@/pages/About'
import { Principal } from '@/pages/Principal'
import { Administration } from '@/pages/Administration'
import { StaffDirectory } from '@/pages/StaffDirectory'
import { Academics } from '@/pages/Academics'
import { Departments, DepartmentDetail } from '@/pages/Departments'
import { Admissions } from '@/pages/Admissions'
import { Students } from '@/pages/Students'
import { Parents } from '@/pages/Parents'
import { News, NewsArticlePage } from '@/pages/News'
import { Events, EventDetail } from '@/pages/Events'
import { SchoolLife, Clubs, ClubDetail, Sports, SportDetail, Houses } from '@/pages/SchoolLife'
import { Gallery, GalleryAlbum } from '@/pages/Gallery'
import { Resources } from '@/pages/Resources'
import { Contact } from '@/pages/Contact'
import { NotFound } from '@/pages/NotFound'
import { AdminLogin } from '@/pages/admin/AdminLogin'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { NewsList } from '@/pages/admin/news/NewsList'
import { NewsEditor, NewsView } from '@/pages/admin/news/NewsEditor'
import { StaffList, StaffEditor, StaffView } from '@/pages/admin/staff/StaffPages'
import { AnnouncementEditor, AnnouncementList, DepartmentEditor, DepartmentList, EventEditor, EventList } from '@/pages/admin/content/CoreEditors'
import {
  AlbumEditor,
  AlbumList,
  BrandingEditor,
  ClubEditor,
  ClubList,
  ContactEditor,
  DocumentEditor,
  DocumentList,
  HomepageEditor,
  MediaLibraryPage,
  PrincipalEditor,
  ProgrammeEditor,
  ProgrammeList,
  SocialEditor,
  SportEditor,
  SportList,
  UsersEditor,
} from '@/pages/admin/more/MoreEditors'
import { ApprovalsHub, ApprovalReview, PrincipalApprovalsRedirect } from '@/pages/admin/approvals/ApprovalPages'
import { ActivityDetailPage, ActivityLogPage, PrincipalActivityRedirect, ResourceHistoryPage, UserActivityPage } from '@/pages/admin/activity/ActivityPages'
import { PlatformActivity } from '@/pages/platform/PlatformActivity'
import { PlatformSystem } from '@/pages/platform/PlatformSystem'
import { ErrorBoundary, RouteErrorPage } from '@/components/common/ErrorBoundary'

function RootLayout() {
  return (
    <TenantProvider>
      <ScrollToTop />
      <Outlet />
    </TenantProvider>
  )
}

function RedirectToEvents() {
  const location = useLocation()
  return <Navigate to={{ pathname: '/events', search: location.search }} replace />
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/about', element: <About /> },
          { path: '/about/principal', element: <Principal /> },
          { path: '/about/administration', element: <Administration /> },
          { path: '/about/staff', element: <StaffDirectory /> },
          { path: '/academics', element: <Academics /> },
          { path: '/academics/departments', element: <Departments /> },
          { path: '/academics/departments/:slug', element: <DepartmentDetail /> },
          { path: '/admissions', element: <Admissions /> },
          { path: '/students', element: <Students /> },
          { path: '/parents', element: <Parents /> },
          { path: '/news', element: <News /> },
          { path: '/news/:slug', element: <NewsArticlePage /> },
          { path: '/events', element: <Events /> },
          { path: '/calendar', element: <RedirectToEvents /> },
          { path: '/events/:slug', element: <EventDetail /> },
          { path: '/school-life', element: <SchoolLife /> },
          { path: '/school-life/clubs', element: <Clubs /> },
          { path: '/school-life/clubs/:slug', element: <ClubDetail /> },
          { path: '/school-life/sports', element: <Sports /> },
          { path: '/school-life/sports/:slug', element: <SportDetail /> },
          { path: '/school-life/houses', element: <Houses /> },
          { path: '/gallery', element: <Gallery /> },
          { path: '/gallery/:slug', element: <GalleryAlbum /> },
          { path: '/resources', element: <Resources /> },
          { path: '/contact', element: <Contact /> },
          { path: '*', element: <NotFound /> },
        ],
      },
      { path: '/admin/login', element: <AdminLogin /> },
      { path: '/principal/approvals', element: <PrincipalApprovalsRedirect /> },
      { path: '/principal/activity', element: <PrincipalActivityRedirect /> },
      {
        element: <RequireSuperAdmin />,
        children: [
          {
            path: '/platform',
            element: <PlatformLayout />,
            children: [
              { index: true, element: <PlatformDashboard /> },
              { path: 'schools', element: <PlatformSchools /> },
              { path: 'schools/new', element: <PlatformSchoolCreate /> },
              { path: 'schools/:id', element: <PlatformSchoolDetail /> },
              { path: 'domains', element: <PlatformDomains /> },
              { path: 'users', element: <PlatformUsers /> },
              { path: 'activity', element: <PlatformActivity /> },
              { path: 'system', element: <PlatformSystem /> },
            ],
          },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: 'approvals', element: <ApprovalsHub /> },
              { path: 'approvals/:id', element: <ApprovalReview /> },
              { path: 'changes', element: <ApprovalsHub /> },
              { path: 'changes/:id', element: <ApprovalReview /> },
              { path: 'activity', element: <ActivityLogPage /> },
              { path: 'activity/resource/:type/:id', element: <ResourceHistoryPage /> },
              { path: 'activity/user/:userId', element: <UserActivityPage /> },
              { path: 'activity/:id', element: <ActivityDetailPage /> },
              { path: 'homepage', element: <HomepageEditor /> },
              { path: 'announcements', element: <AnnouncementList /> },
              { path: 'announcements/new', element: <AnnouncementEditor /> },
              { path: 'announcements/:id', element: <AnnouncementEditor /> },
              { path: 'announcements/:id/edit', element: <AnnouncementEditor /> },
              { path: 'news', element: <NewsList /> },
              { path: 'news/new', element: <NewsEditor /> },
              { path: 'news/:id', element: <NewsView /> },
              { path: 'news/:id/edit', element: <NewsEditor /> },
              { path: 'events', element: <EventList /> },
              { path: 'events/new', element: <EventEditor /> },
              { path: 'events/:id', element: <EventEditor /> },
              { path: 'events/:id/edit', element: <EventEditor /> },
              { path: 'gallery', element: <AlbumList /> },
              { path: 'gallery/new', element: <AlbumEditor /> },
              { path: 'gallery/:id/edit', element: <AlbumEditor /> },
              { path: 'documents', element: <DocumentList /> },
              { path: 'documents/new', element: <DocumentEditor /> },
              { path: 'documents/:id/edit', element: <DocumentEditor /> },
              { path: 'media', element: <MediaLibraryPage /> },
              { path: 'staff', element: <StaffList /> },
              { path: 'staff/new', element: <StaffEditor /> },
              { path: 'staff/:id', element: <StaffView /> },
              { path: 'staff/:id/edit', element: <StaffEditor /> },
              { path: 'departments', element: <DepartmentList /> },
              { path: 'departments/new', element: <DepartmentEditor /> },
              { path: 'departments/:id', element: <DepartmentEditor /> },
              { path: 'departments/:id/edit', element: <DepartmentEditor /> },
              { path: 'academics', element: <ProgrammeList /> },
              { path: 'academics/new', element: <ProgrammeEditor /> },
              { path: 'academics/:id/edit', element: <ProgrammeEditor /> },
              { path: 'clubs', element: <ClubList /> },
              { path: 'clubs/new', element: <ClubEditor /> },
              { path: 'clubs/:id/edit', element: <ClubEditor /> },
              { path: 'sports', element: <SportList /> },
              { path: 'sports/new', element: <SportEditor /> },
              { path: 'sports/:id/edit', element: <SportEditor /> },
              { path: 'principal', element: <PrincipalEditor /> },
              { path: 'settings/contact', element: <ContactEditor /> },
              { path: 'settings/social', element: <SocialEditor /> },
              { path: 'settings/branding', element: <BrandingEditor /> },
              { path: 'settings/theme', element: <ThemeEditor /> },
              { path: 'settings/users', element: <UsersEditor /> },
            ],
          },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  )
}
