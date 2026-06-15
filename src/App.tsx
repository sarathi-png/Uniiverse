import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./layouts/Navbar";
import MobileNav from "./layouts/MobileNav";
import Footer from "./layouts/Footer";
import Onboarding from "./components/Onboarding";
import ErrorBoundary from "./components/ErrorBoundary";
import Disclaimer from "./components/Disclaimer";
import { CardModalProvider } from "./components/CardModalProvider";

const Home = lazy(() => import("./pages/Home"));
const Browse = lazy(() => import("./pages/Browse"));
const Details = lazy(() => import("./pages/Details"));
const Watch = lazy(() => import("./pages/Watch"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Explore = lazy(() => import("./pages/Explore"));
const DMCAPage = lazy(() => import("./pages/DMCAPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const TamilDubbed = lazy(() => import("./pages/TamilDubbed"));
const DubmvWatch = lazy(() => import("./pages/DubmvWatch"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 1000 * 60 * 5 },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/browse/:type" element={<Page><Browse /></Page>} />
          <Route path="/title/:type/:id" element={<Page><Details /></Page>} />
          <Route path="/watch/:type/:id" element={<Page><Watch /></Page>} />
          <Route path="/search" element={<Page><SearchPage /></Page>} />
          <Route path="/watchlist" element={<Page><Watchlist /></Page>} />
          <Route path="/explore" element={<Page><Explore /></Page>} />
          <Route path="/browse/tamil-dubbed" element={<Page><TamilDubbed /></Page>} />
          <Route path="/watch/dubmv/:fileId" element={<Page><DubmvWatch /></Page>} />
          <Route path="/dmca" element={<Page><DMCAPage /></Page>} />
          <Route path="/privacy" element={<Page><PrivacyPage /></Page>} />
          <Route path="/terms" element={<Page><TermsPage /></Page>} />

        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <Disclaimer />
          <Onboarding />
          <CardModalProvider>
            <Navbar />
            <main className="min-h-screen pt-10">
              <AnimatedRoutes />
            </main>
            <Footer />
            <MobileNav />
          </CardModalProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
