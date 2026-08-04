import { LandingNavbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  HeroSection,
  FeaturesSection,
  AISection,
  CitizenBenefitsSection,
  GovernmentBenefitsSection,
  StatsSection,
  HowItWorksSection,
  TimelineSection,
  DepartmentsSection,
  TestimonialsSection,
  FAQSection,
  ContactCTASection,
} from './sections'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-muted dark:bg-surface-dark">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AISection />
        <CitizenBenefitsSection />
        <GovernmentBenefitsSection />
        <StatsSection />
        <HowItWorksSection />
        <TimelineSection />
        <DepartmentsSection />
        <TestimonialsSection />
        <FAQSection />
        <ContactCTASection />
      </main>
      <Footer />
    </div>
  )
}
