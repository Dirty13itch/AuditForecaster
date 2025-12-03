import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/marketing/navbar"
import { Footer } from "@/components/marketing/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, Calendar, Shield, Zap, Users, Smartphone } from "lucide-react"

export const metadata: Metadata = {
  title: "AuditForecaster | The Future of Energy Auditing",
  description: "Enterprise-grade platform for energy raters. Manage fleets, schedule jobs, and analyze performance with AI-driven insights.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://auditforecaster.com",
    title: "AuditForecaster | The Future of Energy Auditing",
    description: "Enterprise-grade platform for energy raters.",
    siteName: "AuditForecaster",
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400 backdrop-blur-xl">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                v1.0 Now Available
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                The Future of <br />
                Energy Auditing
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Streamline your operations with the most advanced platform for energy raters.
                From fleet management to predictive analytics, we've got you covered.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/login">
                  <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 h-12 px-8 text-lg">
                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button size="lg" variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white h-12 px-8 text-lg">
                    View Features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-black/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to scale</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Built by raters, for raters. Our comprehensive suite of tools helps you manage every aspect of your business.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Calendar className="h-8 w-8 text-emerald-400" />}
                title="Smart Scheduling"
                description="Drag-and-drop calendar with conflict detection and route optimization for your inspectors."
              />
              <FeatureCard
                icon={<BarChart3 className="h-8 w-8 text-blue-400" />}
                title="Predictive Analytics"
                description="AI-powered insights to forecast revenue, track inspector performance, and identify bottlenecks."
              />
              <FeatureCard
                icon={<Smartphone className="h-8 w-8 text-purple-400" />}
                title="Mobile Field App"
                description="Offline-capable PWA for inspectors to capture data, photos, and signatures on site."
              />
              <FeatureCard
                icon={<Users className="h-8 w-8 text-orange-400" />}
                title="Team Management"
                description="Manage inspectors, builders, and subcontractors with granular role-based access control."
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-yellow-400" />}
                title="Automated Reporting"
                description="Generate professional PDF reports and invoices instantly. Send them to clients with one click."
              />
              <FeatureCard
                icon={<Shield className="h-8 w-8 text-red-400" />}
                title="Enterprise Security"
                description="Bank-grade encryption, audit logs, and secure API access for your peace of mind."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-900/10" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to transform your business?</h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Join the leading energy rating companies who trust AuditForecaster to power their operations.
            </p>
            <Link href="/login">
              <Button size="lg" className="bg-white text-black hover:bg-gray-200 h-12 px-8 text-lg font-semibold">
                Get Started Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
      <div className="mb-4 p-3 rounded-lg bg-white/5 w-fit">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-gray-400 leading-relaxed">
        {description}
      </p>
    </div>
  )
}
