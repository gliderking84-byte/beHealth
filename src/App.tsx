import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Balance from '@/pages/Balance'
import Coach from '@/pages/Coach'
import { ScannerPage } from '@/pages/Scanner'
import AnalysisPage from '@/pages/Analysis'
import ProfilePage from '@/pages/Profile'
import SettingsPage from '@/pages/Settings'
import {
  MoodPage, TrendsPage,
  WishlistPage, RoadmapPage
} from '@/pages/OtherPages'
import RewardsPage from '@/pages/RewardsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/balance"   element={<Balance />} />
          <Route path="/mood"      element={<MoodPage />} />
          <Route path="/trends"    element={<TrendsPage />} />
          <Route path="/scanner"   element={<ScannerPage />} />
          <Route path="/wishlist"  element={<WishlistPage />} />
          <Route path="/rewards"   element={<RewardsPage />} />
          <Route path="/coach"     element={<Coach />} />
          <Route path="/analysis"  element={<AnalysisPage />} />
<Route path="/roadmap"   element={<RoadmapPage />} />
          <Route path="/profile"   element={<ProfilePage />} />
          <Route path="/settings"  element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
